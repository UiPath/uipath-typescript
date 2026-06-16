import { useEffect, useMemo, useState } from 'react'
import {
  Check,
  ChevronRight,
  ChevronsUpDown,
  Inbox,
  Info,
  Plus,
  RefreshCw,
  Repeat2,
  User,
  UserMinus,
  UserPlus,
  Users,
} from 'lucide-react'
import {
  Tasks,
  TaskAssignmentCriteria,
  TaskPriority,
  TaskStatus,
  TaskType,
  TaskUserType,
} from '@uipath/uipath-typescript/tasks'
import type {
  TaskAssignmentOptions,
  TaskAssignmentResponse,
  TaskGetResponse,
} from '@uipath/uipath-typescript/tasks'
import { UiPathError } from '@uipath/uipath-typescript/core'
import { Alert, AlertDescription } from '@uipath/apollo-wind/components/ui/alert'
import { Badge } from '@uipath/apollo-wind/components/ui/badge'
import { Button } from '@uipath/apollo-wind/components/ui/button'
import { Checkbox } from '@uipath/apollo-wind/components/ui/checkbox'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@uipath/apollo-wind/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@uipath/apollo-wind/components/ui/popover'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@uipath/apollo-wind/components/ui/dialog'
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
import { toast } from '@uipath/apollo-wind/components/ui/sonner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@uipath/apollo-wind/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@uipath/apollo-wind/components/ui/tabs'
import { useAuth } from '../context/AuthContext'
import { useFolders, useTasks, useTaskUsers } from '../hooks/useTasks'
import {
  buildCompleteOptions,
  formatDateTime,
  priorityBadge,
  slaBadge,
  statusBadge,
  taskTypeLabel,
} from '../taskUtils'
import { TaskDetail } from './TaskDetail'
import { DocumentValidationDialog } from './DocumentValidationDialog'

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
const FOLDER_STORAGE_KEY = 'action-center-app.folderId'

/**
 * Tasks table. My Tasks: row click → Complete dialog (+ info → detail sheet).
 * Manage Tasks: rows are multi-selectable; bulk actions appear in toolbar.
 */
export function TaskList() {
  // Persist folder filter across refreshes and OAuth round-trip.
  const [folderId, setFolderId] = useState<number | null>(() => {
    const stored = localStorage.getItem(FOLDER_STORAGE_KEY)
    const parsed = stored ? Number(stored) : NaN
    return Number.isFinite(parsed) ? parsed : null
  })
  useEffect(() => {
    if (folderId == null) localStorage.removeItem(FOLDER_STORAGE_KEY)
    else localStorage.setItem(FOLDER_STORAGE_KEY, String(folderId))
  }, [folderId])

  const [status, setStatus] = useState<TaskStatus | 'all'>('all')
  const [priority, setPriority] = useState<TaskPriority | 'all'>('all')
  const [asTaskAdmin, setAsTaskAdmin] = useState(false)
  // Manage Tasks + status=Pending only.
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all')

  // Multi-select state for Manage Tasks (kept as a Set of taskIds).
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  // Dialog state.
  const [completeTask, setCompleteTask] = useState<TaskGetResponse | null>(null)
  const [detailTask, setDetailTask] = useState<TaskGetResponse | null>(null)
  // Document Validation tasks open the validation-station widget instead of
  // the generic Complete dialog.
  const [validationTask, setValidationTask] = useState<TaskGetResponse | null>(null)
  const [creating, setCreating] = useState(false)
  const [bulkAction, setBulkAction] = useState<'assign' | 'reassign' | null>(null)

  const { tasks, totalCount, page, totalPages, pageSize, loading, error, setPage, refresh } =
    useTasks(folderId, { status, priority }, PAGE_SIZE, asTaskAdmin)

  // Client-side narrowing — cross-folder endpoint has no clean OData filter for assignee.
  const visibleTasks = useMemo(() => {
    if (assigneeFilter === 'all') return tasks
    return tasks.filter((t) => {
      const u = t.assignedToUser
      if (!u) return false
      const key = u.id ? String(u.id) : u.userName || u.emailAddress || u.displayName
      return key === assigneeFilter
    })
  }, [tasks, assigneeFilter])

  // Clear selection when data shifts.
  useEffect(() => {
    setSelectedIds(new Set())
  }, [folderId, status, priority, asTaskAdmin, page])

  // Reset state that depends on tab when switching tabs.
  const switchTab = (next: boolean) => {
    setAsTaskAdmin(next)
    setSelectedIds(new Set())
    setAssigneeFilter('all')
  }

  const showAssigneeFilter = asTaskAdmin && status === TaskStatus.Pending
  const selectedTasks = useMemo(
    () => visibleTasks.filter((t) => selectedIds.has(t.id)),
    [visibleTasks, selectedIds],
  )

  const rangeStart = totalCount === 0 ? 0 : (page - 1) * pageSize + 1
  const rangeEnd = Math.min(page * pageSize, totalCount)

  const toggleSelectAll = () => {
    if (selectedIds.size === visibleTasks.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(visibleTasks.map((t) => t.id)))
  }
  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Tabs map to getAll's `asTaskAdmin`. */}
      <div className="border-b px-4 pt-2 sm:px-6">
        <Tabs value={asTaskAdmin ? 'manage' : 'my'} onValueChange={(v) => switchTab(v === 'manage')}>
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
              title="Tasks across folders where you can assign them (admin)"
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
        <FolderPicker value={folderId} onChange={setFolderId} />
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
        {showAssigneeFilter && (
          <AssigneeFilter
            tasks={tasks}
            value={assigneeFilter}
            onChange={setAssigneeFilter}
          />
        )}
        <div className="ml-auto flex items-center gap-2">
          {asTaskAdmin && selectedIds.size > 0 && (
            <BulkActions
              selectedTasks={selectedTasks}
              onAssign={() => setBulkAction('assign')}
              onReassign={() => setBulkAction('reassign')}
              onUnassigned={() => {
                setSelectedIds(new Set())
                refresh()
              }}
            />
          )}
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
          <TaskTableSkeleton showCheckbox={asTaskAdmin} />
        ) : visibleTasks.length === 0 ? (
          <EmptyState
            icon={<Inbox className="h-8 w-8 text-muted-foreground" />}
            title="No tasks"
            description={`No tasks match the current filters${
              folderId == null ? ' across your folders.' : ' in the selected folder.'
            }`}
          />
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  {asTaskAdmin && (
                    <TableHead className="w-[40px]">
                      <Checkbox
                        aria-label="Select all"
                        checked={
                          visibleTasks.length > 0 && selectedIds.size === visibleTasks.length
                        }
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                  )}
                  <TableHead className="w-[34%]">Title</TableHead>
                  <TableHead className="w-[10%]">Type</TableHead>
                  <TableHead className="w-[12%]">Status</TableHead>
                  <TableHead className="w-[10%]">Priority</TableHead>
                  <TableHead className="w-[14%]">Assignee</TableHead>
                  <TableHead className="w-[14%]">Created</TableHead>
                  <TableHead className="w-[40px]" aria-label={asTaskAdmin ? 'Details' : 'Open'} />
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleTasks.map((task) => {
                  const sla = slaBadge(task.taskSlaDetail?.status)
                  const sb = statusBadge(task.status)
                  const pb = priorityBadge(task.priority)
                  const isSelected = selectedIds.has(task.id)
                  return (
                    <TableRow
                      key={task.id}
                      data-state={isSelected ? 'selected' : undefined}
                      onClick={() => {
                        if (asTaskAdmin) toggleSelect(task.id)
                        else if (task.type === TaskType.DocumentValidation)
                          setValidationTask(task)
                        else setCompleteTask(task)
                      }}
                      className="cursor-pointer"
                    >
                      {asTaskAdmin && (
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            aria-label={`Select task ${task.title}`}
                            checked={isSelected}
                            onCheckedChange={() => toggleSelect(task.id)}
                          />
                        </TableCell>
                      )}
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
                        title={
                          task.assignedToUser?.displayName ??
                          (assignedToGroup(task) ? 'Assigned to a directory group' : '')
                        }
                      >
                        {task.assignedToUser?.displayName ?? (
                          assignedToGroup(task) ? (
                            <span className="inline-flex items-center gap-1 text-muted-foreground">
                              <Users className="h-3.5 w-3.5" aria-hidden />
                              Group
                            </span>
                          ) : (
                            <span className="text-muted-foreground/60">—</span>
                          )
                        )}
                      </TableCell>
                      <TableCell className="truncate text-muted-foreground">
                        {formatDateTime(task.createdTime)}
                      </TableCell>
                      <TableCell className="text-right">
                        {asTaskAdmin ? (
                          // Detail peek without losing row selection.
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Show task details"
                            title="Show task details"
                            className="h-7 w-7 text-muted-foreground"
                            onClick={(e) => {
                              e.stopPropagation()
                              setDetailTask(task)
                            }}
                          >
                            <Info className="h-4 w-4" />
                          </Button>
                        ) : (
                          <ChevronRight
                            className="ml-auto h-4 w-4 text-muted-foreground"
                            aria-hidden
                          />
                        )}
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

      {completeTask && (
        <CompleteDialog
          task={completeTask}
          onClose={() => setCompleteTask(null)}
          onDone={() => {
            setCompleteTask(null)
            refresh()
          }}
          onShowDetail={() => setDetailTask(completeTask)}
        />
      )}

      {detailTask && (
        <TaskDetail
          key={detailTask.id}
          taskId={detailTask.id}
          folderId={detailTask.folderId}
          isManage={asTaskAdmin}
          onClose={() => setDetailTask(null)}
          onChanged={refresh}
          onValidate={
            detailTask.type === TaskType.DocumentValidation
              ? () => {
                  const target = detailTask
                  setDetailTask(null)
                  setValidationTask(target)
                }
              : undefined
          }
        />
      )}

      {validationTask && (
        <DocumentValidationDialog
          key={validationTask.id}
          taskId={validationTask.id}
          folderId={validationTask.folderId}
          title={validationTask.title}
          onClose={() => setValidationTask(null)}
          onCompleted={() => {
            setValidationTask(null)
            refresh()
          }}
        />
      )}

      {bulkAction != null && selectedTasks.length > 0 && (
        <BulkAssignDialog
          tasks={selectedTasks}
          mode={bulkAction}
          onClose={() => setBulkAction(null)}
          onDone={() => {
            setBulkAction(null)
            setSelectedIds(new Set())
            refresh()
          }}
        />
      )}

      {creating && (
        <CreateForm onClose={() => setCreating(false)} onDone={refresh} />
      )}
    </div>
  )
}

/** Folder picker — direct Popover+Command (apollo-wind's Combobox filters by value=id). */
function FolderPicker({
  value,
  onChange,
}: {
  value: number | null
  onChange: (id: number | null) => void
}) {
  const { folders, loading, error } = useFolders()
  const [open, setOpen] = useState(false)

  const selectedLabel = useMemo(() => {
    if (value == null) return 'All folders'
    return folders.find((f) => f.id === value)?.fullyQualifiedName ?? `Folder ${value}`
  }, [folders, value])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Folder"
          disabled={loading || !!error}
          // Fixed width keeps toolbar stable as folders change.
          title={loading ? undefined : error ?? selectedLabel}
          className="h-9 w-56 shrink-0 justify-between gap-2 px-3 font-normal"
        >
          <span className="flex min-w-0 items-center gap-2">
            <span className="shrink-0 text-muted-foreground">Folder:</span>
            <span className="truncate">
              {loading ? 'Loading…' : error ? 'Unavailable' : selectedLabel}
            </span>
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-56 overflow-hidden p-0"
        align="start"
      >
        <Command>
          <CommandInput placeholder="Search folders…" />
          <CommandList>
            <CommandEmpty>No folders found</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="All folders"
                onSelect={() => {
                  onChange(null)
                  setOpen(false)
                }}
              >
                <span className="truncate">All folders</span>
                <Check
                  className={`ml-auto h-4 w-4 shrink-0 ${value == null ? 'opacity-100' : 'opacity-0'}`}
                />
              </CommandItem>
              {folders.map((f) => (
                <CommandItem
                  key={f.id}
                  value={f.fullyQualifiedName}
                  onSelect={() => {
                    onChange(f.id)
                    setOpen(false)
                  }}
                  title={f.fullyQualifiedName}
                >
                  <span className="truncate">{f.fullyQualifiedName}</span>
                  <Check
                    className={`ml-auto h-4 w-4 shrink-0 ${value === f.id ? 'opacity-100' : 'opacity-0'}`}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

/** Assignee picker — derived from loaded tasks (no folder needed, groups excluded). */
function AssigneeFilter({
  tasks,
  value,
  onChange,
}: {
  tasks: TaskGetResponse[]
  value: string
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)

  // Dedupe by id; fall back to userName/email when cross-folder response omits id.
  const assignees = useMemo(() => {
    const map = new Map<string, { key: string; displayName: string; emailAddress?: string }>()
    for (const t of tasks) {
      const u = t.assignedToUser
      if (!u) continue
      const display = u.displayName || u.userName || u.emailAddress
      if (!display) continue
      const key = u.id ? String(u.id) : u.userName || u.emailAddress || display
      if (!map.has(key)) {
        map.set(key, {
          key,
          displayName: display,
          emailAddress: u.emailAddress || undefined,
        })
      }
    }
    return Array.from(map.values()).sort((a, b) => a.displayName.localeCompare(b.displayName))
  }, [tasks])

  const selectedLabel = useMemo(() => {
    if (value === 'all') return 'Any assignee'
    const u = assignees.find((x) => x.key === value)
    return u ? u.displayName : value
  }, [assignees, value])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Assigned to"
          title={selectedLabel}
          className="h-9 w-56 shrink-0 justify-between gap-2 px-3 font-normal"
        >
          <span className="flex min-w-0 items-center gap-2">
            <span className="shrink-0 text-muted-foreground">Assignee:</span>
            <span className="truncate">{selectedLabel}</span>
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 overflow-hidden p-0" align="start">
        <Command>
          <CommandInput placeholder="Search users…" />
          <CommandList>
            <CommandEmpty>No assignees in the current view</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="Any assignee"
                onSelect={() => {
                  onChange('all')
                  setOpen(false)
                }}
              >
                <span className="truncate">Any assignee</span>
                <Check
                  className={`ml-auto h-4 w-4 shrink-0 ${value === 'all' ? 'opacity-100' : 'opacity-0'}`}
                />
              </CommandItem>
              {assignees.map((u) => (
                <CommandItem
                  key={u.key}
                  value={`${u.displayName} ${u.emailAddress ?? ''}`}
                  onSelect={() => {
                    onChange(u.key)
                    setOpen(false)
                  }}
                  title={u.emailAddress ? `${u.displayName} (${u.emailAddress})` : u.displayName}
                >
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate">{u.displayName}</span>
                    {u.emailAddress && (
                      <span className="truncate text-xs text-muted-foreground">
                        {u.emailAddress}
                      </span>
                    )}
                  </div>
                  <Check
                    className={`ml-auto h-4 w-4 shrink-0 ${value === u.key ? 'opacity-100' : 'opacity-0'}`}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

/**
 * Bulk actions on Manage Tasks. Enable/disable mirrors what the server
 * accepts: Assign needs all-unassigned, Reassign/Unassign need all-assigned,
 * completed tasks block everything.
 */
function BulkActions({
  selectedTasks,
  onAssign,
  onReassign,
  onUnassigned,
}: {
  selectedTasks: TaskGetResponse[]
  onAssign: () => void
  onReassign: () => void
  onUnassigned: () => void
}) {
  const { sdk } = useAuth()
  const [busy, setBusy] = useState(false)
  const count = selectedTasks.length

  const assignedCount = selectedTasks.filter(hasAssignee).length
  const completedCount = selectedTasks.filter(
    (t) => t.status === TaskStatus.Completed,
  ).length
  const hasCompleted = completedCount > 0
  const allUnassigned = assignedCount === 0
  const allAssigned = assignedCount === count
  // Completed tasks are terminal — server rejects any (re)assignment.
  const canAssign = !hasCompleted && allUnassigned
  const canReassignOrUnassign = !hasCompleted && allAssigned

  const handleUnassign = async () => {
    if (count === 0) return
    setBusy(true)
    try {
      // Array form — one round-trip instead of N.
      const svc = new Tasks(sdk)
      const result = await svc.unassign(selectedTasks.map((t) => t.id))
      if (result.success) {
        toast.success(`Unassigned ${count} ${count === 1 ? 'task' : 'tasks'}`)
        onUnassigned()
      } else {
        toast.error(formatAssignmentErrors(result.data))
      }
    } catch (err) {
      toast.error(err instanceof UiPathError ? err.message : 'Bulk unassign failed')
    } finally {
      setBusy(false)
    }
  }

  const completedTooltip =
    completedCount === count
      ? 'Completed tasks can’t be (re)assigned'
      : `Selection includes ${completedCount} completed ${completedCount === 1 ? 'task' : 'tasks'}`
  const assignTooltip = canAssign
    ? `Assign ${count} ${count === 1 ? 'task' : 'tasks'}`
    : hasCompleted
      ? completedTooltip
      : allAssigned
        ? 'Already assigned — use Reassign instead'
        : 'Selection mixes assigned and unassigned tasks'
  const reassignTooltip = canReassignOrUnassign
    ? `Reassign ${count} ${count === 1 ? 'task' : 'tasks'}`
    : hasCompleted
      ? completedTooltip
      : allUnassigned
        ? 'Nothing to reassign — these tasks are unassigned'
        : 'Selection mixes assigned and unassigned tasks'
  const unassignTooltip = canReassignOrUnassign
    ? `Unassign ${count} ${count === 1 ? 'task' : 'tasks'}`
    : hasCompleted
      ? completedTooltip
      : allUnassigned
        ? 'Nothing to unassign — these tasks are already unassigned'
        : 'Selection mixes assigned and unassigned tasks'

  return (
    <>
      <span className="hidden text-sm text-muted-foreground sm:inline">
        {count} selected
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={onAssign}
        disabled={busy || !canAssign}
        title={assignTooltip}
      >
        <UserPlus className="h-4 w-4" />
        Assign
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={onReassign}
        disabled={busy || !canReassignOrUnassign}
        title={reassignTooltip}
      >
        <Repeat2 className="h-4 w-4" />
        Reassign
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleUnassign}
        disabled={busy || !canReassignOrUnassign}
        title={unassignTooltip}
      >
        <UserMinus className="h-4 w-4" />
        {busy ? 'Unassigning…' : 'Unassign'}
      </Button>
    </>
  )
}

/** True when a task has any kind of current assignee (user or directory group). */
function hasAssignee(task: TaskGetResponse): boolean {
  if (task.assignedToUser) return true
  return assignedToGroup(task)
}

/** Quick-complete dialog opened from a My Tasks row click. */
function CompleteDialog({
  task,
  onClose,
  onDone,
  onShowDetail,
}: {
  task: TaskGetResponse
  onClose: () => void
  onDone: () => void
  onShowDetail: () => void
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
      // task.complete is bound on the row task (added by Tasks.getAll's transform).
      const result = await task.complete(buildCompleteOptions(task.type, v))
      if (result.success) {
        toast.success('Task completed')
        onDone()
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
          {/* Title left, info icon hugs the right edge of the body. DialogContent
              already pads itself, so the info icon sits just inside the modal
              with a small gap to the absolutely-positioned close X. */}
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="min-w-0 break-words pr-2">
              Complete: {task.title}
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onShowDetail}
              aria-label="Show task details"
              title="Show task details"
              className="-mr-1 h-7 w-7 shrink-0 text-muted-foreground"
            >
              <Info className="h-4 w-4" />
            </Button>
          </div>
          <DialogDescription>
            Type the action your workflow expects (e.g. <span className="font-medium">Approve</span> or <span className="font-medium">Reject</span>) and confirm. Tap the info icon for full task details.
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

        <DialogFooter className="flex-wrap gap-2">
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

/** Bulk-(re)assign dialog used on Manage Tasks when ≥1 task is selected. */
function BulkAssignDialog({
  tasks: targetTasks,
  mode,
  onClose,
  onDone,
}: {
  tasks: TaskGetResponse[]
  mode: 'assign' | 'reassign'
  onClose: () => void
  onDone: () => void
}) {
  const { sdk } = useAuth()
  // Folder for the user dropdown — fall back to the first selected task's folder.
  const folderId = targetTasks[0]?.folderId ?? null
  const { users, loading, error } = useTaskUsers(folderId)
  const [userId, setUserId] = useState('')
  const [busy, setBusy] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const submit = async () => {
    const id = Number(userId)
    if (!Number.isFinite(id) || id <= 0) return
    const selectedUser = users.find((u) => u.id === id)
    // Group target needs an assignmentCriteria; single-user assignment omits it.
    const payload: TaskAssignmentOptions[] = targetTasks.map((t) =>
      selectedUser?.type === TaskUserType.DirectoryGroup
        ? { taskId: t.id, userId: id, assignmentCriteria: TaskAssignmentCriteria.AllUsers }
        : { taskId: t.id, userId: id },
    )
    setBusy(true)
    setSubmitError(null)
    try {
      const svc = new Tasks(sdk)
      const result = mode === 'reassign' ? await svc.reassign(payload) : await svc.assign(payload)
      if (result.success) {
        const verb = mode === 'reassign' ? 'Reassigned' : 'Assigned'
        toast.success(`${verb} ${targetTasks.length} ${targetTasks.length === 1 ? 'task' : 'tasks'}`)
        onDone()
      } else {
        setSubmitError(formatAssignmentErrors(result.data))
      }
    } catch (err) {
      setSubmitError(
        err instanceof UiPathError ? err.message : `Bulk ${mode} failed`,
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'reassign' ? 'Reassign' : 'Assign'} {targetTasks.length}{' '}
            {targetTasks.length === 1 ? 'task' : 'tasks'}
          </DialogTitle>
          <DialogDescription>Pick a user or directory group to take ownership.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading users…</p>
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
              <Label htmlFor="bulk-assign-user">Assign to</Label>
              <Select value={userId} onValueChange={setUserId}>
                <SelectTrigger id="bulk-assign-user">
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
            {busy
              ? mode === 'reassign'
                ? 'Reassigning…'
                : 'Assigning…'
              : mode === 'reassign'
                ? 'Reassign'
                : 'Assign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Table skeleton — same columns so the layout doesn't jump. */
function TaskTableSkeleton({ rows = 8, showCheckbox = false }: { rows?: number; showCheckbox?: boolean }) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            {showCheckbox && <TableHead className="w-[40px]" />}
            <TableHead className="w-[34%]">Title</TableHead>
            <TableHead className="w-[10%]">Type</TableHead>
            <TableHead className="w-[12%]">Status</TableHead>
            <TableHead className="w-[10%]">Priority</TableHead>
            <TableHead className="w-[14%]">Assignee</TableHead>
            <TableHead className="w-[14%]">Created</TableHead>
            <TableHead className="w-[40px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }).map((_, i) => (
            <TableRow key={i}>
              {showCheckbox && (
                <TableCell>
                  <Skeleton className="h-4 w-4" />
                </TableCell>
              )}
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
              <TableCell>
                <Skeleton className="h-4 w-4 ml-auto" />
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

/** "Assigned to group" — `assignedToUserKey` set but no user object. */
function assignedToGroup(task: TaskGetResponse): boolean {
  if (task.assignedToUser) return false
  const key = (task as unknown as { assignedToUserKey?: string | null }).assignedToUserKey
  return !!key
}

/**
 * Pulls the server-supplied error string out of a thrown error.
 * Looks at common Orchestrator shapes: `err.message`, `err.body.message`,
 * `err.response.data.message` (e.g. `{ message, errorCode, traceId }`).
 */
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

/**
 * First distinct error from a failed (re)assign batch + count of additional
 * issues. "first + N more" is the standard compact pattern for batch errors;
 * the alert stays short, and the user still knows more failures exist.
 */
function formatAssignmentErrors(
  data: TaskAssignmentOptions[] | TaskAssignmentResponse[] | unknown,
): string {
  if (!Array.isArray(data) || data.length === 0) {
    return 'The assignment did not complete successfully'
  }
  const messages = Array.from(
    new Set(
      data
        .map((item) =>
          item && typeof item === 'object' && 'errorMessage' in item
            ? String((item as { errorMessage?: string }).errorMessage ?? '').trim()
            : '',
        )
        .filter((m) => m.length > 0),
    ),
  )
  if (messages.length === 0) {
    return 'The assignment did not complete successfully'
  }
  const [first, ...rest] = messages
  if (rest.length === 0) return first
  return `${first} (+${rest.length} other ${rest.length === 1 ? 'issue' : 'issues'})`
}

/** Folder picker for the Create dialog (full-width). */
function CreateFormFolderPicker({
  folders,
  value,
  onChange,
  loading,
  error,
}: {
  folders: { id: number; displayName: string; fullyQualifiedName: string }[]
  value: string
  onChange: (value: string) => void
  loading: boolean
  error: string | null
}) {
  const [open, setOpen] = useState(false)
  const selected = folders.find((f) => String(f.id) === value)
  const disabled = loading || !!error
  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="w-full justify-between gap-2"
          >
            <span className="truncate">
              {loading
                ? 'Loading folders…'
                : error
                  ? 'Folders unavailable'
                  : selected
                    ? selected.fullyQualifiedName
                    : 'Pick a folder'}
            </span>
            <ChevronsUpDown className="h-4 w-4 opacity-50" aria-hidden />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search folders…" />
            <CommandList>
              <CommandEmpty>No folders found</CommandEmpty>
              <CommandGroup>
                {folders.map((f) => (
                  <CommandItem
                    key={f.id}
                    value={f.fullyQualifiedName}
                    onSelect={() => {
                      onChange(String(f.id))
                      setOpen(false)
                    }}
                  >
                    {f.fullyQualifiedName}
                    <Check
                      className={`ml-auto h-4 w-4 ${value === String(f.id) ? 'opacity-100' : 'opacity-0'}`}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </>
  )
}

/** Create form. `Tasks.create` only makes External tasks; folder is required. */
function CreateForm({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const { sdk } = useAuth()
  const { folders, loading: foldersLoading, error: foldersError } = useFolders()
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState<TaskPriority>(TaskPriority.Medium)
  const [folderValue, setFolderValue] = useState<string>('')
  const [busy, setBusy] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const folderId = Number(folderValue)
  const folderValid = folderValue !== '' && Number.isFinite(folderId) && folderId > 0

  const submit = async () => {
    const trimmed = title.trim()
    if (!trimmed || !folderValid) return
    setBusy(true)
    setSubmitError(null)
    try {
      const svc = new Tasks(sdk)
      await svc.create({ title: trimmed, priority }, folderId)
      toast.success('Task created')
      onDone()
      onClose()
    } catch (err) {
      setSubmitError(extractServerMessage(err) ?? 'Failed to create task')
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
            <Label>Folder</Label>
            <CreateFormFolderPicker
              folders={folders}
              value={folderValue}
              onChange={setFolderValue}
              loading={foldersLoading}
              error={foldersError}
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
          <Button onClick={submit} disabled={!title.trim() || !folderValid || busy}>
            {busy ? 'Creating…' : 'Create task'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

