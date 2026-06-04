import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ValidationStation,
  ValidationStationLanguage,
  type ValidationStationProps,
} from '@uipath/ui-widgets-validation-station';
import { Tasks, TaskType } from '@uipath/uipath-typescript/tasks';
import type { TaskGetResponse } from '@uipath/uipath-typescript/tasks';
import type { DuFramework } from '@uipath/uipath-typescript/document-understanding';
import { useAuth } from '../hooks/useAuth';

type SaveValidatedDataResult = Parameters<
  NonNullable<ValidationStationProps['onSaveComplete']>
>[0];

type PendingAction = 'save' | 'submit';

interface ValidationPanelProps {
  task: TaskGetResponse;
  taskType: TaskType;
  onTaskCompleted: () => Promise<void> | void;
}

function ValidationPanel({ task, taskType, onTaskCompleted }: ValidationPanelProps) {
  const { sdk } = useAuth();
  const tasksService = useMemo(() => new Tasks(sdk), [sdk]);

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

  const handleSaveComplete = useCallback(
    async (result: SaveValidatedDataResult) => {
      setSave(undefined);
      const action = pendingAction;

      if (!result.success || !fullTask) {
        setPendingAction(null);
        return;
      }

      if (action !== 'submit') {
        setPendingAction(null);
        return;
      }

      try {
        await fullTask.complete({
          type: taskType,
          action: 'Completed',
          data: fullTask.data ?? {},
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
    [pendingAction, fullTask, taskType, onTaskCompleted],
  );

  const handleSave = () => {
    setActionError(null);
    setPendingAction('save');
    setSave({ validate: true });
  };

  const handleSubmit = () => {
    setActionError(null);
    setPendingAction('submit');
    setSave({ validate: true });
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
            save={save}
            onSaveComplete={handleSaveComplete}
          />
        )}
      </div>
    </div>
  );
}

export default ValidationPanel;
