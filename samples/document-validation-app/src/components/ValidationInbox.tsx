import { useCallback, useEffect, useMemo, useState } from 'react';
import { Tasks, TaskType } from '@uipath/uipath-typescript/tasks';
import type { TaskGetResponse } from '@uipath/uipath-typescript/tasks';
import { useAuth } from '../hooks/useAuth';
import TaskList from './TaskList';
import ValidationPanel from './ValidationPanel';

const PENDING_DV_FILTER =
  "Type eq 'DocumentValidationTask' and Status ne 'Completed'";

function ValidationInbox() {
  const { sdk } = useAuth();
  const tasks = useMemo(() => new Tasks(sdk), [sdk]);

  const [taskList, setTaskList] = useState<TaskGetResponse[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      const result = await tasks.getAll({
        filter: PENDING_DV_FILTER,
        orderby: 'CreationTime desc',
      });
      setTaskList(result.items);
      setSelectedId((current) => {
        if (current && result.items.some((t) => t.id === current)) return current;
        return result.items[0]?.id ?? null;
      });
      setLoadError(null);
    } catch (err) {
      console.error('Failed to load tasks', err);
      setLoadError(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      setIsLoading(false);
    }
  }, [tasks]);

  useEffect(() => {
    // Initial fetch on mount. isLoading starts as true so we only update
    // state inside the async callbacks — no synchronous setState here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchTasks();
  }, [fetchTasks]);

  const refresh = useCallback(() => {
    setIsLoading(true);
    void fetchTasks();
  }, [fetchTasks]);

  const selectedTask = useMemo(
    () => taskList.find((t) => t.id === selectedId) ?? null,
    [taskList, selectedId],
  );

  const handleTaskCompleted = useCallback(async () => {
    setIsLoading(true);
    await fetchTasks();
  }, [fetchTasks]);

  return (
    <div className="h-full flex">
      <aside className="w-80 shrink-0 border-r bg-white flex flex-col">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-gray-900">
              Pending tasks
            </div>
            <div className="text-xs text-gray-500">
              {isLoading ? 'Loading…' : `${taskList.length} document validation`}
            </div>
          </div>
          <button
            type="button"
            onClick={refresh}
            disabled={isLoading}
            className="text-xs text-blue-600 hover:text-blue-800 disabled:text-gray-400"
          >
            Refresh
          </button>
        </div>
        <TaskList
          tasks={taskList}
          selectedId={selectedId}
          isLoading={isLoading}
          error={loadError}
          onSelect={setSelectedId}
        />
      </aside>
      <section className="flex-1 min-w-0 bg-gray-50">
        {selectedTask ? (
          <ValidationPanel
            key={selectedTask.id}
            task={selectedTask}
            taskType={TaskType.DocumentValidation}
            onTaskCompleted={handleTaskCompleted}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500 text-sm">
            {isLoading
              ? 'Loading pending validation tasks…'
              : 'Select a task from the left to begin validation.'}
          </div>
        )}
      </section>
    </div>
  );
}

export default ValidationInbox;
