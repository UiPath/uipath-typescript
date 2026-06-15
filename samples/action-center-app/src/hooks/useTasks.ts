import { useCallback, useEffect, useState } from 'react'
import { Tasks, TaskUserType } from '@uipath/uipath-typescript/tasks'
import type {
  TaskGetResponse,
  UserLoginInfo,
} from '@uipath/uipath-typescript/tasks'
import { UiPathError } from '@uipath/uipath-typescript/core'
import { useAuth } from './useAuth'
import { buildTaskFilter } from '../taskUtils'
import type { TaskFilters } from '../taskUtils'

/**
 * Data hooks for the Action Center Tasks service. All three live in one file
 * to keep the sample small; each wraps one part of `TaskServiceModel`.
 */

// Human-assignable principals only — drop the robot / external-app accounts
// that Tasks.getUsers also returns.
const ASSIGNABLE_TYPES = new Set<TaskUserType>([
  TaskUserType.User,
  TaskUserType.DirectoryUser,
  TaskUserType.DirectoryGroup,
])

interface UseTasksResult {
  tasks: TaskGetResponse[]
  totalCount: number
  page: number
  totalPages: number
  pageSize: number
  loading: boolean
  error: string | null
  setPage: (page: number) => void
  /** Re-fetch the current page (e.g. after a mutation). */
  refresh: () => Promise<void>
}

/**
 * Lists tasks with server-side pagination + filtering. `folderId` is optional:
 * when omitted, `Tasks.getAll` returns tasks across every folder the user can
 * view/edit (the default manager view); when set, it scopes to that folder.
 *
 * `Tasks.getAll` is OFFSET-paginated, so it supports `jumpToPage` (page-number
 * navigation) and returns `totalCount` — both surfaced here so the table shows
 * real page controls rather than dumping every row in one scroll.
 */
export function useTasks(
  folderId: number | null,
  filters: TaskFilters,
  pageSize = 25,
  asTaskAdmin = false,
): UseTasksResult {
  const { sdk } = useAuth()
  const [tasks, setTasks] = useState<TaskGetResponse[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const filter = buildTaskFilter(filters)

  // On folder/filter/scope change, reset to page 1 and clear rows so the table
  // shows loading immediately instead of stale data.
  useEffect(() => {
    setPage(1)
    setTasks([])
    setTotalCount(0)
    setTotalPages(1)
  }, [folderId, filter, asTaskAdmin])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const svc = new Tasks(sdk)
      const result = await svc.getAll({
        pageSize,
        jumpToPage: page,
        // Raw server property name: $orderby runs server-side and only knows
        // `CreationTime` (the SDK alias `createdTime` would 400).
        orderby: 'CreationTime desc',
        ...(folderId != null ? { folderId } : {}),
        ...(filter ? { filter } : {}),
        ...(asTaskAdmin ? { asTaskAdmin: true } : {}),
      })
      setTasks(result.items)
      const count = result.totalCount ?? result.items.length
      setTotalCount(count)
      setTotalPages(result.totalPages ?? Math.max(1, Math.ceil(count / pageSize)))
    } catch (err) {
      setError(err instanceof UiPathError ? err.message : 'Failed to load tasks')
      setTasks([])
    } finally {
      setLoading(false)
    }
  }, [sdk, folderId, filter, page, pageSize, asTaskAdmin])

  useEffect(() => {
    load()
  }, [load])

  return { tasks, totalCount, page, totalPages, pageSize, loading, error, setPage, refresh: load }
}

interface UseTaskResult {
  task: TaskGetResponse | null
  loading: boolean
  error: string | null
  reload: () => Promise<void>
}

/**
 * Loads one task's full detail (activities, assignments, tags, data) via
 * `Tasks.getById(id, {}, folderId)`. The returned task carries bound methods
 * (`assign`/`reassign`/`unassign`/`complete`) that act on it directly.
 */
export function useTask(taskId: number | null, folderId: number | null): UseTaskResult {
  const { sdk } = useAuth()
  const [task, setTask] = useState<TaskGetResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (taskId == null) {
      setTask(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const svc = new Tasks(sdk)
      setTask(await svc.getById(taskId, {}, folderId ?? undefined))
    } catch (err) {
      setError(err instanceof UiPathError ? err.message : 'Failed to load task')
      setTask(null)
    } finally {
      setLoading(false)
    }
  }, [sdk, taskId, folderId])

  useEffect(() => {
    reload()
  }, [reload])

  return { task, loading, error, reload }
}

interface UseTaskUsersResult {
  users: UserLoginInfo[]
  loading: boolean
  error: string | null
}

/**
 * Lists the human users who can be assigned tasks in a folder via
 * `Tasks.getUsers(folderId)`. Each call returns one server-capped page, so we
 * loop the cursor to fetch every user, then keep only real people.
 */
export function useTaskUsers(folderId: number | null): UseTaskUsersResult {
  const { sdk } = useAuth()
  const [users, setUsers] = useState<UserLoginInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (folderId == null) {
      setUsers([])
      return
    }
    setLoading(true)
    setError(null)
    try {
      const svc = new Tasks(sdk)
      const all: UserLoginInfo[] = []
      let pageResult = await svc.getUsers(folderId, { pageSize: 100 })
      all.push(...pageResult.items)
      while (pageResult.hasNextPage && pageResult.nextCursor) {
        pageResult = await svc.getUsers(folderId, { cursor: pageResult.nextCursor })
        all.push(...pageResult.items)
      }
      setUsers(all.filter((u) => ASSIGNABLE_TYPES.has(u.type)))
    } catch (err) {
      setError(err instanceof UiPathError ? err.message : 'Failed to load users')
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [sdk, folderId])

  useEffect(() => {
    load()
  }, [load])

  return { users, loading, error }
}
