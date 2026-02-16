import { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { getTaskDetails, assignTask, completeTask } from '../services/casesService';
import type { TaskDetailsResponse } from '../types/cases';

function formatLabel(key: string): string {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()).trim();
}

function extractAssignedUser(raw: unknown): string | null {
  if (raw == null) return null;
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    // UiPath may return an object with Name, name, Email, or email
    const val = obj.Name ?? obj.name ?? obj.Email ?? obj.email;
    if (typeof val === 'string') return val;
  }
  return String(raw);
}

function toFormValues(data: Record<string, unknown>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(data)) {
    result[key] =
      typeof value === 'object' && value !== null
        ? JSON.stringify(value, null, 2)
        : String(value ?? '');
  }
  return result;
}

function TaskDetailsTab({
  taskDetails,
  onAssign,
  assigning,
  onComplete,
  completing,
}: {
  taskDetails: TaskDetailsResponse;
  onAssign: () => void;
  assigning: boolean;
  onComplete: (action: 'Approve' | 'Reject', formData: Record<string, string>) => void;
  completing: boolean;
}) {
  const task = taskDetails.task as Record<string, unknown> | null;
  const data = (task?.data as Record<string, unknown>) ?? {};
  const assignedToUser = extractAssignedUser(task?.assignedToUser);
  const title = task?.title as string | null;
  const priority = task?.priority as string | null;

  const [formValues, setFormValues] = useState<Record<string, string>>(() => toFormValues(data));

  const isAssigned = assignedToUser != null;
  const isUnassigned = assignedToUser == null;

  const handleFieldChange = (key: string, newValue: string) => {
    setFormValues((prev) => ({ ...prev, [key]: newValue }));
  };

  return (
    <div className="task-details-panel">
      {title && <h2 className="task-title">{title}</h2>}

      <div className="task-meta">
        {priority && <span className="task-badge priority">{priority}</span>}
        {assignedToUser ? (
          <span className="task-assigned">Assigned to: {assignedToUser}</span>
        ) : (
          <span className="task-assigned">Unassigned</span>
        )}
      </div>

      {Object.keys(data).length > 0 && (
        <div className="task-form">
          {Object.keys(data).map((key) => (
            <div className="task-form-field" key={key}>
              <label className="task-form-label">{formatLabel(key)}</label>
              <input
                type="text"
                className="task-form-input"
                value={formValues[key] ?? ''}
                onChange={(e) => handleFieldChange(key, e.target.value)}
              />
            </div>
          ))}
        </div>
      )}

      <div className="task-actions">
        {isAssigned && (
          <>
            <button
              className="btn-primary btn-approve"
              onClick={() => onComplete('Approve', formValues)}
              disabled={completing}
            >
              {completing ? 'Submitting...' : 'Approve'}
            </button>
            <button
              className="btn-reject"
              onClick={() => onComplete('Reject', formValues)}
              disabled={completing}
            >
              {completing ? 'Submitting...' : 'Reject'}
            </button>
          </>
        )}
        {isUnassigned && (
          <button className="btn-primary" onClick={onAssign} disabled={assigning}>
            {assigning ? 'Assigning...' : 'Assign to myself'}
          </button>
        )}
      </div>
    </div>
  );
}

export function HitlTaskPage() {
  const { instanceId } = useParams<{ instanceId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as { caseName?: string; caseId?: string; folderKey?: string } | null;

  const [taskDetails, setTaskDetails] = useState<TaskDetailsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'view'>('details');
  const [assigning, setAssigning] = useState(false);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    if (!instanceId || !state?.folderKey) return;
    getTaskDetails(instanceId, state.folderKey)
      .then(setTaskDetails)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [instanceId, state?.folderKey]);

  const handleAssign = async () => {
    if (!taskDetails || !instanceId || !state?.folderKey) return;
    setAssigning(true);
    try {
      await assignTask(taskDetails.taskId, taskDetails.folderId);
      // Update local state instead of re-fetching to avoid blank page
      const task = taskDetails.task as Record<string, unknown> | null;
      if (task) {
        setTaskDetails({
          ...taskDetails,
          task: { ...task, assignedToUser: taskDetails.currentUserEmail },
        });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Assignment failed');
    } finally {
      setAssigning(false);
    }
  };

  const handleComplete = async (action: 'Approve' | 'Reject', formData: Record<string, string>) => {
    if (!taskDetails) return;
    setCompleting(true);
    try {
      await completeTask(taskDetails.taskId, taskDetails.folderId, formData, action);
      navigate(-1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to complete task');
    } finally {
      setCompleting(false);
    }
  };

  const hasTask = taskDetails?.task != null;

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <a href="#" className="back-link" onClick={(e) => { e.preventDefault(); navigate(-1); }}>&larr; Back</a>
          <h1>{state?.caseId ?? 'HITL Task'}</h1>
        </div>
      </div>

      {loading && <p className="status-message">Loading task...</p>}
      {error && <p className="status-message error">Error: {error}</p>}

      {!loading && !error && hasTask && (
        <>
          <div className="tab-bar">
            <button
              className={`tab-button ${activeTab === 'details' ? 'active' : ''}`}
              onClick={() => setActiveTab('details')}
            >
              Task Details
            </button>
            <button
              className={`tab-button ${activeTab === 'view' ? 'active' : ''}`}
              onClick={() => setActiveTab('view')}
            >
              Task View
            </button>
          </div>

          {activeTab === 'details' && (
            <TaskDetailsTab
              taskDetails={taskDetails!}
              onAssign={handleAssign}
              assigning={assigning}
              onComplete={handleComplete}
              completing={completing}
            />
          )}

          {activeTab === 'view' && (
            taskDetails!.externalLink ? (
              <div className="hitl-iframe-container">
                <iframe src={taskDetails!.externalLink} title="HITL Task" />
              </div>
            ) : (
              <p className="no-tasks-message">No task link available</p>
            )
          )}
        </>
      )}

      {!loading && !error && !hasTask && (
        <p className="no-tasks-message">No Human in the Loop Tasks found</p>
      )}
    </div>
  );
}
