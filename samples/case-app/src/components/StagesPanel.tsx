import type { CaseGetStageResponse, TaskGetResponse } from '@uipath/uipath-typescript';
import type { ElementToTaskMap } from './CaseInstanceView';

interface StagesPanelProps {
  stages: CaseGetStageResponse[];
  tasks: TaskGetResponse[];
  elementToTaskMap: ElementToTaskMap;
  isLoading: boolean;
  onStageClick?: (stage: CaseGetStageResponse) => void;
  selectedStageId?: string;
}

/**
 * Get Action Center tasks associated with a stage
 * Uses execution history mapping first, then falls back to name matching
 */
const getStageActionTasks = (
  stage: CaseGetStageResponse,
  allTasks: TaskGetResponse[],
  elementToTaskMap: ElementToTaskMap
): TaskGetResponse[] => {
  const stageTasks = stage.tasks?.flat() || [];
  const actionTaskElementIds = stageTasks
    .filter(t => t.type === 'action')
    .map(t => t.id);

  // Collect all Action Center task IDs linked to these stage elements
  const linkedTaskIds = new Set<number>();
  for (const elementId of actionTaskElementIds) {
    const taskIds = elementToTaskMap.get(elementId);
    if (taskIds) {
      taskIds.forEach(id => linkedTaskIds.add(id));
    }
  }

  // If we have linked task IDs from execution history, use them
  if (linkedTaskIds.size > 0) {
    return allTasks.filter(task => linkedTaskIds.has(task.id));
  }

  // Fallback: match by name if no execution history links available
  return allTasks.filter(task => {
    return stageTasks.some(st =>
      st.type === 'action' && (
        st.name?.toLowerCase().includes(task.title?.toLowerCase() || '') ||
        task.title?.toLowerCase().includes(st.name?.toLowerCase() || '')
      )
    );
  });
};

/**
 * Derive stage status from actual task completion
 * Priority: 1) Check linked tasks, 2) Fall back to API status
 */
const getDerivedStageStatus = (
  stage: CaseGetStageResponse,
  allTasks: TaskGetResponse[],
  elementToTaskMap: ElementToTaskMap
): 'completed' | 'in_progress' | 'pending' => {
  // Get tasks linked to this stage
  const stageTasks = getStageActionTasks(stage, allTasks, elementToTaskMap);

  // If stage has linked HITL tasks, derive status from them
  if (stageTasks.length > 0) {
    const allCompleted = stageTasks.every(t => t.status === 'Completed');
    if (allCompleted) {
      return 'completed';
    }
    // If some tasks exist and not all are completed, it's in progress
    return 'in_progress';
  }

  // Fall back to API status
  const normalizedStatus = stage.status?.toLowerCase() || '';
  if (normalizedStatus === 'completed') {
    return 'completed';
  }
  if (normalizedStatus === 'running') {
    return 'in_progress';
  }
  return 'pending';
};

const StageIcon = ({ status }: { status: 'completed' | 'in_progress' | 'pending' }) => {
  if (status === 'completed') {
    return (
      <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      </div>
    );
  }
  if (status === 'in_progress') {
    return (
      <div className="w-5 h-5 rounded-full border-2 border-blue-500 bg-blue-50 flex items-center justify-center flex-shrink-0">
        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
      </div>
    );
  }
  return (
    <div className="w-5 h-5 rounded-full border-2 border-gray-300 bg-white flex-shrink-0"></div>
  );
};

export const StagesPanel = ({ stages, tasks, elementToTaskMap, isLoading, onStageClick, selectedStageId }: StagesPanelProps) => {
  if (isLoading) {
    return (
      <div className="bg-white h-full border-r border-gray-200">
        <div className="p-4">
          <div className="animate-pulse space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-5 h-5 bg-gray-200 rounded-full"></div>
                <div className="h-4 bg-gray-200 rounded w-32"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white h-full border-r border-gray-200 flex flex-col">
      {/* Stages List */}
      <div className="flex-1 overflow-y-auto">
        <div className="py-2">
          {stages.map((stage, index) => {
            const status = getDerivedStageStatus(stage, tasks, elementToTaskMap);
            const isSelected = selectedStageId === stage.id;

            return (
              <button
                key={stage.id || index}
                onClick={() => onStageClick?.(stage)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left ${
                  isSelected ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                }`}
              >
                <StageIcon status={status} />
                <span className={`text-sm ${
                  status === 'completed' ? 'text-gray-600' :
                  status === 'in_progress' ? 'text-blue-700 font-medium' :
                  'text-gray-500'
                }`}>
                  {stage.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Add Ad Hoc Task */}
      <div className="border-t border-gray-200">
        <button className="w-full flex items-center gap-2 px-4 py-3 text-blue-600 hover:bg-gray-50 transition-colors text-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Add Ad Hoc Task</span>
        </button>
      </div>

      {/* Bottom Sections */}
      <div className="border-t border-gray-200">
        <button className="w-full flex items-center gap-2 px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors text-sm">
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <span>Notes</span>
        </button>
        <button className="w-full flex items-center gap-2 px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors text-sm">
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
          <span>Attachments</span>
        </button>
        <button className="w-full flex items-center gap-2 px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors text-sm">
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Audit Trail</span>
        </button>
      </div>
    </div>
  );
};
