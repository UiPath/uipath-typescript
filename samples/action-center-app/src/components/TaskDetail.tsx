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
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@uipath/apollo-wind/components/ui/sheet'
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
import { useFolders, useTask, useTaskUsers } from '../hooks/useTasks'
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
  /** Opened from Manage Tasks — gates the Assign/Reassign actions. */
  isManage: boolean
  onClose: () => void
  /** Called after a mutation so the parent list can refresh. */
  onChanged: () => void
  /**
   * Provided only for Document Validation tasks — opens the validation-station
   * widget. When set, a "Validate document" action replaces the generic Complete.
   */
  onValidate?: () => void
}

type Sub = 'assign' | 'reassign' | 'complete' | null

/** Task detail panel (Tasks.getById) with lifecycle actions via task-attached methods. */
export function TaskDetail({ taskId, folderId, isManage, onClose, onChanged, onValidate }: Props) {
  const { task, loading, error, reload } = useTask(taskId, folderId)
  const { folders } = useFolders()
  const [sub, setSub] = useState<Sub>(null)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  // Resolve folder display name; fall back to id.
  const folderPath =
    folders.find((f) => f.id === folderId)?.fullyQualifiedName ?? String(folderId)

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
      setActionError(extractServerMessage(err) ?? 'Unassign failed')
    } finally {
      setBusy(false)
    }
  }

  const isCompleted = task?.isCompleted || task?.status === TaskStatus.Completed
  const hasAssignee = !!task?.assignedToUser

  return (
    <>
      <Sheet open onOpenChange={(open) => !open && onClose()}>
        <SheetContent side="right" className="flex w-full flex-col sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="min-w-0 break-words pr-8">
              {task?.title ?? `Task #${taskId}`}
            </SheetTitle>
          </SheetHeader>

          {/* Scrollable body so the footer stays pinned regardless of content height. */}
          <div className="-mx-6 min-h-0 flex-1 overflow-y-auto px-6">
          {loading ? (
            <div className="flex justify-center py-6">
              <Spinner label="Loading task…" showLabel />
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : task ? (
            <div className="space-y-4 text-sm">
              <div className="flex flex-wrap items-center gap-1.5">
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

              {/* Task Summary — mirrors Action Center's right pane. */}
              <dl className="grid grid-cols-[7.5rem_1fr] gap-x-4 gap-y-1.5">
                <Field label="Task ID" value={`#${task.id}`} mono />
                {task.taskSource?.sourceName && (
                  <Field label="Source" value={task.taskSource.sourceName} />
                )}
                <Field label="Folder path" value={folderPath} />
                <Field label="Created on" value={formatDateTime(task.createdTime)} />
                {task.completedTime && (
                  <Field label="Completed" value={formatDateTime(task.completedTime)} />
                )}
                {task.completedByUser?.displayName && (
                  <Field label="Completed by" value={task.completedByUser.displayName} />
                )}
                {task.taskAssignmentCriteria && (
                  <Field label="Assignment criteria" value={task.taskAssignmentCriteria} />
                )}
                <Field
                  label="Assigned to"
                  value={
                    task.assignedToUser?.displayName ??
                    (assignedToGroupKey(task) ? 'Directory group' : 'Unassigned')
                  }
                />
                {(task.actionLabel || task.action) && (
                  <Field label="Action" value={task.actionLabel ?? task.action ?? ''} />
                )}
                {task.externalTag && <Field label="External tag" value={task.externalTag} mono />}
                <Field label="Key" value={task.key} mono />
              </dl>

              {task.tags && task.tags.length > 0 && (
                <Section title="Labels">
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

              {actionError && (
                <Alert variant="destructive">
                  <AlertDescription>{actionError}</AlertDescription>
                </Alert>
              )}
            </div>
          ) : null}
          </div>

          {task && !isCompleted && (
            <SheetFooter className="flex-wrap gap-2">
              {/* Assign/Reassign to others is a Manage Tasks action only. */}
              {isManage && !hasAssignee && (
                <Button onClick={() => setSub('assign')}>Assign</Button>
              )}
              {isManage && hasAssignee && (
                <Button variant="outline" onClick={() => setSub('reassign')}>
                  Reassign
                </Button>
              )}
              {hasAssignee && (
                <Button variant="outline" onClick={handleUnassign} disabled={busy}>
                  {busy ? 'Unassigning…' : 'Unassign'}
                </Button>
              )}
              {onValidate ? (
                <Button onClick={onValidate}>Validate document</Button>
              ) : (
                <Button variant="outline" onClick={() => setSub('complete')}>
                  Complete
                </Button>
              )}
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>

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

/** Assigned to a directory group (no user object, but a key). */
function assignedToGroupKey(task: TaskGetResponse): boolean {
  if (task.assignedToUser) return false
  const key = (task as unknown as { assignedToUserKey?: string | null }).assignedToUserKey
  return !!key
}

/** First server message from a failed assign payload. */
function extractAssignError(data: unknown): string {
  if (Array.isArray(data)) {
    for (const item of data) {
      if (item && typeof item === 'object' && 'errorMessage' in item) {
        const msg = String((item as { errorMessage?: string }).errorMessage ?? '').trim()
        if (msg) return msg
      }
    }
  }
  return 'The assignment did not complete successfully'
}

/** Server error string from a thrown UiPath/HTTP error. */
function extractServerMessage(err: unknown): string | null {
  if (!err) return null
  if (err instanceof UiPathError && err.message) return err.message
  const e = err as Record<string, unknown>
  const candidates = [
    e.message,
    (e.body as Record<string, unknown> | undefined)?.message,
    ((e.response as Record<string, unknown> | undefined)?.data as Record<string, unknown> | undefined)?.message,
  ]
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c.trim()
  }
  return null
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
    // Directory-group assignment needs a criteria to distribute across members;
    // single-user assignment omits it.
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
        // Server-supplied error (e.g. "Already assigned to another user").
        setSubmitError(extractAssignError(result.data))
      }
    } catch (err) {
      setSubmitError(extractServerMessage(err) ?? 'Assignment failed')
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
      setSubmitError(extractServerMessage(err) ?? 'Completion failed')
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
            Type the action your workflow expects (e.g. <span className="font-medium">Approve</span> or <span className="font-medium">Reject</span>) and confirm.
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
          <Button onClick={() => complete(action)} disabled={busy || !action.trim()}>
            {busy ? 'Completing…' : 'Complete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
