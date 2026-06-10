import {
  TaskStatus,
  TaskPriority,
  TaskType,
  TaskSlaStatus,
} from '@uipath/uipath-typescript/tasks'
import type { TaskCompleteOptions } from '@uipath/uipath-typescript/tasks'

/**
 * Presentation + mapping helpers for Action Center tasks, kept out of the
 * components so the logic (badge colours, OData filter assembly, the
 * `complete()` discriminated-union builder) stays in one testable place.
 */

export interface Badge {
  label: string
  /** Tailwind classes for a small pill. */
  className: string
}

const PILL = 'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium'

export function statusBadge(status: TaskStatus): Badge {
  switch (status) {
    case TaskStatus.Completed:
      return { label: 'Completed', className: `${PILL} bg-green-100 text-green-700` }
    case TaskStatus.Pending:
      return { label: 'Pending', className: `${PILL} bg-blue-100 text-blue-700` }
    case TaskStatus.Unassigned:
      return { label: 'Unassigned', className: `${PILL} bg-gray-100 text-gray-600` }
    default:
      return { label: String(status), className: `${PILL} bg-gray-100 text-gray-600` }
  }
}

export function priorityBadge(priority: TaskPriority): Badge {
  switch (priority) {
    case TaskPriority.Critical:
      return { label: 'Critical', className: `${PILL} bg-red-100 text-red-700` }
    case TaskPriority.High:
      return { label: 'High', className: `${PILL} bg-amber-100 text-amber-700` }
    case TaskPriority.Medium:
      return { label: 'Medium', className: `${PILL} bg-blue-100 text-blue-700` }
    case TaskPriority.Low:
      return { label: 'Low', className: `${PILL} bg-gray-100 text-gray-600` }
    default:
      return { label: String(priority), className: `${PILL} bg-gray-100 text-gray-600` }
  }
}

export function slaBadge(status: TaskSlaStatus | undefined): Badge | null {
  switch (status) {
    case TaskSlaStatus.Overdue:
      return { label: 'Overdue', className: `${PILL} bg-red-100 text-red-700` }
    case TaskSlaStatus.OverdueSoon:
      return { label: 'Due soon', className: `${PILL} bg-amber-100 text-amber-700` }
    case TaskSlaStatus.OverdueLater:
      return { label: 'On track', className: `${PILL} bg-blue-100 text-blue-700` }
    case TaskSlaStatus.CompletedInTime:
      return { label: 'In time', className: `${PILL} bg-green-100 text-green-700` }
    default:
      return null
  }
}

export function taskTypeLabel(type: TaskType): string {
  switch (type) {
    case TaskType.Form:
      return 'Form'
    case TaskType.External:
      return 'External'
    case TaskType.App:
      return 'App'
    case TaskType.DocumentValidation:
      return 'Doc validation'
    case TaskType.DocumentClassification:
      return 'Doc classification'
    case TaskType.DataLabeling:
      return 'Data labeling'
    default:
      return String(type)
  }
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString()
}

export interface TaskFilters {
  status?: TaskStatus | 'all'
  priority?: TaskPriority | 'all'
}

/**
 * Builds an OData `$filter` string from the active filters, or `undefined`
 * when none are set. Field names use the API's PascalCase property names
 * (OData is case-insensitive server-side; matches the Action Center docs).
 */
export function buildTaskFilter(filters: TaskFilters): string | undefined {
  const clauses: string[] = []
  if (filters.status && filters.status !== 'all') clauses.push(`Status eq '${filters.status}'`)
  if (filters.priority && filters.priority !== 'all') clauses.push(`Priority eq '${filters.priority}'`)
  return clauses.length ? clauses.join(' and ') : undefined
}

/**
 * Builds `complete()` options for a task. `TaskCompleteOptions` is a
 * discriminated union on `type`: Form/App require `data` + `action`, while
 * External/document tasks accept them optionally. A `switch` narrows `type` to
 * a literal in each branch so the object matches exactly one union member —
 * passing a union-typed `type` directly would not type-check.
 */
export function buildCompleteOptions(type: TaskType, action: string): TaskCompleteOptions {
  switch (type) {
    case TaskType.Form:
      return { type: TaskType.Form, action, data: {} }
    case TaskType.App:
      return { type: TaskType.App, action, data: {} }
    case TaskType.DocumentValidation:
      return { type: TaskType.DocumentValidation, action }
    case TaskType.DocumentClassification:
      return { type: TaskType.DocumentClassification, action }
    case TaskType.DataLabeling:
      return { type: TaskType.DataLabeling, action }
    case TaskType.External:
    default:
      return { type: TaskType.External, action }
  }
}
