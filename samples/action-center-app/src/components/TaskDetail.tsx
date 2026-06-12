import { useState } from 'react'
import { TaskStatus, TaskUserType, TaskAssignmentCriteria } from '@uipath/uipath-typescript/tasks'
import type { TaskGetResponse, TaskAssignOptions } from '@uipath/uipath-typescript/tasks'
import { UiPathError } from '@uipath/uipath-typescript/core'
import { Alert, AlertDescription } from '@uipath/apollo-wind/components/ui/alert'
import { Badge } from '@uipath/apollo-wind/components/ui/badge'
import { Button } from '@uipath/apollo-wind/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@uipath/apollo-wind/components/ui/dialog'
import { Input } from '@uipath/apollo-wind/components/ui/input'
import { Label } from '@uipath/apollo-wind/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@uipath/apollo-wind/components/ui/select'
import { Spinner } from '@uipath/apollo-wind/components/ui/spinner'
import { useTask, useTaskUsers } from '../hooks/useTasks'
import {
  statusBadge,
  priorityBadge,
  slaBadge,
  formatDateTime,
  taskTypeLabel,
  buildCompleteOptions,
} from '../taskUtils'

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
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="truncate">{task?.title ?? `Task #${taskId}`}</DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="flex justify-center py-6">
              <Spinner label="Loading task…" showLabel />
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : task ? (
            <div className="space-y-5 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={statusBadge(task.status).variant}>
                  {statusBadge(task.status).label}
                </Badge>
                <Badge variant={priorityBadge(task.priority).variant}>
                  {priorityBadge(task.priority).label}
                </Badge>
                <Badge variant="secondary">{taskTypeLabel(task.type)}</Badge>
                {slaBadge(task.taskSlaDetail?.status) && (
                  <Badge variant={slaBadge(task.taskSlaDetail?.status)!.variant}>
                    SLA: {slaBadge(task.taskSlaDetail?.status)!.label}
                  </Badge>
                )}
              </div>

              <dl className="grid grid-cols-[7rem_1fr] gap-x-4 gap-y-1.5">
                <Field
                  label="Assignee"
                  value={task.assignedToUser?.displayName ?? 'Unassigned'}
                />
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
                      <Badge key={t.name} variant="secondary">
                        {t.displayName || t.name}
                        {t.displayValue ? `: ${t.displayValue}` : ''}
                      </Badge>
                    ))}
                  </div>
                </Section>
              )}

              {task.data && Object.keys(task.data).length > 0 && (
                <Section title="Data">
                  <dl className="grid grid-cols-[10rem_1fr] gap-x-4 gap-y-1 rounded-lg border bg-muted/40 p-3">
                    {Object.entries(task.data).map(([k, v]) => (
                      <div key={k} className="contents">
                        <dt className="truncate text-xs text-muted-foreground" title={k}>
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
                      <li
                        key={`${a.taskId}-${i}`}
                        className="flex items-center justify-between gap-2"
                      >
                        <span>{a.activityType}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {formatDateTime(a.createdTime)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {actionError && (
                <Alert variant="destructive">
                  <AlertDescription>{actionError}</AlertDescription>
                </Alert>
              )}
            </div>
          ) : null}

          {task && !isCompleted && (
            <DialogFooter className="flex-wrap">
              {!hasAssignee && <Button onClick={() => setSub('assign')}>Assign</Button>}
              {hasAssignee && (
                <Button variant="outline" onClick={() => setSub('reassign')}>
                  Reassign
                </Button>
              )}
              {hasAssignee && (
                <Button variant="outline" onClick={handleUnassign} disabled={busy}>
                  {busy ? 'Unassigning…' : 'Unassign'}
                </Button>
              )}
              <Button variant="outline" onClick={() => setSub('complete')}>
                Complete
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

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
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={`min-w-0 break-words ${mono ? 'font-mono text-xs' : ''}`}>{value}</dd>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h4>
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
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === 'reassign' ? 'Reassign task' : 'Assign task'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-4">
              <Spinner label="Loading users…" showLabel />
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : users.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No assignable users found in this folder.
            </p>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="assign-user">Assign to</Label>
              <Select value={userId} onValueChange={setUserId}>
                <SelectTrigger id="assign-user">
                  <SelectValue placeholder="Select a user…" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.displayName || u.userName}
                      {u.emailAddress ? ` — ${u.emailAddress}` : ` (${u.type})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {submitError && (
            <Alert variant="destructive">
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!userId || busy}>
            {busy ? 'Saving…' : mode === 'reassign' ? 'Reassign' : 'Assign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Complete task</DialogTitle>
          <DialogDescription>
            The action maps to the outcome the workflow expects. Use Reject, or type a custom
            action and choose Complete.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="complete-action">Action</Label>
            <Input
              id="complete-action"
              type="text"
              value={action}
              onChange={(e) => setAction(e.target.value)}
              placeholder="e.g. Approve"
            />
          </div>
          {submitError && (
            <Alert variant="destructive">
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="flex-wrap">
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={() => complete('Reject')} disabled={busy}>
            Reject
          </Button>
          <Button onClick={() => complete(action)} disabled={busy || !action.trim()}>
            {busy ? 'Completing…' : `Complete (${action.trim() || '—'})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
