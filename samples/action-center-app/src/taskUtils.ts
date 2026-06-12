import { TaskStatus, TaskPriority, TaskType, TaskSlaStatus } from '@uipath/uipath-typescript/tasks'
import type { TaskCompleteOptions } from '@uipath/uipath-typescript/tasks'
import type { BadgeProps } from '@uipath/apollo-wind/components/ui/badge'

/**
 * Presentation + mapping helpers for Action Center tasks, kept out of the
 * components so the logic (badge variants, OData filter assembly, the
 * `complete()` discriminated-union builder) stays in one testable place.
 */

export interface Badge {
  label: string
  /** Apollo-wind Badge variant. */
  variant: NonNullable<BadgeProps['variant']>
}

export function statusBadge(status: TaskStatus): Badge {
  switch (status) {
    case TaskStatus.Completed:
      return { label: 'Completed', variant: 'success' }
    case TaskStatus.Pending:
      return { label: 'Pending', variant: 'info' }
    case TaskStatus.Unassigned:
      return { label: 'Unassigned', variant: 'secondary' }
    default:
      return { label: String(status), variant: 'secondary' }
  }
}

export function priorityBadge(priority: TaskPriority): Badge {
  switch (priority) {
    case TaskPriority.Critical:
      return { label: 'Critical', variant: 'error' }
    case TaskPriority.High:
      return { label: 'High', variant: 'warning' }
    case TaskPriority.Medium:
      return { label: 'Medium', variant: 'info' }
    case TaskPriority.Low:
      return { label: 'Low', variant: 'secondary' }
    default:
      return { label: String(priority), variant: 'secondary' }
  }
}

export function slaBadge(status: TaskSlaStatus | undefined): Badge | null {
  switch (status) {
    case TaskSlaStatus.Overdue:
      return { label: 'Overdue', variant: 'error' }
    case TaskSlaStatus.OverdueSoon:
      return { label: 'Due soon', variant: 'warning' }
    case TaskSlaStatus.OverdueLater:
      return { label: 'On track', variant: 'info' }
    case TaskSlaStatus.CompletedInTime:
      return { label: 'In time', variant: 'success' }
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
  if (filters.priority && filters.priority !== 'all')
    clauses.push(`Priority eq '${filters.priority}'`)
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
