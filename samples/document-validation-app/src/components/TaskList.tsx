import type { TaskGetResponse } from '@uipath/uipath-typescript/tasks';

interface TaskListProps {
  tasks: TaskGetResponse[];
  selectedId: number | null;
  isLoading: boolean;
  error: string | null;
  onSelect: (id: number) => void;
}

const priorityClasses: Record<string, string> = {
  Low: 'bg-gray-100 text-gray-700',
  Medium: 'bg-blue-100 text-blue-700',
  High: 'bg-amber-100 text-amber-800',
  Critical: 'bg-red-100 text-red-700',
};

function formatTime(value: string | Date | undefined): string {
  if (!value) return '';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString();
}

function TaskList({ tasks, selectedId, isLoading, error, onSelect }: TaskListProps) {
  if (error) {
    return (
      <div className="p-4 text-sm text-red-600 whitespace-pre-wrap break-words">
        {error}
      </div>
    );
  }

  if (isLoading && tasks.length === 0) {
    return <div className="p-4 text-sm text-gray-500">Loading…</div>;
  }

  if (tasks.length === 0) {
    return (
      <div className="p-4 text-sm text-gray-500">
        No pending document validation tasks.
      </div>
    );
  }

  return (
    <ul className="flex-1 overflow-y-auto divide-y">
      {tasks.map((task) => {
        const isSelected = task.id === selectedId;
        const priorityClass =
          priorityClasses[task.priority ?? ''] ?? priorityClasses.Low;
        return (
          <li key={task.id}>
            <button
              type="button"
              onClick={() => onSelect(task.id)}
              className={`w-full text-left px-4 py-3 transition-colors ${
                isSelected
                  ? 'bg-blue-50 border-l-4 border-blue-600'
                  : 'border-l-4 border-transparent hover:bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="text-sm font-medium text-gray-900 truncate">
                  {task.title || `Task #${task.id}`}
                </div>
                {task.priority && (
                  <span
                    className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded ${priorityClass}`}
                  >
                    {task.priority}
                  </span>
                )}
              </div>
              <div className="mt-1 text-xs text-gray-500 truncate">
                #{task.id} · {task.status ?? 'Pending'}
              </div>
              <div className="mt-1 text-xs text-gray-400 truncate">
                {formatTime(task.createdTime)}
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export default TaskList;
