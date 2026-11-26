import { useEffect, useMemo, useState } from 'react'
import { ChevronRight, Inbox, Info, Plus, RefreshCw, User, Users } from 'lucide-react'
import { TaskPriority, TaskStatus, TaskType } from '@uipath/uipath-typescript/tasks'
import type { TaskGetResponse } from '@uipath/uipath-typescript/tasks'
import { Alert, AlertDescription } from '@uipath/apollo-wind/components/ui/alert'
import { Badge } from '@uipath/apollo-wind/components/ui/badge'
import { Button } from '@uipath/apollo-wind/components/ui/button'
import { Checkbox } from '@uipath/apollo-wind/components/ui/checkbox'
import { EmptyState } from '@uipath/apollo-wind/components/ui/empty-state'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@uipath/apollo-wind/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@uipath/apollo-wind/components/ui/tabs'
import { useTasks } from '../hooks/useTasks'
import {
  assignedToGroup,
  formatDateTime,
  priorityBadge,
  slaBadge,
  statusBadge,
  taskTypeLabel,
} from '../taskUtils'
import { TaskDetail } from './TaskDetail'
import { DocumentValidationDialog } from './DocumentValidationDialog'
import { FolderPicker } from './FolderPicker'
import { AssigneeFilter } from './AssigneeFilter'
import { BulkActions, BulkAssignDialog } from './BulkActions'
import { TaskTableSkeleton } from './TaskTableSkeleton'
import { FilterSelect } from './FilterSelect'
import { CreateForm } from './CreateForm'

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
  // Dialog state. My Tasks rows open the detail sheet, whose Form tab renders
  // the task from its schema (outcome buttons complete it).
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
                        else setDetailTask(task)
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
