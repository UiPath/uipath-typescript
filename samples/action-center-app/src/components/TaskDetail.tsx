import { useState } from 'react'
import { TaskStatus, TaskUserType, TaskAssignmentCriteria } from '@uipath/uipath-typescript/tasks'
import type { TaskGetResponse, TaskAssignOptions } from '@uipath/uipath-typescript/tasks'
import { UiPathError } from '@uipath/uipath-typescript/core'
import { useTask, useTaskUsers } from '../hooks/useTasks'
import {
  statusBadge,
  priorityBadge,
  slaBadge,
  formatDateTime,
  taskTypeLabel,
  buildCompleteOptions,
} from '../taskUtils'
import { Modal } from './Modal'

const BTN_PRIMARY =
  'rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50'
const BTN_OUTLINE =
  'rounded-md border px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50'
const BTN_DANGER =
  'rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50'

interface Props {
  taskId: number
  folderId: number
  onClose: () => void
  /** Called after a mutation so the parent list can refresh. */
  onChanged: () => void
}

type Sub = 'assign' | 'reassign' | 'complete' | null

/**
 * Detail modal for one task (via `Tasks.getById`) plus the lifecycle actions.
 * Assign / reassign / complete open small inline forms; unassign runs inline.
 * All mutations use the task-attached methods on the fetched task.
 */
export function TaskDetail({ taskId, folderId, onClose, onChanged }: Props) {
  const { task, loading, error, reload } = useTask(taskId, folderId)
  const [sub, setSub] = useState<Sub>(null)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const afterChange = () => {
    reload()
    onChanged()
  }

  const handleUnassign = async () => {
    if (!task) return
    setBusy(true)
    setActionError(null)
    try {
      const result = await task.unassign()
      if (result.success) afterChange()
      else setActionError('Unassign did not complete successfully')
    } catch (err) {
      setActionError(err instanceof UiPathError ? err.message : 'Unassign failed')
    } finally {
      setBusy(false)
    }
  }

  const isCompleted = task?.isCompleted || task?.status === TaskStatus.Completed
  const hasAssignee = !!task?.assignedToUser

  return (
    <>
      <Modal title={task?.title ?? `Task #${taskId}`} onClose={onClose}>
        {loading ? (
          <p className="py-6 text-center text-sm text-gray-500">Loading task…</p>
        ) : error ? (
          <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>
        ) : task ? (
          <div className="space-y-5 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className={statusBadge(task.status).className}>
                {statusBadge(task.status).label}
              </span>
              <span className={priorityBadge(task.priority).className}>
                {priorityBadge(task.priority).label}
              </span>
              <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                {taskTypeLabel(task.type)}
              </span>
              {slaBadge(task.taskSlaDetail?.status) && (
                <span className={slaBadge(task.taskSlaDetail?.status)!.className}>
                  SLA: {slaBadge(task.taskSlaDetail?.status)!.label}
                </span>
              )}
            </div>

            <dl className="grid grid-cols-[7rem_1fr] gap-x-4 gap-y-1.5">
              <Field label="Assignee" value={task.assignedToUser?.displayName ?? 'Unassigned'} />
              <Field label="Created" value={formatDateTime(task.createdTime)} />
              {task.completedTime && (
                <Field label="Completed" value={formatDateTime(task.completedTime)} />
              )}
              {task.externalTag && <Field label="External tag" value={task.externalTag} mono />}
              <Field label="Key" value={task.key} mono />
            </dl>

            {task.tags && task.tags.length > 0 && (
              <Section title="Tags">
                <div className="flex flex-wrap gap-1.5">
                  {task.tags.map((t) => (
                    <span
                      key={t.name}
                      className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
                    >
                      {t.displayName || t.name}
                      {t.displayValue ? `: ${t.displayValue}` : ''}
                    </span>
                  ))}
                </div>
              </Section>
            )}

            {task.data && Object.keys(task.data).length > 0 && (
              <Section title="Data">
                <dl className="grid grid-cols-[10rem_1fr] gap-x-4 gap-y-1 rounded-lg border bg-gray-50 p-3">
                  {Object.entries(task.data).map(([k, v]) => (
                    <div key={k} className="contents">
                      <dt className="truncate text-xs text-gray-500" title={k}>
                        {k}
                      </dt>
                      <dd className="min-w-0 break-words text-xs">{renderValue(v)}</dd>
                    </div>
                  ))}
                </dl>
              </Section>
            )}

            {task.activities && task.activities.length > 0 && (
              <Section title="Activity">
                <ul className="space-y-1.5">
                  {task.activities.map((a, i) => (
                    <li key={`${a.taskId}-${i}`} className="flex items-center justify-between gap-2">
                      <span>{a.activityType}</span>
                      <span className="shrink-0 text-xs text-gray-500">
                        {formatDateTime(a.createdTime)}
                      </span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {actionError && (
              <p className="rounded-md bg-red-50 p-2 text-sm text-red-700">{actionError}</p>
            )}

            {!isCompleted && (
              <div className="flex flex-wrap gap-2 border-t pt-4">
                {!hasAssignee && (
                  <button className={BTN_PRIMARY} onClick={() => setSub('assign')}>
                    Assign
                  </button>
                )}
                {hasAssignee && (
                  <button className={BTN_OUTLINE} onClick={() => setSub('reassign')}>
                    Reassign
                  </button>
                )}
                {hasAssignee && (
                  <button className={BTN_OUTLINE} onClick={handleUnassign} disabled={busy}>
                    {busy ? 'Unassigning…' : 'Unassign'}
                  </button>
                )}
                <button className={BTN_OUTLINE} onClick={() => setSub('complete')}>
                  Complete
                </button>
              </div>
            )}
          </div>
        ) : null}
      </Modal>

      {task && (sub === 'assign' || sub === 'reassign') && (
        <AssignForm
          task={task}
          folderId={folderId}
          mode={sub}
          onClose={() => setSub(null)}
          onDone={afterChange}
        />
      )}
      {task && sub === 'complete' && (
        <CompleteForm task={task} onClose={() => setSub(null)} onDone={afterChange} />
      )}
    </>
  )
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="contents">
      <dt className="text-gray-500">{label}</dt>
      <dd className={`min-w-0 break-words ${mono ? 'font-mono text-xs' : ''}`}>{value}</dd>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</h4>
      {children}
    </div>
  )
}

function renderValue(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch {
      return String(value)
    }
  }
  return String(value)
}

/** Inline assign / reassign form — user list from `Tasks.getUsers(folderId)`. */
function AssignForm({
  task,
  folderId,
  mode,
  onClose,
  onDone,
}: {
  task: TaskGetResponse
  folderId: number
  mode: 'assign' | 'reassign'
  onClose: () => void
  onDone: () => void
}) {
  const { users, loading, error } = useTaskUsers(folderId)
  const [userId, setUserId] = useState('')
  const [busy, setBusy] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const submit = async () => {
    const id = Number(userId)
    if (!Number.isFinite(id) || id <= 0) return
    const selected = users.find((u) => u.id === id)
    // Assigning to a directory group needs an assignment criteria so the
    // backend knows how to distribute the task across the group's members; a
    // direct (single-user) assignment omits it.
    const opts: TaskAssignOptions =
      selected?.type === TaskUserType.DirectoryGroup
        ? { userId: id, assignmentCriteria: TaskAssignmentCriteria.AllUsers }
        : { userId: id }
    setBusy(true)
    setSubmitError(null)
    try {
      const result = mode === 'reassign' ? await task.reassign(opts) : await task.assign(opts)
      if (result.success) {
        onDone()
        onClose()
      } else {
        setSubmitError('The assignment did not complete successfully')
      }
    } catch (err) {
      setSubmitError(err instanceof UiPathError ? err.message : 'Assignment failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title={mode === 'reassign' ? 'Reassign task' : 'Assign task'} onClose={onClose}>
      <div className="space-y-3 text-sm">
        {loading ? (
          <p className="text-gray-500">Loading users…</p>
        ) : error ? (
          <p className="text-red-700">{error}</p>
        ) : users.length === 0 ? (
          <p className="text-gray-500">No assignable users found in this folder.</p>
        ) : (
          <label className="block">
            <span className="text-gray-500">Assign to</span>
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="mt-1 w-full rounded-md border px-2 py-2"
            >
              <option value="">Select a user…</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.displayName || u.userName}
                  {u.emailAddress ? ` — ${u.emailAddress}` : ` (${u.type})`}
                </option>
              ))}
            </select>
          </label>
        )}
        {submitError && <p className="text-red-700">{submitError}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button className={BTN_OUTLINE} onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className={BTN_PRIMARY} onClick={submit} disabled={!userId || busy}>
            {busy ? 'Saving…' : mode === 'reassign' ? 'Reassign' : 'Assign'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

/** Inline complete form — builds the right `complete()` options for the type. */
function CompleteForm({
  task,
  onClose,
  onDone,
}: {
  task: TaskGetResponse
  onClose: () => void
  onDone: () => void
}) {
  const [action, setAction] = useState(task.action || 'Approve')
  const [busy, setBusy] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const complete = async (value: string) => {
    const v = value.trim()
    if (!v) return
    setBusy(true)
    setSubmitError(null)
    try {
      const result = await task.complete(buildCompleteOptions(task.type, v))
      if (result.success) {
        onDone()
        onClose()
      } else {
        setSubmitError('The task did not complete successfully')
      }
    } catch (err) {
      setSubmitError(err instanceof UiPathError ? err.message : 'Completion failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title="Complete task" onClose={onClose}>
      <div className="space-y-3 text-sm">
        <label className="block">
          <span className="text-gray-500">Action</span>
          <input
            type="text"
            value={action}
            onChange={(e) => setAction(e.target.value)}
            placeholder="e.g. Approve"
            className="mt-1 w-full rounded-md border px-2 py-2"
          />
        </label>
        <p className="text-xs text-gray-500">
          The action maps to the outcome the workflow expects. Use Reject, or type a custom action
          and choose Complete.
        </p>
        {submitError && <p className="text-red-700">{submitError}</p>}
        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <button className={BTN_OUTLINE} onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className={BTN_DANGER} onClick={() => complete('Reject')} disabled={busy}>
            Reject
          </button>
          <button className={BTN_PRIMARY} onClick={() => complete(action)} disabled={busy || !action.trim()}>
            {busy ? 'Completing…' : `Complete (${action.trim() || '—'})`}
          </button>
        </div>
      </div>
    </Modal>
  )
}
