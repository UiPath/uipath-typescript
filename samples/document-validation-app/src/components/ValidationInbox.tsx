import { useCallback, useEffect, useMemo, useState } from 'react';
import { Tasks, TaskStatus, TaskType } from '@uipath/uipath-typescript/tasks';
import type { TaskGetResponse } from '@uipath/uipath-typescript/tasks';
import { useAuth } from '../hooks/useAuth';
import TaskList from './TaskList';
import ValidationPanel from './ValidationPanel';

type TabKey = 'pending' | 'unassigned' | 'completed';

interface TabConfig {
  key: TabKey;
  label: string;
  status: TaskStatus;
  /** Rows are editable only in the pending tab; the others open read-only. */
  readonly: boolean;
  emptyMessage: string;
}

const TABS: TabConfig[] = [
  {
    key: 'pending',
    label: 'Pending',
    status: TaskStatus.Pending,
    readonly: false,
    emptyMessage: 'No pending document validation tasks.',
  },
  {
    key: 'unassigned',
    label: 'Unassigned',
    status: TaskStatus.Unassigned,
    readonly: true,
    emptyMessage: 'No unassigned document validation tasks.',
  },
  {
    key: 'completed',
    label: 'Completed',
    status: TaskStatus.Completed,
    readonly: true,
    emptyMessage: 'No completed document validation tasks.',
  },
];

function buildFilter(status: TaskStatus): string {
  return `Type eq '${TaskType.DocumentValidation}' and Status eq '${status}'`;
}

function ValidationInbox() {
  const { sdk } = useAuth();
  const tasks = useMemo(() => new Tasks(sdk), [sdk]);

  const [activeTab, setActiveTab] = useState<TabKey>('pending');
  const [taskList, setTaskList] = useState<TaskGetResponse[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const currentTab = useMemo(
    () => TABS.find((t) => t.key === activeTab) ?? TABS[0],
    [activeTab],
  );

  const fetchTasks = useCallback(async () => {
    try {
      const result = await tasks.getAll({
        filter: buildFilter(currentTab.status),
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
  }, [tasks, currentTab.status]);

  useEffect(() => {
    // Refetch whenever the active tab changes (fetchTasks depends on the tab's
    // status filter). isLoading is flipped on before this runs.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchTasks();
  }, [fetchTasks]);

  const selectTab = useCallback((key: TabKey) => {
    setActiveTab(key);
    setIsLoading(true);
    setSelectedId(null);
  }, []);

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
            <div className="text-sm font-semibold text-gray-900">Tasks</div>
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
        <div className="flex border-b text-sm">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => selectTab(tab.key)}
              className={`flex-1 px-2 py-2 font-medium transition-colors ${
                activeTab === tab.key
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 border-b-2 border-transparent hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <TaskList
          tasks={taskList}
          selectedId={selectedId}
          isLoading={isLoading}
          error={loadError}
          emptyMessage={currentTab.emptyMessage}
          onSelect={setSelectedId}
        />
      </aside>
      <section className="flex-1 min-w-0 bg-gray-50">
        {selectedTask ? (
          <ValidationPanel
            key={`${activeTab}-${selectedTask.id}`}
            task={selectedTask}
            taskType={TaskType.DocumentValidation}
            isReadonly={currentTab.readonly}
            onTaskCompleted={handleTaskCompleted}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500 text-sm">
            {isLoading
              ? 'Loading validation tasks…'
              : 'Select a task from the left to begin.'}
          </div>
        )}
      </section>
    </div>
  );
}

export default ValidationInbox;
