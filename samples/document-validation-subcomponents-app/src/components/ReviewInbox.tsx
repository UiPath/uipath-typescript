import type { SaveValidatedDataResult } from '@uipath/ui-widgets-validation-station';
import { OrchestratorDuModule } from '@uipath/uipath-typescript/orchestrator-du-module';
import type { TaskGetResponse } from '@uipath/uipath-typescript/tasks';
import { Tasks, TaskStatus, TaskType } from '@uipath/uipath-typescript/tasks';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import CenteredMessage from './CenteredMessage';
import ReviewWorkspace from './ReviewWorkspace';
import TaskList from './TaskList';

interface Notification {
  message: string;
  severity: 'success' | 'error';
}

function buildFilter(): string {
  return (
    `Type eq '${TaskType.DocumentValidation}' and IsDeleted eq false ` +
    `and (Status eq '${TaskStatus.Pending}' or Status eq '${TaskStatus.Unassigned}')`
  );
}

/**
 * Owns the review workflow: lists pending document validation tasks, hydrates
 * the selected one with its full ContentValidationData payload, and wires the
 * Submit / Save-as-draft / Report-exception outcomes emitted by the workspace's
 * fields form back to the SDK. The workspace itself is pure composition —
 * this component is the only place that talks to the API.
 *
 * The two effects only touch state *after* their `await` (guarded by an
 * `ignore` flag), and every synchronous state change lives in an event handler,
 * so neither effect mutates state synchronously as it runs.
 */
function ReviewInbox() {
  const { sdk } = useAuth();
  const tasks = useMemo(() => new Tasks(sdk), [sdk]);

  const [taskList, setTaskList] = useState<TaskGetResponse[]>([]);
  const [reloadToken, setReloadToken] = useState(0);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<number | undefined>(undefined);
  const [selectedTask, setSelectedTask] = useState<TaskGetResponse | null>(null);
  const [isLoadingTask, setIsLoadingTask] = useState(false);

  const [notification, setNotification] = useState<Notification | null>(null);
  const notify = useCallback(
    (message: string, severity: Notification['severity']) =>
      setNotification({ message, severity }),
    [],
  );

  // Load the pending / unassigned task list on mount and on each reload request.
  useEffect(() => {
    let ignore = false;
    void (async () => {
      try {
        const result = await tasks.getAll({
          filter: buildFilter(),
          orderby: 'Priority desc,CreationTime asc',
          pageSize: 30,
        });
        if (ignore) return;
        setTaskList(result.items);
        setListError(null);
      } catch (err) {
        console.error('Failed to load tasks', err);
        if (!ignore) {
          setListError(err instanceof Error ? err.message : 'Failed to load tasks');
        }
      } finally {
        if (!ignore) setIsLoadingList(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [tasks, reloadToken]);

  // Hydrate the selected task with its full ContentValidationData payload. The
  // folderId is captured at selection time (see selectTask), so this depends
  // only on the picked id and never re-runs on a background list refresh.
  useEffect(() => {
    if (selectedId === null) return;
    let ignore = false;
    void (async () => {
      try {
        const full = await tasks.getById(
          selectedId,
          { taskType: TaskType.DocumentValidation },
          selectedFolderId,
        );
        if (!ignore) setSelectedTask(full);
      } catch (err) {
        console.error('Failed to load task', err);
        if (!ignore) notify('Failed to load task', 'error');
      } finally {
        if (!ignore) setIsLoadingTask(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [selectedId, selectedFolderId, tasks, notify]);

  const selectTask = useCallback(
    (id: number) => {
      const task = taskList.find((t) => t.id === id);
      setSelectedId(id);
      setSelectedFolderId(task?.folderId);
      setSelectedTask(null);
      setIsLoadingTask(true);
    },
    [taskList],
  );

  const clearSelection = useCallback(() => {
    setSelectedId(null);
    setSelectedFolderId(undefined);
    setSelectedTask(null);
    setIsLoadingTask(false);
  }, []);

  const refresh = useCallback(() => {
    setIsLoadingList(true);
    setReloadToken((n) => n + 1);
  }, []);

  // Submit: the fields form has already run ProcessExtractedData and uploaded
  // the validated result to the bucket. On success we complete the task; the
  // validated data lives in the bucket, so no payload is sent here.
  const handleSubmitComplete = useCallback(
    async (result: SaveValidatedDataResult) => {
      if (!result.success) {
        notify('Submit failed', 'error');
        return;
      }
      if (!selectedTask) return;
      try {
        await selectedTask.complete({
          type: TaskType.DocumentValidation,
          action: 'Completed',
        });
        clearSelection();
        refresh();
        notify('Document submitted and task completed', 'success');
      } catch (err) {
        console.error('Failed to complete task', err);
        notify('Failed to complete task', 'error');
      }
    },
    [selectedTask, clearSelection, refresh, notify],
  );

  // Save-as-draft: the form already uploaded the in-progress data to the bucket.
  // Nothing to complete — leave the task open and surface success/failure.
  const handleSaveAsDraftComplete = useCallback(
    (result: SaveValidatedDataResult) => {
      notify(
        result.success ? 'Draft saved' : 'Failed to save draft',
        result.success ? 'success' : 'error',
      );
    },
    [notify],
  );

  // Report exception: the form does not call any API for this flow — the host
  // owns persistence. Forward the documentId + reason to the SDK.
  const handleReportException = useCallback(
    async (documentId: string, reason: string) => {
      if (!selectedTask) return;
      try {
        const response = await new OrchestratorDuModule(sdk).submitExceptionReport(
          selectedTask.id,
          documentId,
          reason || 'Reported via Document Review Workspace',
          { folderId: selectedTask.folderId },
        );
        if (!response.IsSuccessful) {
          console.error('submitExceptionReport failed:', response.ErrorMessage);
          notify('Failed to report exception', 'error');
          return;
        }
        clearSelection();
        refresh();
        notify('Exception reported', 'success');
      } catch (err) {
        console.error('submitExceptionReport threw:', err);
        notify('Failed to report exception', 'error');
      }
    },
    [sdk, selectedTask, clearSelection, refresh, notify],
  );

  return (
    <div className="h-full flex relative">
      <aside className="w-80 shrink-0 border-r bg-white flex flex-col">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-gray-900">Tasks</div>
            <div className="text-xs text-gray-500">
              {isLoadingList ? 'Loading…' : `${taskList.length} pending / unassigned`}
            </div>
          </div>
          <button
            type="button"
            onClick={refresh}
            disabled={isLoadingList}
            className="text-xs text-blue-600 hover:text-blue-800 disabled:text-gray-400"
          >
            Refresh
          </button>
        </div>
        <TaskList
          tasks={taskList}
          selectedId={selectedId}
          isLoading={isLoadingList}
          error={listError}
          emptyMessage="No pending document validation tasks."
          onSelect={selectTask}
        />
      </aside>

      <section className="flex-1 min-w-0 bg-gray-50">
        {selectedId === null ? (
          <CenteredMessage text="Select a document validation task to open the review workspace." />
        ) : isLoadingTask || !selectedTask ? (
          <CenteredMessage text="Loading task…" />
        ) : (
          <ReviewWorkspace
            key={selectedTask.id}
            sdk={sdk}
            task={selectedTask}
            onSubmitComplete={handleSubmitComplete}
            onSaveAsDraftComplete={handleSaveAsDraftComplete}
            onReportException={handleReportException}
          />
        )}
      </section>

      {notification && (
        <div
          role="status"
          className={`absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded shadow-lg text-sm text-white cursor-pointer ${
            notification.severity === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}
          onClick={() => setNotification(null)}
        >
          {notification.message}
        </div>
      )}
    </div>
  );
}

export default ReviewInbox;
