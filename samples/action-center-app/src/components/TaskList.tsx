import { useState } from 'react'
import { Tasks, TaskStatus, TaskPriority } from '@uipath/uipath-typescript/tasks'
import type { TaskGetResponse } from '@uipath/uipath-typescript/tasks'
import { UiPathError } from '@uipath/uipath-typescript/core'
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
import { Modal } from './Modal'

const BTN_PRIMARY =
  'rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50'
const BTN_OUTLINE =
  'rounded-md border px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50'

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
      <div className="flex items-center gap-1 border-b px-4 pt-2 sm:px-6">
        <TabButton
          active={!asTaskAdmin}
          onClick={() => setAsTaskAdmin(false)}
          title="Tasks in folders where you have view/edit access"
        >
          My Tasks
        </TabButton>
        <TabButton
          active={asTaskAdmin}
          onClick={() => setAsTaskAdmin(true)}
          title="Tasks across folders where you can assign them (admin) — enables group assignment"
        >
          Manage Tasks
        </TabButton>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3 sm:px-6">
        <FilterSelect label="Status" value={status} onChange={(v) => setStatus(v as TaskStatus | 'all')} options={STATUS_OPTIONS} />
        <FilterSelect label="Priority" value={priority} onChange={(v) => setPriority(v as TaskPriority | 'all')} options={PRIORITY_OPTIONS} />
        <div className="ml-auto flex items-center gap-2">
          <button className={BTN_OUTLINE} onClick={refresh} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
          <button className={BTN_PRIMARY} onClick={() => setCreating(true)}>
            Create task
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="min-h-0 flex-1 overflow-auto px-4 py-4 sm:px-6">
        {error ? (
          <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>
        ) : loading && tasks.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-500">Loading tasks…</p>
        ) : tasks.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-500">
            No tasks match the current filters
            {folderId == null ? ' across your folders.' : ` in folder ${folderId}.`}
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full table-fixed text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr className="border-b">
                  <th className="w-[36%] px-3 py-2 font-medium">Title</th>
                  <th className="w-[10%] px-3 py-2 font-medium">Type</th>
                  <th className="w-[12%] px-3 py-2 font-medium">Status</th>
                  <th className="w-[10%] px-3 py-2 font-medium">Priority</th>
                  <th className="w-[14%] px-3 py-2 font-medium">Assignee</th>
                  <th className="w-[18%] px-3 py-2 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => {
                  const sla = slaBadge(task.taskSlaDetail?.status)
                  return (
                    <tr
                      key={task.id}
                      onClick={() => setSelected(task)}
                      className="cursor-pointer border-b last:border-b-0 hover:bg-gray-50"
                    >
                      <td className="max-w-0 px-3 py-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="truncate font-medium" title={task.title}>
                            {task.title}
                          </span>
                          {sla && <span className={`shrink-0 ${sla.className}`}>{sla.label}</span>}
                        </div>
                      </td>
                      <td className="truncate px-3 py-2 text-gray-500">{taskTypeLabel(task.type)}</td>
                      <td className="px-3 py-2">
                        <span className={statusBadge(task.status).className}>
                          {statusBadge(task.status).label}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className={priorityBadge(task.priority).className}>
                          {priorityBadge(task.priority).label}
                        </span>
                      </td>
                      <td className="truncate px-3 py-2" title={task.assignedToUser?.displayName ?? ''}>
                        {task.assignedToUser?.displayName ?? <span className="text-gray-400">—</span>}
                      </td>
                      <td className="truncate px-3 py-2 text-gray-500">
                        {formatDateTime(task.createdTime)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalCount > 0 && (
        <div className="flex items-center justify-between gap-4 border-t px-4 py-3 text-sm sm:px-6">
          <span className="text-gray-500">
            Showing {rangeStart}–{rangeEnd} of {totalCount}
          </span>
          <div className="flex items-center gap-2">
            <button className={BTN_OUTLINE} onClick={() => setPage(page - 1)} disabled={page <= 1 || loading}>
              Prev
            </button>
            <span className="tabular-nums text-gray-500">
              Page {page} of {totalPages}
            </span>
            <button className={BTN_OUTLINE} onClick={() => setPage(page + 1)} disabled={page >= totalPages || loading}>
              Next
            </button>
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

function TabButton({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean
  onClick: () => void
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
        active
          ? 'border-blue-600 text-blue-700'
          : 'border-transparent text-gray-500 hover:text-gray-800'
      }`}
    >
      {children}
    </button>
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
    <label className="flex items-center gap-1.5 text-sm text-gray-600">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border px-2 py-1 text-sm"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o === 'all' ? 'All' : o}
          </option>
        ))}
      </select>
    </label>
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
    <Modal title="Create task" onClose={onClose}>
      <div className="space-y-3 text-sm">
        <p className="text-xs text-gray-500">
          Creates an external task. Form and app tasks are created by workflows, not the API.
        </p>
        <label className="block">
          <span className="text-gray-500">Title</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Review document"
            className="mt-1 w-full rounded-md border px-2 py-2"
          />
        </label>
        <label className="block">
          <span className="text-gray-500">Folder ID</span>
          <input
            type="number"
            inputMode="numeric"
            value={folderDraft}
            onChange={(e) => setFolderDraft(e.target.value)}
            placeholder="e.g. 1234567"
            className="mt-1 w-full rounded-md border px-2 py-2"
          />
        </label>
        <label className="block">
          <span className="text-gray-500">Priority</span>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as TaskPriority)}
            className="mt-1 w-full rounded-md border px-2 py-2"
          >
            {[TaskPriority.Low, TaskPriority.Medium, TaskPriority.High, TaskPriority.Critical].map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        {submitError && <p className="text-red-700">{submitError}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button className={BTN_OUTLINE} onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            className={BTN_PRIMARY}
            onClick={submit}
            disabled={!title.trim() || !folderValid || busy}
          >
            {busy ? 'Creating…' : 'Create task'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
