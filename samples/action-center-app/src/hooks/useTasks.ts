import { useCallback, useEffect, useState } from 'react'
import { Tasks, TaskUserType } from '@uipath/uipath-typescript/tasks'
import type {
  TaskGetByIdOptions,
  TaskGetResponse,
  TaskType,
  UserLoginInfo,
} from '@uipath/uipath-typescript/tasks'
import { UiPathError } from '@uipath/uipath-typescript/core'
import { useAuth } from '../context/AuthContext'
import { buildTaskFilter } from '../taskUtils'
import type { TaskFilters } from '../taskUtils'

/** Hooks wrapping each method on `TaskServiceModel`, plus `useFolders`. */

// Human-assignable principals only.
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

/** Paginated, filterable list via `Tasks.getAll`. Folder is optional. */
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

  // Reset page + clear rows on dep change so loading shows immediately.
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
        // Raw server name — `createdTime` (SDK alias) would 400.
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
 * Full task detail via `Tasks.getById`. Returned task carries bound action
 * methods. Pass `taskType` to fetch the full type-specific payload — e.g.
 * `TaskType.DocumentValidation` returns the document-validation data the
 * validation-station widget renders.
 */
export function useTask(
  taskId: number | null,
  folderId: number | null,
  taskType?: TaskType,
): UseTaskResult {
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
      const options: TaskGetByIdOptions = taskType ? { taskType } : {}
      setTask(await svc.getById(taskId, options, folderId ?? undefined))
    } catch (err) {
      setError(err instanceof UiPathError ? err.message : 'Failed to load task')
      setTask(null)
    } finally {
      setLoading(false)
    }
  }, [sdk, taskId, folderId, taskType])

  useEffect(() => {
    reload()
  }, [reload])

  return { task, loading, error, reload }
}

interface UseFoldersResult {
  folders: FolderSummary[]
  loading: boolean
  error: string | null
}

/** Minimal projection of an Orchestrator Folder for the dropdown picker. */
export interface FolderSummary {
  id: number
  displayName: string
  fullyQualifiedName: string
}

/**
 * Lists folders via `/odata/Folders` (raw fetch — SDK has no Folders
 * service). May include folders the user can view but not act in;
 * downstream task ops surface the actual server error if so. Requires
 * `OR.Folders.Read`.
 */
export function useFolders(): UseFoldersResult {
  const { sdk } = useAuth()
  const [folders, setFolders] = useState<FolderSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const { baseUrl, orgName, tenantName } = sdk.config
        const token = sdk.getToken()
        if (!token) throw new Error('Not authenticated')
        const url =
          `${baseUrl}/${orgName}/${tenantName}/orchestrator_/odata/Folders` +
          `?$select=Id,DisplayName,FullyQualifiedName&$orderby=FullyQualifiedName`
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        })
        if (!res.ok) throw new Error(`Folders fetch failed: ${res.status} ${res.statusText}`)
        const body = (await res.json()) as {
          value: Array<{ Id: number; DisplayName: string; FullyQualifiedName: string }>
        }
        if (cancelled) return
        setFolders(
          body.value.map((f) => ({
            id: f.Id,
            displayName: f.DisplayName,
            fullyQualifiedName: f.FullyQualifiedName,
          })),
        )
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load folders')
        setFolders([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [sdk])

  return { folders, loading, error }
}

interface UseTaskUsersResult {
  users: UserLoginInfo[]
  loading: boolean
  error: string | null
}

/** All assignable users in a folder. Loops the cursor; drops robot/external accounts. */
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
