import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { StagesPanel } from './StagesPanel';
import { HITLTasksPanel } from './HITLTasksPanel';
import type {
  CaseGetStageResponse,
  TaskGetResponse,
  CaseInstanceGetResponse,
  CaseInstanceExecutionHistoryResponse
} from '@uipath/uipath-typescript';

interface CaseInstanceViewProps {
  caseInstanceId: string;
  folderKey: string;
}

// Map from stage element ID to Action Center task IDs
export type ElementToTaskMap = Map<string, number[]>;

/**
 * Build a mapping from stage element IDs to Action Center task IDs
 * using the execution history's externalLink field
 */
const buildElementToTaskMap = (executionHistory: CaseInstanceExecutionHistoryResponse | null): ElementToTaskMap => {
  const map = new Map<string, number[]>();

  if (!executionHistory?.elementExecutions) {
    return map;
  }

  for (const execution of executionHistory.elementExecutions) {
    if (execution.externalLink) {
      // Extract task ID from external link URL
      // Format: https://.../tasks/{taskId} or contains taskId in path
      const taskIdMatch = execution.externalLink.match(/\/tasks\/(\d+)/);
      if (taskIdMatch) {
        const taskId = parseInt(taskIdMatch[1], 10);
        const existing = map.get(execution.elementId) || [];
        existing.push(taskId);
        map.set(execution.elementId, existing);
      }
    }
  }

  return map;
};

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

  // Log stage tasks for debugging
  console.log('[getStageActionTasks] Stage:', stage.name, 'Stage tasks:', stageTasks.map(t => ({ id: t.id, name: t.name, type: t.type })));

  const actionTaskElementIds = stageTasks
    .filter(t => t.type === 'action')
    .map(t => t.id);

  console.log('[getStageActionTasks] Action task element IDs:', actionTaskElementIds);

  // Collect all Action Center task IDs linked to these stage elements
  const linkedTaskIds = new Set<number>();
  for (const elementId of actionTaskElementIds) {
    const taskIds = elementToTaskMap.get(elementId);
    console.log('[getStageActionTasks] Element', elementId, 'mapped to task IDs:', taskIds);
    if (taskIds) {
      taskIds.forEach(id => linkedTaskIds.add(id));
    }
  }

  // If we have linked task IDs from execution history, use them
  if (linkedTaskIds.size > 0) {
    const result = allTasks.filter(task => linkedTaskIds.has(task.id));
    console.log('[getStageActionTasks] Found via execution history:', result.map(t => ({ id: t.id, title: t.title })));
    return result;
  }

  // Fallback: match by name if no execution history links available
  console.log('[getStageActionTasks] No execution history links, trying name matching...');
  console.log('[getStageActionTasks] All tasks to match:', allTasks.map(t => ({ id: t.id, title: t.title })));

  const result = allTasks.filter(task => {
    return stageTasks.some(st => {
      if (st.type !== 'action') return false;
      const stName = st.name?.toLowerCase() || '';
      const taskTitle = task.title?.toLowerCase() || '';
      const match = stName.includes(taskTitle) || taskTitle.includes(stName);
      if (match) {
        console.log('[getStageActionTasks] Name match found:', st.name, '<->', task.title);
      }
      return match;
    });
  });

  console.log('[getStageActionTasks] Found via name matching:', result.map(t => ({ id: t.id, title: t.title })));
  return result;
};

/**
 * Find the next stage to advance to
 * Priority: 1) Stage with pending HITL tasks, 2) Running/InProgress stage, 3) Next non-completed stage
 */
const findNextStageWithPendingTasks = (
  stages: CaseGetStageResponse[],
  currentStageId: string | undefined,
  tasks: TaskGetResponse[],
  elementToTaskMap: ElementToTaskMap
): CaseGetStageResponse | undefined => {
  // Find current stage index
  const currentIndex = currentStageId
    ? stages.findIndex(s => s.id === currentStageId)
    : -1;

  console.log('[findNextStage] Current index:', currentIndex, 'Total stages:', stages.length);
  console.log('[findNextStage] All tasks:', tasks.map(t => ({ id: t.id, title: t.title, status: t.status })));

  let firstRunningStage: CaseGetStageResponse | undefined;
  let firstNonCompletedStage: CaseGetStageResponse | undefined;

  // Look through stages starting from current+1
  for (let i = currentIndex + 1; i < stages.length; i++) {
    const stage = stages[i];
    const stageStatus = stage.status?.toLowerCase() || '';
    console.log('[findNextStage] Checking stage:', stage.name, 'Status:', stageStatus);

    // Priority 1: Stage with pending HITL tasks
    const stageActionTasks = getStageActionTasks(stage, tasks, elementToTaskMap);
    console.log('[findNextStage] Stage', stage.name, 'HITL tasks:', stageActionTasks.length, stageActionTasks.map(t => ({ id: t.id, title: t.title, status: t.status })));

    const hasPendingTask = stageActionTasks.some(task => task.status !== 'Completed');
    if (hasPendingTask) {
      console.log('[findNextStage] Found stage with pending tasks:', stage.name);
      return stage;
    }

    // Track first running/inprogress stage as fallback
    if (!firstRunningStage && (stageStatus === 'running' || stageStatus === 'inprogress')) {
      firstRunningStage = stage;
    }

    // Track first non-completed stage as fallback
    if (!firstNonCompletedStage && stageStatus !== 'completed') {
      firstNonCompletedStage = stage;
    }
  }

  // Priority 2: Return first running/inprogress stage
  if (firstRunningStage) {
    console.log('[findNextStage] No pending tasks, returning running stage:', firstRunningStage.name);
    return firstRunningStage;
  }

  // Priority 3: Return first non-completed stage
  if (firstNonCompletedStage) {
    console.log('[findNextStage] No running stage, returning first non-completed stage:', firstNonCompletedStage.name);
    return firstNonCompletedStage;
  }

  console.log('[findNextStage] No stage with pending tasks found');
  return undefined;
};

export const CaseInstanceView = ({ caseInstanceId, folderKey }: CaseInstanceViewProps) => {
  const { sdk } = useAuth();
  const [caseInstance, setCaseInstance] = useState<CaseInstanceGetResponse | null>(null);
  const [stages, setStages] = useState<CaseGetStageResponse[]>([]);
  const [tasks, setTasks] = useState<TaskGetResponse[]>([]);
  const [elementToTaskMap, setElementToTaskMap] = useState<ElementToTaskMap>(new Map());
  const [selectedStage, setSelectedStage] = useState<CaseGetStageResponse | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCaseData = useCallback(async (autoAdvance = false, silent = false) => {
    // Only show loading state if not a silent refresh (e.g., polling)
    if (!silent) {
      setIsLoading(true);
    }
    setError(null);

    try {
      // Fetch case instance details, stages, execution history, and HITL tasks in parallel
      const [instance, stagesData, executionHistory, tasksResponse] = await Promise.all([
        sdk.maestro.cases.instances.getById(caseInstanceId, folderKey),
        sdk.maestro.cases.instances.getStages(caseInstanceId, folderKey),
        sdk.maestro.cases.instances.getExecutionHistory(caseInstanceId, folderKey).catch(() => null),
        sdk.maestro.cases.instances.getActionTasks(caseInstanceId)
      ]);

      setCaseInstance(instance);

      // Log stage types for verification
      console.log('[Stages] All stages with types:', stagesData.map(s => ({ name: s.name, stageType: s.stageType })));

      // Filter out exception stages (stageType: 'case-management:ExceptionStage')
      const filteredStages = stagesData.filter(
        stage => stage.stageType !== 'case-management:ExceptionStage'
      );
      console.log('[Stages] Filtered stages:', filteredStages.map(s => s.name));
      setStages(filteredStages);

      // Build element-to-task mapping from execution history
      const taskMap = buildElementToTaskMap(executionHistory);
      setElementToTaskMap(taskMap);

      // Handle both paginated and non-paginated responses
      const tasksList = Array.isArray(tasksResponse)
        ? tasksResponse
        : (tasksResponse as { items: TaskGetResponse[] }).items || [];
      setTasks(tasksList);

      // Update selectedStage with fresh data or auto-advance to next stage
      setSelectedStage(prevSelected => {
        // If no stage is selected (initial load), find the first stage with pending HITL tasks
        if (!prevSelected) {
          const firstStageWithPendingTasks = findNextStageWithPendingTasks(
            filteredStages,
            undefined, // Start from beginning
            tasksList,
            taskMap
          );
          return firstStageWithPendingTasks;
        }

        const updatedStage = filteredStages.find(s => s.id === prevSelected.id);

        // If auto-advance is enabled, check if all HITL tasks in current stage are completed
        if (autoAdvance && updatedStage) {
          // Get tasks for the current stage using helper with fallback name matching
          const stageActionTasks = getStageActionTasks(updatedStage, tasksList, taskMap);

          console.log('[Auto-advance] Current stage:', updatedStage.name, 'Status:', updatedStage.status);
          console.log('[Auto-advance] Stage HITL tasks:', stageActionTasks.length, stageActionTasks.map(t => ({ id: t.id, title: t.title, status: t.status })));

          // Check if all tasks in current stage are completed
          const allTasksCompleted = stageActionTasks.length > 0 &&
            stageActionTasks.every(task => task.status === 'Completed');

          // Also check if stage itself is marked completed (for stages without HITL tasks)
          const stageCompleted = updatedStage.status?.toLowerCase() === 'completed';

          console.log('[Auto-advance] All tasks completed:', allTasksCompleted, 'Stage completed:', stageCompleted);

          // If all tasks are completed OR stage is marked completed, find next stage with pending tasks
          if (allTasksCompleted || stageCompleted) {
            const nextStage = findNextStageWithPendingTasks(
              filteredStages,
              prevSelected.id,
              tasksList,
              taskMap
            );
            console.log('[Auto-advance] Next stage with pending tasks:', nextStage?.name);
            if (nextStage) {
              return nextStage;
            }
          }
        }

        return updatedStage || prevSelected;
      });

    } catch (err) {
      console.error('Failed to load case data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load case data');
    } finally {
      // Only update loading state if not a silent refresh
      if (!silent) {
        setIsLoading(false);
      }
    }
  }, [sdk, caseInstanceId, folderKey]);

  // Handler for task completion - silent refresh with auto-advance
  const handleTaskCompleted = useCallback(async () => {
    await loadCaseData(true, true); // Silent refresh WITH auto-advance
  }, [loadCaseData]);

  useEffect(() => {
    loadCaseData();
  }, [loadCaseData]);

  // Polling: refresh data when selected stage has no tasks (waiting for backend)
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const pollCountRef = useRef(0);
  const MAX_POLL_ATTEMPTS = 10; // Stop after 10 attempts (30 seconds total)
  const POLL_INTERVAL = 2000; // Poll every 3 seconds

  useEffect(() => {
    // Clear any existing polling
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    // Don't poll if loading or no stage selected
    if (isLoading || !selectedStage) {
      return;
    }

    // Check if selected stage has tasks
    const stageTasks = getStageActionTasks(selectedStage, tasks, elementToTaskMap);
    const hasTasks = stageTasks.length > 0;

    // If stage has no tasks and stage is NOT completed, start polling
    // This handles "running", "inprogress", "not started", or empty status
    const stageStatus = selectedStage.status?.toLowerCase() || '';
    const isCompleted = stageStatus === 'completed';
    const shouldPoll = !hasTasks && !isCompleted;

    console.log('[Polling] Stage:', selectedStage.name, 'Status:', stageStatus, 'Has tasks:', hasTasks, 'Should poll:', shouldPoll);

    if (shouldPoll && pollCountRef.current < MAX_POLL_ATTEMPTS) {
      console.log('[Polling] Starting poll for tasks in stage:', selectedStage.name, 'Attempt:', pollCountRef.current + 1);

      pollingRef.current = setInterval(async () => {
        pollCountRef.current += 1;
        console.log('[Polling] Refreshing data, attempt:', pollCountRef.current);

        if (pollCountRef.current >= MAX_POLL_ATTEMPTS) {
          console.log('[Polling] Max attempts reached, stopping poll');
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
          return;
        }

        await loadCaseData(true, true); // Silent refresh WITH auto-advance to move when stage completes
      }, POLL_INTERVAL);
    } else if (hasTasks) {
      // Reset poll count when tasks are found
      pollCountRef.current = 0;
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [selectedStage, tasks, elementToTaskMap, isLoading, loadCaseData]);

  const handleStageClick = (stage: CaseGetStageResponse) => {
    // Always select the clicked stage (no toggle off on re-click)
    setSelectedStage(stage);
  };

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to load case</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <button
            onClick={() => loadCaseData()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const caseTitle = caseInstance?.caseTitle || caseInstance?.instanceDisplayName || 'Case Instance';

  const caseMetadata = {
    assignedTo: caseInstance?.startedByUser,
    startDate: caseInstance?.startedTime,
    submittedDate: caseInstance?.startedTime,
    dueDate: undefined, // Could be extracted from SLA if available
    status: caseInstance?.latestRunStatus
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Left Panel - Stages */}
      <div className="w-64 flex-shrink-0">
        <StagesPanel
          stages={stages}
          tasks={tasks}
          elementToTaskMap={elementToTaskMap}
          isLoading={isLoading}
          onStageClick={handleStageClick}
          selectedStageId={selectedStage?.id}
        />
      </div>

      {/* Right Panel - HITL Tasks */}
      <HITLTasksPanel
        caseTitle={caseTitle}
        tasks={tasks}
        selectedStage={selectedStage}
        elementToTaskMap={elementToTaskMap}
        isLoading={isLoading}
        sdk={sdk}
        onTaskCompleted={handleTaskCompleted}
        caseMetadata={caseMetadata}
      />
    </div>
  );
};
