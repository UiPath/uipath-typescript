import { useState } from 'react'
import { Inbox, Plus, RefreshCw, User, Users } from 'lucide-react'
import { Tasks, TaskStatus, TaskPriority } from '@uipath/uipath-typescript/tasks'
import type { TaskGetResponse } from '@uipath/uipath-typescript/tasks'
import { UiPathError } from '@uipath/uipath-typescript/core'
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
import { Alert, AlertDescription } from '@uipath/apollo-wind/components/ui/alert'
import { EmptyState } from '@uipath/apollo-wind/components/ui/empty-state'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@uipath/apollo-wind/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@uipath/apollo-wind/components/ui/tabs'
import { useAuth } from '../hooks/useAuth'
import { useTasks } from '../hooks/useTasks'
import {
  statusBadge,
  priorityBadge,
  slaBadge,
  formatDateTime,
  taskTypeLabel,
} from '../taskUtils'
import { TaskDetail } from './TaskDetail'

const STATUS_OPTIONS: Array<TaskStatus | 'all'> = [
  'all',
  TaskStatus.Unassigned,
  TaskStatus.Pending,
  TaskStatus.Completed,
]
const PRIORITY_OPTIONS: Array<TaskPriority | 'all'> = [
  'all',
  TaskPriority.Low,
  TaskPriority.Medium,
  TaskPriority.High,
  TaskPriority.Critical,
]

const PAGE_SIZE = 25

interface Props {
  /** Optional folder filter; null lists tasks across all visible folders. */
  folderId: number | null
}

/**
 * Paginated, filterable table of tasks. Owns selection (opens the detail
 * modal) and the create flow. Server-side pagination keeps the DOM small and
 * lets the user navigate by page.
 */
export function TaskList({ folderId }: Props) {
  const [status, setStatus] = useState<TaskStatus | 'all'>('all')
  const [priority, setPriority] = useState<TaskPriority | 'all'>('all')
  // Mirrors Action Center's My Tasks / Manage Tasks split via getAll's
  // `asTaskAdmin` flag — "Manage" lists tasks the user can assign (the context
  // where group assignment applies).
  const [asTaskAdmin, setAsTaskAdmin] = useState(false)
  const [selected, setSelected] = useState<TaskGetResponse | null>(null)
  const [creating, setCreating] = useState(false)

  const { tasks, totalCount, page, totalPages, pageSize, loading, error, setPage, refresh } =
    useTasks(folderId, { status, priority }, PAGE_SIZE, asTaskAdmin)

  const rangeStart = totalCount === 0 ? 0 : (page - 1) * pageSize + 1
  const rangeEnd = Math.min(page * pageSize, totalCount)

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Tabs — map to getAll({ asTaskAdmin }) */}
      <div className="border-b px-4 pt-2 sm:px-6">
        <Tabs
          value={asTaskAdmin ? 'manage' : 'my'}
          onValueChange={(v) => setAsTaskAdmin(v === 'manage')}
        >
          <TabsList>
            <TabsTrigger
              value="my"
              title="Tasks in folders where you have view/edit access"
              className="gap-2"
            >
              <User className="h-4 w-4" />
              My Tasks
              {!asTaskAdmin && totalCount > 0 && (
                <Badge variant="secondary" className="ml-1 tabular-nums">
                  {totalCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="manage"
              title="Tasks across folders where you can assign them (admin) — enables group assignment"
              className="gap-2"
            >
              <Users className="h-4 w-4" />
              Manage Tasks
              {asTaskAdmin && totalCount > 0 && (
                <Badge variant="secondary" className="ml-1 tabular-nums">
                  {totalCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3 sm:px-6">
        <FilterSelect
          label="Status"
          value={status}
          onChange={(v) => setStatus(v as TaskStatus | 'all')}
          options={STATUS_OPTIONS}
        />
        <FilterSelect
          label="Priority"
          value={priority}
          onChange={(v) => setPriority(v as TaskPriority | 'all')}
          options={PRIORITY_OPTIONS}
        />
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" onClick={refresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Refreshing…' : 'Refresh'}
          </Button>
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" />
            Create task
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="min-h-0 flex-1 overflow-auto px-4 py-4 sm:px-6">
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : loading && tasks.length === 0 ? (
          <TaskTableSkeleton />
        ) : tasks.length === 0 ? (
          <EmptyState
            icon={<Inbox className="h-8 w-8 text-muted-foreground" />}
            title="No tasks"
            description={`No tasks match the current filters${
              folderId == null ? ' across your folders.' : ` in folder ${folderId}.`
            }`}
          />
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[36%]">Title</TableHead>
                  <TableHead className="w-[10%]">Type</TableHead>
                  <TableHead className="w-[12%]">Status</TableHead>
                  <TableHead className="w-[10%]">Priority</TableHead>
                  <TableHead className="w-[14%]">Assignee</TableHead>
                  <TableHead className="w-[18%]">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task) => {
                  const sla = slaBadge(task.taskSlaDetail?.status)
                  const sb = statusBadge(task.status)
                  const pb = priorityBadge(task.priority)
                  return (
                    <TableRow
                      key={task.id}
                      onClick={() => setSelected(task)}
                      className="cursor-pointer"
                    >
                      <TableCell className="max-w-0">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="truncate font-medium" title={task.title}>
                            {task.title}
                          </span>
                          {sla && (
                            <Badge variant={sla.variant} className="shrink-0">
                              {sla.label}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="truncate text-muted-foreground">
                        {taskTypeLabel(task.type)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={sb.variant}>{sb.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={pb.variant}>{pb.label}</Badge>
                      </TableCell>
                      <TableCell
                        className="truncate"
                        title={task.assignedToUser?.displayName ?? ''}
                      >
                        {task.assignedToUser?.displayName ?? (
                          <span className="text-muted-foreground/60">—</span>
                        )}
                      </TableCell>
                      <TableCell className="truncate text-muted-foreground">
                        {formatDateTime(task.createdTime)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalCount > 0 && (
        <div className="flex items-center justify-between gap-4 border-t px-4 py-3 text-sm sm:px-6">
          <span className="text-muted-foreground">
            Showing {rangeStart}–{rangeEnd} of {totalCount}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page - 1)}
              disabled={page <= 1 || loading}
            >
              Prev
            </Button>
            <span className="tabular-nums text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages || loading}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {selected && (
        <TaskDetail
          key={selected.id}
          taskId={selected.id}
          folderId={selected.folderId}
          onClose={() => setSelected(null)}
          onChanged={refresh}
        />
      )}
      {creating && (
        <CreateForm
          defaultFolderId={folderId}
          onClose={() => setCreating(false)}
          onDone={refresh}
        />
      )}
    </div>
  )
}

/**
 * Skeleton placeholder for the task table. Mirrors the real table's column
 * layout so the page doesn't jump on load — the industry-standard pattern
 * for data-grids (Linear, Notion, Vercel, Stripe all do this).
 */
function TaskTableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[36%]">Title</TableHead>
            <TableHead className="w-[10%]">Type</TableHead>
            <TableHead className="w-[12%]">Status</TableHead>
            <TableHead className="w-[10%]">Priority</TableHead>
            <TableHead className="w-[14%]">Assignee</TableHead>
            <TableHead className="w-[18%]">Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }).map((_, i) => (
            <TableRow key={i}>
              <TableCell>
                <Skeleton className="h-4 w-3/4" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-12" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-5 w-16 rounded-full" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-5 w-14 rounded-full" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-24" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-32" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: readonly string[]
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-auto gap-2 px-3" aria-label={label}>
        <span className="text-muted-foreground">{label}:</span>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {o === 'all' ? 'All' : o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/**
 * Inline create form — `Tasks.create` only supports External tasks and needs a
 * target folder, so a Folder ID field is always shown (prefilled from the
 * header filter when one is set).
 */
function CreateForm({
  defaultFolderId,
  onClose,
  onDone,
}: {
  defaultFolderId: number | null
  onClose: () => void
  onDone: () => void
}) {
  const { sdk } = useAuth()
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState<TaskPriority>(TaskPriority.Medium)
  const [folderDraft, setFolderDraft] = useState(defaultFolderId?.toString() ?? '')
  const [busy, setBusy] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const folderId = Number(folderDraft)
  const folderValid = folderDraft.trim() !== '' && Number.isFinite(folderId) && folderId > 0

  const submit = async () => {
    const trimmed = title.trim()
    if (!trimmed || !folderValid) return
    setBusy(true)
    setSubmitError(null)
    try {
      const svc = new Tasks(sdk)
      await svc.create({ title: trimmed, priority }, folderId)
      onDone()
      onClose()
    } catch (err) {
      setSubmitError(err instanceof UiPathError ? err.message : 'Failed to create task')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create task</DialogTitle>
          <DialogDescription>
            Creates an external task. Form and app tasks are created by workflows, not the API.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="create-title">Title</Label>
            <Input
              id="create-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Review document"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="create-folder">Folder ID</Label>
            <Input
              id="create-folder"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              value={folderDraft}
              onChange={(e) => setFolderDraft(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="e.g. 1234567"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="create-priority">Priority</Label>
            <Select
              value={priority}
              onValueChange={(v) => setPriority(v as TaskPriority)}
            >
              <SelectTrigger id="create-priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[TaskPriority.Low, TaskPriority.Medium, TaskPriority.High, TaskPriority.Critical].map(
                  (p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>
          {submitError && <p className="text-sm text-destructive">{submitError}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!title.trim() || !folderValid || busy}>
            {busy ? 'Creating…' : 'Create task'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
