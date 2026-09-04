import { useEffect, useState } from 'react'
import { ChevronDown, ChevronRight, ExternalLink } from 'lucide-react'
import { TaskStatus, TaskUserType, TaskAssignmentCriteria } from '@uipath/uipath-typescript/tasks'
import type { TaskGetResponse, TaskAssignOptions } from '@uipath/uipath-typescript/tasks'
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
import { Skeleton } from '@uipath/apollo-wind/components/ui/skeleton'
import { Spinner } from '@uipath/apollo-wind/components/ui/spinner'
import { toast } from '@uipath/apollo-wind/components/ui/sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@uipath/apollo-wind/components/ui/tabs'
import { useAuth } from '../context/AuthContext'
import { useFolders, useTask, useTaskUsers } from '../hooks/useTasks'
import {
  assignedToGroup,
  statusBadge,
  priorityBadge,
  slaBadge,
  formatDateTime,
  taskTypeLabel,
  extractServerMessage,
} from '../taskUtils'
import { buildCompletion, loadTaskForm, saveTaskDraft } from '../taskSchema'
import type { TaskFormBundle, TaskFormOutcome } from '../taskSchema'
import { buildEmbedTaskUrl, buildTaskUrl } from '../taskUrl'
import { TaskForm, ValueView } from './TaskForm'

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

/**
 * Resolves the schema + values bundle for the task (see ../taskSchema.ts).
 * Re-runs whenever the task object changes, i.e. after every `useTask` reload.
 */
function useTaskForm(task: TaskGetResponse | null) {
  const { sdk } = useAuth()
  const [bundle, setBundle] = useState<TaskFormBundle | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!task) {
      setBundle(null)
      return
    }
    let alive = true
    setLoading(true)
    loadTaskForm(sdk, task)
      .then((b) => {
        if (alive) setBundle(b)
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [sdk, task])

  return { bundle, loading }
}

/**
 * Task detail sheet. Three tabs:
 *
 *  - **Form** (default) — a native form built from the task's schema. App tasks
 *    (coded and low-code action apps) get theirs from `GetAppTaskByKey`, Quick
 *    Form tasks from `TaskSchemas/GetByKey`. Outcomes complete the task via the
 *    task-attached `complete()`; **Save draft** uses `Tasks.saveData`. Tasks
 *    without a schema fall back to a key/value view and the free-text Complete.
 *  - **Details** — Action Center's task summary (ids, folder, assignee, labels).
 *  - **Action Center** — the task embedded from Action Center itself.
 */
export function TaskDetail({ taskId, folderId, isManage, onClose, onChanged, onValidate }: Props) {
  const { sdk } = useAuth()
  const { task, loading, error, reload } = useTask(taskId, folderId)
  const { bundle, loading: formLoading } = useTaskForm(task)
  const { folders } = useFolders()
  const [sub, setSub] = useState<Sub>(null)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [embedLoaded, setEmbedLoaded] = useState(false)
  const [showRaw, setShowRaw] = useState(false)

  // Resolve folder display name; fall back to id.
  const folderPath =
    folders.find((f) => f.id === folderId)?.fullyQualifiedName ?? String(folderId)

  const taskUrl = buildTaskUrl(taskId, sdk.config)
  const embedUrl = buildEmbedTaskUrl(taskId, sdk.config)

  const afterChange = () => {
    reload()
    onChanged()
  }

  const run = async (fn: () => Promise<void>, failure: string) => {
    setBusy(true)
    setActionError(null)
    try {
      await fn()
    } catch (err) {
      setActionError(extractServerMessage(err) ?? failure)
    } finally {
      setBusy(false)
    }
  }

  const handleUnassign = () =>
    run(async () => {
      if (!task) return
      const result = await task.unassign()
      if (result.success) afterChange()
      else setActionError('Unassign did not complete successfully')
    }, 'Unassign failed')

  /** Schema-driven completion: the outcome button is the action string. */
  const submitForm = (outcome: TaskFormOutcome, data: Record<string, unknown>) =>
    run(async () => {
      if (!task) return
      const result = await task.complete(buildCompletion(task, outcome.key, data))
      if (result.success) {
        toast.success(`Task completed — ${outcome.label}`)
        onChanged()
        onClose()
      } else {
        setActionError('The task did not complete successfully')
      }
    }, 'Completion failed')

  const saveDraft = (data: Record<string, unknown>) =>
    run(async () => {
      if (!task) return
      await saveTaskDraft(sdk, task, data)
      toast.success('Draft saved')
      afterChange()
    }, 'Saving the draft failed')

  const isCompleted = task?.isCompleted || task?.status === TaskStatus.Completed
  const hasAssignee = !!task?.assignedToUser
  const hasSchema = !!bundle?.model
  // With no schema the bundle only echoes whatever `data` the caller's task
  // object had — which is empty for a list summary. Prefer the full task from
  // `getById`, and fall back to the bundle only when that has nothing.
  const fallbackData = (Object.keys(task?.data ?? {}).length ? task?.data : bundle?.data) ?? {}

  return (
    <>
      <Sheet open onOpenChange={(open) => !open && onClose()}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl">
          <SheetHeader className="border-b px-6 py-4 text-left">
            <SheetTitle className="min-w-0 break-words pr-8">
              {task?.title ?? `Task #${taskId}`}
            </SheetTitle>
            {task && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <Badge variant={statusBadge(task.status).variant}>
                  {statusBadge(task.status).label}
                </Badge>
                <Badge variant={priorityBadge(task.priority).variant}>
                  {priorityBadge(task.priority).label}
                </Badge>
                <Badge variant="secondary">{taskTypeLabel(task.type)}</Badge>
                {bundle?.model?.appType && (
                  <Badge variant="outline">
                    {bundle.model.appType === 'Coded' ? 'Coded app' : 'Low-code app'}
                  </Badge>
                )}
                {(() => {
                  const sla = slaBadge(task.taskSlaDetail?.status)
                  return sla && <Badge variant={sla.variant}>SLA: {sla.label}</Badge>
                })()}
              </div>
            )}
          </SheetHeader>

          {/* Only block on the very first load — a reload after an action must not
              unmount the tabs and throw the reviewer back to the default one. */}
          {loading && !task ? (
            <div className="flex flex-1 items-center justify-center py-6">
              <Spinner label="Loading task…" showLabel />
            </div>
          ) : error && !task ? (
            <div className="p-6">
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </div>
          ) : task ? (
            <Tabs defaultValue="form" className="flex min-h-0 flex-1 flex-col">
              <div className="flex items-center justify-between gap-2 border-b px-6 pt-2">
                <TabsList>
                  <TabsTrigger value="form">Form</TabsTrigger>
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="embed">Action Center</TabsTrigger>
                </TabsList>
                <a
                  href={taskUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  Open in Action Center <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              {/* Native, schema-driven rendering */}
              <TabsContent value="form" className="mt-0 min-h-0 flex-1 overflow-y-auto px-6 py-4 text-sm">
                {formLoading || !bundle ? (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="space-y-1.5">
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-5 w-full" />
                      </div>
                    ))}
                  </div>
                ) : bundle.model ? (
                  <>
                    <TaskForm
                      key={`${task.id}:${task.lastModifiedTime ?? ''}`}
                      model={bundle.model}
                      initialData={bundle.data}
                      readOnly={!!isCompleted}
                      busy={busy}
                      error={actionError}
                      onSubmit={submitForm}
                      onSave={isCompleted ? undefined : saveDraft}
                    />
                    <div className="mt-5 border-t pt-3">
                      <button
                        onClick={() => setShowRaw((s) => !s)}
                        className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                      >
                        {showRaw ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                        {bundle.model.source === 'quick-form' ? 'Quick Form' : 'Action app'} schema (raw)
                      </button>
                      {showRaw && (
                        <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted/60 p-3 font-mono text-[11px] leading-relaxed">
                          {JSON.stringify(bundle.model.raw, null, 2)}
                        </pre>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    {bundle.reason === 'error' && (
                      <Alert variant="destructive">
                        <AlertDescription>
                          Could not load the task schema — showing raw values instead. {bundle.error}
                        </AlertDescription>
                      </Alert>
                    )}
                    {bundle.reason === 'no-schema' && (
                      <p className="text-xs text-muted-foreground">
                        Action Center returned no schema for this task, so its values are shown as stored. For app
                        tasks this usually means the token lacks the <span className="font-medium">Apps.Read</span> scope.
                      </p>
                    )}
                    {bundle.reason === 'empty-schema' && (
                      <p className="text-xs text-muted-foreground">
                        Action Center returned an empty schema for this task — the app version it points at declares
                        no fields or outcomes — so its values are shown as stored.
                      </p>
                    )}
                    {bundle.reason === 'unsupported-type' && (
                      <p className="text-xs text-muted-foreground">
                        {taskTypeLabel(task.type)} tasks carry no form schema; their data is shown as stored.
                      </p>
                    )}
                    {Object.keys(fallbackData).length > 0 ? (
                      <dl className="grid grid-cols-[10rem_1fr] gap-x-4 gap-y-1.5 rounded-lg border bg-muted/40 p-3">
                        {Object.entries(fallbackData).map(([k, v]) => (
                          <div key={k} className="contents">
                            <dt className="truncate text-xs text-muted-foreground" title={k}>
                              {k}
                            </dt>
                            <dd className="min-w-0 break-words text-xs">
                              <ValueView kind="json" value={v} />
                            </dd>
                          </div>
                        ))}
                      </dl>
                    ) : (
                      <p className="text-sm text-muted-foreground">This task carries no data.</p>
                    )}
                    {!isCompleted && !onValidate && (
                      <p className="text-xs text-muted-foreground">
                        Use <span className="font-medium">Complete</span> below and type the action the workflow expects.
                      </p>
                    )}
                    {actionError && (
                      <Alert variant="destructive">
                        <AlertDescription>{actionError}</AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
              </TabsContent>

              {/* Task Summary — mirrors Action Center's right pane. */}
              <TabsContent value="details" className="mt-0 min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4 text-sm">
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
                      (assignedToGroup(task) ? 'Directory group' : 'Unassigned')
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

                {Object.keys(fallbackData).length > 0 && (
                  <Section title="Data">
                    <dl className="grid grid-cols-[10rem_1fr] gap-x-4 gap-y-1 rounded-lg border bg-muted/40 p-3">
                      {Object.entries(fallbackData).map(([k, v]) => (
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
              </TabsContent>

              {/* The same task as Action Center renders it, embedded */}
              <TabsContent value="embed" className="relative mt-0 min-h-0 flex-1 bg-muted/30">
                {!embedLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                    Loading task…
                  </div>
                )}
                <iframe
                  src={embedUrl}
                  title={task.title}
                  className="h-full min-h-[420px] w-full border-0"
                  onLoad={() => setEmbedLoaded(true)}
                />
              </TabsContent>
            </Tabs>
          ) : null}

          {task && !isCompleted && (
            <SheetFooter className="flex-wrap gap-2 border-t px-6 py-4">
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
                // Schema-driven tasks complete through their outcome buttons in the Form tab.
                !hasSchema &&
                !formLoading && (
                  <Button variant="outline" onClick={() => setSub('complete')}>
                    Complete
                  </Button>
                )
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
        <CompleteForm
          task={task}
          data={fallbackData as Record<string, unknown>}
          onClose={() => setSub(null)}
          onDone={afterChange}
        />
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
          ) : error && !task ? (
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

/**
 * Free-text complete — the fallback for tasks without a schema (External,
 * legacy Form). Builds the right `complete()` options for the type.
 */
function CompleteForm({
  task,
  data,
  onClose,
  onDone,
}: {
  task: TaskGetResponse
  /** The task's current data — sent back untouched so completion never blanks it. */
  data: Record<string, unknown>
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
      const result = await task.complete(buildCompletion(task, v, data))
      if (result.success) {
        toast.success('Task completed')
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
