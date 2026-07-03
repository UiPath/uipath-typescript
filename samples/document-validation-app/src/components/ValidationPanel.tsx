import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ValidationStation,
  ValidationStationLanguage,
  type IValidationStationOptions,
  type SaveValidatedDataResult,
} from '@uipath/ui-widgets-validation-station';
import { Tasks, TaskType } from '@uipath/uipath-typescript/tasks';
import type { TaskGetResponse } from '@uipath/uipath-typescript/tasks';
import { OrchestratorDuModule } from '@uipath/uipath-typescript/orchestrator-du-module';
import type { DuFramework } from '@uipath/uipath-typescript/document-understanding';
import { useAuth } from '../hooks/useAuth';

type PendingAction = 'save' | 'submit' | 'report';

// Save-as-draft only works when the web component emits its latest in-memory
// extraction state — without this the draft upload is a silent no-op.
const VALIDATION_STATION_OPTIONS: IValidationStationOptions = {
  emitDtoStateChanges: true,
};

interface ValidationPanelProps {
  task: TaskGetResponse;
  taskType: TaskType;
  /** Opens the Validation Station read-only and hides the action buttons. */
  isReadonly?: boolean;
  onTaskCompleted: () => Promise<void> | void;
}

function ValidationPanel({
  task,
  taskType,
  isReadonly = false,
  onTaskCompleted,
}: ValidationPanelProps) {
  const { sdk } = useAuth();
  const tasksService = useMemo(() => new Tasks(sdk), [sdk]);
  const duModule = useMemo(() => new OrchestratorDuModule(sdk), [sdk]);

  const [fullTask, setFullTask] = useState<TaskGetResponse | null>(null);
  const [isLoadingTask, setIsLoadingTask] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [save, setSave] = useState<{ validate: boolean } | undefined>(undefined);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    tasksService
      .getById(task.id, { taskType }, task.folderId)
      .then((loaded) => {
        if (cancelled) return;
        setFullTask(loaded);
        setIsLoadingTask(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Failed to load task', err);
        setLoadError(err instanceof Error ? err.message : 'Failed to load task');
        setIsLoadingTask(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tasksService, task.id, task.folderId, taskType]);

  // Save-as-draft: the widget has already uploaded the in-progress data to the
  // bucket. Nothing to complete — just clear the pending state and surface any
  // failure (the widget stays silent on its own).
  const handleSaveAsDraftComplete = useCallback((result: SaveValidatedDataResult) => {
    setSave(undefined);
    setPendingAction(null);
    if (!result.success) {
      setActionError(result.error ?? 'Failed to save draft');
    }
  }, []);

  // Submit: the widget has already run ProcessExtractedData and uploaded the
  // validated result to the bucket. On success we complete the task; the
  // validated data lives in the bucket, so no payload is sent here.
  const handleSubmitComplete = useCallback(
    async (result: SaveValidatedDataResult) => {
      setSave(undefined);

      if (!result.success) {
        setActionError(result.error ?? 'Failed to submit document');
        setPendingAction(null);
        return;
      }

      if (!fullTask) {
        setPendingAction(null);
        return;
      }

      try {
        await fullTask.complete({
          type: TaskType.DocumentValidation,
          action: "Completed",
        });
        await onTaskCompleted();
      } catch (err) {
        console.error('Failed to complete task', err);
        setActionError(
          err instanceof Error ? err.message : 'Failed to complete task',
        );
      } finally {
        setPendingAction(null);
      }
    },
    [fullTask, onTaskCompleted],
  );

  // Report as exception: the widget does not call any API for this flow — the
  // host owns persistence. We forward the documentId + reason to the SDK and,
  // on success, refresh the list (the task leaves the pending inbox).
  const reportException = useCallback(
    async (documentId: string, reason: string) => {
      if (!fullTask) return;
      setActionError(null);
      setPendingAction('report');
      try {
        const result = await duModule.submitExceptionReport(
          fullTask.id,
          documentId,
          reason,
          { folderId: fullTask.folderId },
        );
        if (!result.IsSuccessful) {
          setActionError(result.ErrorMessage ?? 'Failed to report exception');
          return;
        }
        await onTaskCompleted();
      } catch (err) {
        console.error('Failed to report exception', err);
        setActionError(
          err instanceof Error ? err.message : 'Failed to report exception',
        );
      } finally {
        setPendingAction(null);
      }
    },
    [fullTask, duModule, onTaskCompleted],
  );

  const handleSave = () => {
    setActionError(null);
    setPendingAction('save');
    setSave({ validate: false });
  };

  const handleSubmit = () => {
    setActionError(null);
    setPendingAction('submit');
    setSave({ validate: true });
  };

  const handleReportException = () => {
    if (!fullTask) return;
    const documentId = (fullTask.data as DuFramework.ContentValidationData)
      ?.DocumentId;
    if (typeof documentId !== 'string' || !documentId) {
      setActionError('This task has no document id to report as an exception.');
      return;
    }
    const reason = window.prompt(
      'Reason for reporting this document as an exception:',
    );
    if (reason === null) return; // dialog cancelled
    void reportException(
      documentId,
      reason.trim() || 'Reported via Document Validation app',
    );
  };

  const displayTask = fullTask ?? task;
  const canAct = !!fullTask && !!fullTask.data && pendingAction === null;

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-start justify-between gap-4 px-6 py-3 border-b bg-white">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-gray-900 truncate">
            {displayTask.title || `Task #${displayTask.id}`}
          </div>
          <div className="text-xs text-gray-500 truncate">
            #{displayTask.id} · Folder {displayTask.folderId ?? '—'} ·{' '}
            {displayTask.status ?? 'Pending'}
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          {isReadonly ? (
            <span className="px-2 py-1 text-xs font-medium text-gray-500 bg-gray-100 rounded">
              Read only
            </span>
          ) : (
            <>
              <button
                type="button"
                onClick={handleReportException}
                disabled={!canAct}
                className="px-3 py-1.5 text-sm bg-white text-red-600 border border-red-300 rounded hover:bg-red-50 disabled:opacity-50"
              >
                {pendingAction === 'report' ? 'Reporting…' : 'Report exception'}
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!canAct}
                className="px-3 py-1.5 text-sm bg-white text-gray-700 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
              >
                {pendingAction === 'save' ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canAct}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300"
              >
                {pendingAction === 'submit' ? 'Submitting…' : 'Submit'}
              </button>
            </>
          )}
        </div>
      </div>
      {actionError && (
        <div className="px-6 py-2 bg-red-50 text-sm text-red-700 border-b">
          {actionError}
        </div>
      )}
      <div className="flex-1 min-h-0 bg-white">
        {isLoadingTask ? (
          <div className="h-full flex items-center justify-center text-sm text-gray-500">
            Loading document…
          </div>
        ) : loadError ? (
          <div className="p-6 text-sm text-red-700 whitespace-pre-wrap break-words">
            {loadError}
          </div>
        ) : !fullTask?.data ? (
          <div className="p-6 text-sm text-gray-500">
            This task has no validation payload to display.
          </div>
        ) : (
          <ValidationStation
            sdk={sdk}
            data={fullTask.data as DuFramework.ContentValidationData}
            folderId={fullTask.folderId}
            theme="light"
            language={ValidationStationLanguage.English}
            isReadonly={isReadonly}
            options={VALIDATION_STATION_OPTIONS}
            save={save}
            onSaveAsDraftComplete={handleSaveAsDraftComplete}
            onSubmitComplete={handleSubmitComplete}
            onReportExceptionComplete={(documentId, reason) => {
              void reportException(
                documentId,
                reason || 'Reported via Validation Station',
              );
            }}
          />
        )}
      </div>
    </div>
  );
}

export default ValidationPanel;
