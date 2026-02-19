import { useState, useEffect, useCallback } from 'react';
import { TaskType } from '@uipath/uipath-typescript';
import type { TaskGetResponse, TaskPriority, UiPath } from '@uipath/uipath-typescript';
import type { CaseGetStageResponse, StageTask } from '@uipath/uipath-typescript';
import type { ElementToTaskMap } from './CaseInstanceView';

interface HITLTasksPanelProps {
  caseTitle: string;
  tasks: TaskGetResponse[];
  selectedStage?: CaseGetStageResponse;
  elementToTaskMap: ElementToTaskMap;
  isLoading: boolean;
  sdk: UiPath;
  onTaskCompleted?: () => void;
  caseMetadata?: {
    assignedTo?: string;
    startDate?: string;
    submittedDate?: string;
    dueDate?: string;
    status?: string;
  };
}

const formatDate = (dateString?: string): string => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    });
  } catch {
    return dateString;
  }
};

const getTaskStatusColor = (status?: string): string => {
  const normalizedStatus = status?.toLowerCase() || '';
  if (normalizedStatus === 'completed' || normalizedStatus === 'done') {
    return 'bg-green-100 text-green-800';
  }
  if (normalizedStatus === 'in progress' || normalizedStatus === 'running' || normalizedStatus === 'pending') {
    return 'bg-blue-100 text-blue-800';
  }
  if (normalizedStatus === 'faulted' || normalizedStatus === 'failed') {
    return 'bg-red-100 text-red-800';
  }
  return 'bg-gray-100 text-gray-800';
};

const TaskStatusBadge = ({ status }: { status?: string }) => {
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getTaskStatusColor(status)}`}>
      {status || 'Unknown'}
    </span>
  );
};

/**
 * Find HITL tasks that are associated with a stage.
 *
 * The linking works as follows:
 * 1. Each stage has tasks defined in stage.tasks (type StageTask[][])
 * 2. Tasks with type === 'action' are HITL tasks
 * 3. The StageTask.id is the element ID from the case definition
 * 4. The elementToTaskMap maps element IDs to Action Center task IDs (from execution history's externalLink)
 * 5. We match HITL tasks by their task.id to the Action Center task IDs
 */
const getStageActionTasks = (
  stage: CaseGetStageResponse,
  allTasks: TaskGetResponse[],
  elementToTaskMap: ElementToTaskMap
): TaskGetResponse[] => {
  const stageTasks: StageTask[] = stage.tasks?.flat() || [];

  // Get all action task element IDs from this stage
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

  // If we have linked task IDs from execution history, use them for precise matching
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

const getPriorityLabel = (priority: TaskPriority): string => {
  switch (priority) {
    case 'High': return 'High';
    case 'Critical': return 'Critical';
    case 'Medium': return 'Medium';
    case 'Low': return 'Low';
    default: return String(priority);
  }
};

/**
 * Derive the effective stage status based on actual task completion
 * If all HITL tasks in the stage are completed, consider the stage completed
 */
const getDerivedStageStatus = (
  stage: CaseGetStageResponse | undefined,
  stageTasks: TaskGetResponse[]
): string => {
  if (!stage) return '';

  // If there are HITL tasks for this stage, check if all are completed
  if (stageTasks.length > 0) {
    const allTasksCompleted = stageTasks.every(t => t.status === 'Completed');
    if (allTasksCompleted) {
      return 'Completed';
    }
    // If some tasks exist and not all completed, it's in progress
    const anyTaskPending = stageTasks.some(t => t.status !== 'Completed');
    if (anyTaskPending) {
      return 'InProgress';
    }
  }

  // Fall back to the stage's reported status
  return stage.status || 'Not Started';
};

export const HITLTasksPanel = ({
  caseTitle,
  tasks,
  selectedStage,
  elementToTaskMap,
  isLoading,
  sdk,
  onTaskCompleted,
  caseMetadata
}: HITLTasksPanelProps) => {
  // Get tasks for the selected stage or show all tasks
  const displayTasks = selectedStage
    ? getStageActionTasks(selectedStage, tasks, elementToTaskMap)
    : tasks;

  // Derive stage status from actual task completion
  const derivedStageStatus = getDerivedStageStatus(selectedStage, displayTasks);

  if (isLoading) {
    return (
      <div className="flex-1 bg-gray-50 p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gray-50 overflow-y-auto">
      {/* Case Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">{caseTitle}</h2>
          {caseMetadata?.status && (
            <TaskStatusBadge status={caseMetadata.status} />
          )}
        </div>

        {/* Metadata Bar */}
        <div className="flex gap-8 text-sm">
          <div>
            <span className="text-gray-500">Assigned To</span>
            <p className="font-medium text-gray-900">{caseMetadata?.assignedTo || '-'}</p>
          </div>
          <div>
            <span className="text-gray-500">Start Date</span>
            <p className="font-medium text-gray-900">{formatDate(caseMetadata?.startDate)}</p>
          </div>
          <div>
            <span className="text-gray-500">Submitted Date</span>
            <p className="font-medium text-gray-900">{formatDate(caseMetadata?.submittedDate)}</p>
          </div>
          <div>
            <span className="text-gray-500">Due Date</span>
            <p className="font-medium text-gray-900">{formatDate(caseMetadata?.dueDate)}</p>
          </div>
        </div>
      </div>

      {/* Stage Info */}
      {selectedStage && (
        <div className="bg-blue-50 border-b border-blue-100 px-6 py-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-blue-700">Stage:</span>
            <span className="text-sm font-medium text-blue-900">{selectedStage.name}</span>
            <TaskStatusBadge status={derivedStageStatus} />
          </div>
        </div>
      )}

      {/* Tasks List */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            {selectedStage ? `Tasks in ${selectedStage.name}` : 'All HITL Tasks'}
          </h3>
          <span className="text-sm text-gray-500">{displayTasks.length} task(s)</span>
        </div>

        {displayTasks.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="mt-2 text-gray-500">No tasks found for this stage</p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayTasks.map((task, index) => {
              if (task.title === 'Submission Overview') {
                return (
                  <DetailedTaskCard
                    key={task.id || index}
                    task={task}
                    sdk={sdk}
                    onTaskCompleted={onTaskCompleted}
                  />
                );
              }
              if (task.title === 'Marketing & Response') {
                return (
                  <QuoteTaskCard
                    key={task.id || index}
                    task={task}
                    sdk={sdk}
                    onTaskCompleted={onTaskCompleted}
                  />
                );
              }
              return <TaskCard key={task.id || index} task={task} />;
            })}
          </div>
        )}

        {/* Stage Tasks Overview */}
        {selectedStage && selectedStage.tasks && (
          <div className="mt-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Stage Tasks Overview</h3>
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Started</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completed</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {selectedStage.tasks.flat().map((stageTask, idx) => (
                    <tr key={stageTask.id || idx} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">{stageTask.name}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          stageTask.type === 'action' ? 'bg-purple-100 text-purple-800' :
                          stageTask.type === 'rpa' ? 'bg-orange-100 text-orange-800' :
                          stageTask.type === 'agent' ? 'bg-cyan-100 text-cyan-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {stageTask.type || 'unknown'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <TaskStatusBadge status={stageTask.status} />
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{formatDate(stageTask.startedTime)}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{formatDate(stageTask.completedTime)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Detailed Task Card Component for 'test-task'
const DetailedTaskCard = ({
  task,
  sdk,
  onTaskCompleted
}: {
  task: TaskGetResponse;
  sdk: UiPath;
  onTaskCompleted?: () => void;
}) => {
  const [taskDetails, setTaskDetails] = useState<TaskGetResponse | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(true);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Insurance coverage table state
  const [coverageData, setCoverageData] = useState([
    { name: 'Package', premium: '$00,000', note: '' },
    { name: 'Property', premium: '$00,000', note: '' },
    { name: 'General Liability', premium: '$00,000', note: '' },
    { name: 'Umbrella/Excess', premium: '$00,000', note: '' },
    { name: "Worker's Comp", premium: '$00,000', note: '' },
    { name: 'Automotive', premium: '$00,000', note: '' },
  ]);

  const updateCoverageField = (index: number, field: 'premium' | 'note', value: string) => {
    setCoverageData(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Fetch full task details including data field
  useEffect(() => {
    const fetchTaskDetails = async () => {
      setIsLoadingDetails(true);
      try {
        const details = await sdk.tasks.getById(task.id, {}, task.folderId);
        console.log("Task response : ", details)
        console.log("Task response data : ", details.data)

        setTaskDetails(details);
      } catch (err) {
        console.error('Failed to fetch task details:', err);
        setTaskDetails(task); // Fallback to basic task info
      } finally {
        setIsLoadingDetails(false);
      }
    };
    fetchTaskDetails();
  }, [task.id, task.folderId, sdk]);

  const handleComplete = useCallback(async (action: 'submit' | 'reject') => {
    if (!taskDetails) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Build completion data with flat coverage fields
      const completionData = {
        ...(taskDetails.data || {}),
        Notes: notes || undefined,
        PackageNumber: coverageData[0].note || undefined,
        PropertyCoverage: coverageData[1].note || undefined,
        GeneralLiabilityCoverage: coverageData[2].note || undefined,
        UmbrellaExcessCoverage: coverageData[3].note || undefined,
        WorkersCompCoverage: coverageData[4].note || undefined,
        AutomotiveCoverage: coverageData[5].note || undefined,
      };

      // Remove undefined values
      Object.keys(completionData).forEach(key => {
        if (completionData[key as keyof typeof completionData] === undefined) {
          delete completionData[key as keyof typeof completionData];
        }
      });

      await sdk.tasks.complete({
        type: TaskType.App,
        taskId: task.id,
        data: completionData,
        action: action === 'submit' ? 'Submit' : 'Reject'
      }, task.folderId);

      onTaskCompleted?.();
    } catch (err) {
      console.error('Failed to complete task:', err);
      setError(`Failed to ${action} task. Please try again.`);
    } finally {
      setIsSubmitting(false);
    }
  }, [taskDetails, notes, coverageData, sdk, task.id, task.folderId, onTaskCompleted]);

  // Get the data fields from task details
  const displayDataFields = taskDetails?.data || {};

  if (isLoadingDetails) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      {/* Task Header */}
      <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{task.title || 'HITL Task'}</h3>
              <p className="text-sm text-gray-500">Task ID: {task.id}</p>
            </div>
          </div>
          <TaskStatusBadge status={task.status} />
        </div>
      </div>

      {/* Task Data Fields */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Task Data</h4>
        {Object.keys(displayDataFields).length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(displayDataFields).map(([key, value]) => (
              <div key={key} className="bg-gray-50 rounded-lg p-3">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  {key}
                </label>
                <p className="text-sm text-gray-900">
                  {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value ?? '-')}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 italic">No data fields available</p>
        )}
      </div>

      {/* Insurance Coverage Table */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="space-y-4">
          {coverageData.map((item, idx) => (
            <div key={idx} className="flex items-center gap-4">
              <div className="w-40 flex-shrink-0">
                <span className="text-sm font-medium text-gray-900">{item.name}</span>
              </div>
              <div className="w-32">
                <label className="block text-xs font-medium text-gray-500 mb-1">Premium</label>
                <span className="block px-2 py-1 text-sm text-gray-600">{item.premium}</span>
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 mb-1">Coverage</label>
                <input
                  type="text"
                  value={item.note}
                  onChange={(e) => updateCoverageField(idx, 'note', e.target.value)}
                  className="w-full px-2 py-1 text-sm border-b border-gray-300 focus:border-blue-500 focus:outline-none bg-transparent"
                  placeholder="Enter value"
                  disabled={task.status === 'Completed' || isSubmitting}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Notes Section */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Notes</h4>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add any notes or comments here..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
          rows={3}
          disabled={task.status === 'Completed' || isSubmitting}
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="px-6 py-3 bg-red-50 border-b border-red-200">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">
        {task.status !== 'Completed' ? (
          <>
            <button
              onClick={() => handleComplete('reject')}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Processing...' : 'Reject'}
            </button>
            <button
              onClick={() => handleComplete('submit')}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Processing...' : 'Submit'}
            </button>
          </>
        ) : (
          <span className="px-4 py-2 text-sm font-medium text-green-700 bg-green-100 rounded-lg">
            Task Completed
          </span>
        )}
      </div>
    </div>
  );
};

// Task Card Component
const TaskCard = ({ task }: { task: TaskGetResponse }) => {
  // Get due date from SLA if available
  const dueDate = task.taskSlaDetail?.expiryTime;

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      {/* Task Header */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <div>
            <h4 className="font-medium text-gray-900">{task.title || 'Untitled Task'}</h4>
            {task.externalTag && (
              <p className="text-sm text-gray-500 mt-0.5">{task.externalTag}</p>
            )}
          </div>
        </div>
        <TaskStatusBadge status={task.status} />
      </div>

      {/* Task Details */}
      <div className="px-4 py-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500 block">Priority</span>
            <span className="font-medium text-gray-900">
              {getPriorityLabel(task.priority)}
            </span>
          </div>
          <div>
            <span className="text-gray-500 block">Assigned To</span>
            <span className="font-medium text-gray-900">
              {task.assignedToUser?.displayName || task.assignedToUser?.emailAddress || '-'}
            </span>
          </div>
          <div>
            <span className="text-gray-500 block">Created</span>
            <span className="font-medium text-gray-900">{formatDate(task.createdTime)}</span>
          </div>
          <div>
            <span className="text-gray-500 block">Due Date</span>
            <span className="font-medium text-gray-900">{formatDate(dueDate)}</span>
          </div>
        </div>
      </div>

      {/* Task Actions */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex justify-end gap-2">
        <button className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200 rounded transition-colors">
          View Details
        </button>
        {task.status !== 'Completed' && (
          <button className="px-3 py-1.5 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded transition-colors">
            Complete Task
          </button>
        )}
      </div>
    </div>
  );
};

// Quote Task Card Component for 'my-task'
const QuoteTaskCard = ({
  task,
  sdk,
  onTaskCompleted
}: {
  task: TaskGetResponse;
  sdk: UiPath;
  onTaskCompleted?: () => void;
}) => {
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Coverage notes state - one for each coverage section
  const [coverageNotes, setCoverageNotes] = useState<Record<string, string>>({
    Package: '',
    Property: '',
    'General Liability': '',
    'Umbrella / Excess': '',
    "Worker's Compensation": '',
    Auto: '',
  });

  // Track which notes are expanded/visible
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});

  const toggleNoteExpanded = (coverage: string) => {
    setExpandedNotes(prev => ({
      ...prev,
      [coverage]: !prev[coverage]
    }));
  };

  const updateCoverageNote = (coverage: string, value: string) => {
    setCoverageNotes(prev => ({
      ...prev,
      [coverage]: value
    }));
  };

  // Hardcoded quote data based on screenshot
  const quoteData = [
    {
      coverage: 'Package',
      subtext: 'Property\nGeneral Liability\nUmbrella/Excess',
      markets: [
        { name: 'Selective Insurance Group', response: 'Quoted', premium: '', dateSent: '10/12/2025', dateReceived: '10/15/2025', attachment: 'Selective_Property_Quote_10... ×' },
      ],
      addNote: true,
    },
    {
      coverage: 'Property',
      markets: [
        { name: 'Hartford', response: 'Quoted', premium: '$25,000', dateSent: '10/12/2025', dateReceived: '10/15/2025', attachment: '' },
        { name: 'Chubb', response: 'No response', premium: '', dateSent: '10/12/2025', dateReceived: '', attachment: '' },
        { name: 'Travelers', response: 'Quoted', premium: '$35,000', dateSent: '10/12/2025', dateReceived: '10/15/2025', attachment: 'Travelers_Prop_Quote_10.13... ×' },
        { name: 'Selective Insurance Group', response: 'Included in pkg', premium: '', dateSent: '10/12/2025', dateReceived: '10/15/2025', attachment: '' },
      ],
      addNote: true,
    },
    {
      coverage: 'General Liability',
      subtext: 'Preferred Mfg Shop.\nNon-prem. Market to\npreferred panel.',
      markets: [
        { name: 'Hartford', response: 'Quoted', premium: '$20,000', dateSent: '10/12/2025', dateReceived: '10/15/2025', attachment: 'Add document' },
        { name: 'Chubb', response: 'No response', premium: '', dateSent: '10/12/2025', dateReceived: '', attachment: '' },
        { name: 'Travelers', response: 'No response', premium: '', dateSent: '10/12/2025', dateReceived: '10/12/2025', attachment: '' },
        { name: 'Selective Insurance Group', response: 'Included in pkg', premium: '', dateSent: '10/12/2025', dateReceived: '10/15/2025', attachment: '' },
        { name: 'IGP', response: 'Quoted', premium: '$27,000', dateSent: '10/12/2025', dateReceived: '10/15/2025', attachment: 'Add document' },
        { name: 'CNA Insurance Company', response: 'Declined', premium: '', dateSent: '10/12/2025', dateReceived: '10/15/2025', attachment: '' },
      ],
      addNote: true,
    },
    {
      coverage: 'Umbrella / Excess',
      markets: [
        { name: 'Travelers', response: 'Quoted', premium: '$25,000', dateSent: '10/12/2025', dateReceived: '10/15/2025', attachment: '' },
        { name: 'Selective Insurance Group', response: 'Included in pkg', premium: '', dateSent: '10/12/2025', dateReceived: '10/15/2025', attachment: '' },
      ],
      addNote: true,
    },
    {
      coverage: "Worker's Compensation",
      subtext: 'Preferred Mfg Struc.\nSend to IGP, then to\nother approved\nwholesalers.',
      markets: [
        { name: 'Hartford', response: 'Quoted', premium: '$25,000', dateSent: '10/12/2025', dateReceived: '10/15/2025', attachment: 'Hartford_WC_Quote_10.13.20 ×' },
        { name: 'IGP', response: 'Quoted', premium: '', dateSent: '10/12/2025', dateReceived: '10/15/2025', attachment: 'IGPx2_WC_Quote_10.23.2025 ×' },
      ],
      addNote: true,
    },
    {
      coverage: 'Auto',
      markets: [
        { name: 'Hartford', response: 'Quoted', premium: '$30,000', dateSent: '10/12/2025', dateReceived: '', attachment: 'Hartford_Auto_Quote_10.12.0... ×' },
      ],
      addNote: true,
    },
  ];

  const handleComplete = useCallback(async (action: 'approve' | 'reject') => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Build completion data with flat coverage note fields (similar to DetailedTaskCard)
      const completionData = {
        Notes: notes || undefined,
        PackageNumber: coverageNotes['Package'] || undefined,
        PropertyCoverage: coverageNotes['Property'] || undefined,
        GeneralLiabilityCoverage: coverageNotes['General Liability'] || undefined,
        UmbrellaExcessCoverage: coverageNotes['Umbrella / Excess'] || undefined,
        WorkersCompCoverage: coverageNotes["Worker's Compensation"] || undefined,
        AutomotiveCoverage: coverageNotes['Auto'] || undefined,
      };

      // Remove undefined values
      Object.keys(completionData).forEach(key => {
        if (completionData[key as keyof typeof completionData] === undefined) {
          delete completionData[key as keyof typeof completionData];
        }
      });

      await sdk.tasks.complete({
        type: TaskType.App,
        taskId: task.id,
        data: completionData,
        action: action === 'approve' ? 'Approve' : 'Reject'
      }, task.folderId);

      onTaskCompleted?.();
    } catch (err) {
      console.error('Failed to complete task:', err);
      setError(`Failed to ${action} task. Please try again.`);
    } finally {
      setIsSubmitting(false);
    }
  }, [notes, coverageNotes, sdk, task.id, task.folderId, onTaskCompleted]);

  const getResponseStyle = (response: string) => {
    switch (response.toLowerCase()) {
      case 'quoted':
        return 'bg-blue-50 text-blue-700';
      case 'no response':
        return 'bg-gray-50 text-gray-600';
      case 'included in pkg':
        return 'bg-green-50 text-green-700';
      case 'declined':
        return 'bg-red-50 text-red-700';
      default:
        return 'bg-gray-50 text-gray-600';
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      {/* Task Header */}
      <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{task.title || 'Quote Task'}</h3>
              <p className="text-sm text-gray-500">Task ID: {task.id}</p>
            </div>
          </div>
          <TaskStatusBadge status={task.status} />
        </div>
      </div>

      {/* Info Banner */}
      <div className="px-6 py-3 bg-amber-50 border-b border-amber-100">
        <p className="text-sm text-amber-800">
          All quoted responses require an attachment of the quote and the premium to continue.
        </p>
      </div>

      {/* Action Buttons Row */}
      <div className="px-6 py-3 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors">
            Add Coverage
          </button>
          <button className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors">
            Add Market
          </button>
          <button className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors">
            Create Package
          </button>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Market</span>
            <select className="text-sm border border-gray-300 rounded px-2 py-1">
              <option>All</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Response</span>
            <select className="text-sm border border-gray-300 rounded px-2 py-1">
              <option>All</option>
            </select>
          </div>
        </div>
      </div>

      {/* Quote Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Coverage</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Market</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Response</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Premium</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Date sent</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Date received</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Attachments</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {quoteData.map((section, sectionIdx) => (
              <>
                {section.markets.map((market, marketIdx) => (
                  <tr key={`${sectionIdx}-${marketIdx}`} className="hover:bg-gray-50">
                    {marketIdx === 0 ? (
                      <td className="px-4 py-3 align-top" rowSpan={section.markets.length + (section.addNote ? 1 : 0)}>
                        <div className="font-medium text-gray-900">{section.coverage}</div>
                        {section.subtext && (
                          <div className="text-xs text-gray-500 whitespace-pre-line mt-1">{section.subtext}</div>
                        )}
                      </td>
                    ) : null}
                    <td className="px-4 py-3 text-gray-700">{market.name}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getResponseStyle(market.response)}`}>
                        {market.response}
                        <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{market.premium || '-'}</td>
                    <td className="px-4 py-3 text-gray-700">{market.dateSent}</td>
                    <td className="px-4 py-3 text-gray-700">{market.dateReceived || '-'}</td>
                    <td className="px-4 py-3">
                      {market.attachment ? (
                        market.attachment === 'Add document' ? (
                          <button className="text-blue-600 hover:text-blue-700 text-xs">Add document</button>
                        ) : (
                          <span className="text-xs text-blue-600">{market.attachment}</span>
                        )
                      ) : null}
                    </td>
                  </tr>
                ))}
                {section.addNote && (
                  <tr key={`${sectionIdx}-addnote`}>
                    <td className="px-4 py-2" colSpan={6}>
                      {expandedNotes[section.coverage] ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={coverageNotes[section.coverage] || ''}
                            onChange={(e) => updateCoverageNote(section.coverage, e.target.value)}
                            placeholder={`Add note for ${section.coverage}...`}
                            className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            disabled={task.status === 'Completed' || isSubmitting}
                          />
                          <button
                            onClick={() => toggleNoteExpanded(section.coverage)}
                            className="text-gray-500 hover:text-gray-700 text-xs"
                          >
                            Done
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => toggleNoteExpanded(section.coverage)}
                          className="text-blue-600 text-xs cursor-pointer hover:underline"
                          disabled={task.status === 'Completed' || isSubmitting}
                        >
                          {coverageNotes[section.coverage] ? coverageNotes[section.coverage] : 'Add note'}
                        </button>
                      )}
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {/* Notes Section */}
      <div className="px-6 py-4 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Add Note</h4>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add any notes or comments here..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
          rows={3}
          disabled={task.status === 'Completed' || isSubmitting}
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="px-6 py-3 bg-red-50 border-t border-red-200">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
        {task.status !== 'Completed' ? (
          <>
            <button
              onClick={() => handleComplete('reject')}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Processing...' : 'Reject'}
            </button>
            <button
              onClick={() => handleComplete('approve')}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Processing...' : 'Approve'}
            </button>
          </>
        ) : (
          <span className="px-4 py-2 text-sm font-medium text-green-700 bg-green-100 rounded-lg">
            Task Completed
          </span>
        )}
      </div>
    </div>
  );
};
