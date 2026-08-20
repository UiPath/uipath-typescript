import { useCallback, useEffect, useState } from 'react'
// Pagination types live on the root package; queue types on the subpath.
// Both are type-only imports, so this adds nothing to the bundle.
import type { PaginatedResponse, PaginationCursor } from '@uipath/uipath-typescript'
import type {
  QueueGetWithMethodsResponse,
  QueueItem,
  QueueItemStatus,
} from '@uipath/uipath-typescript/queues'
import { UiPathError } from '@uipath/uipath-typescript/core'

export const PAGE_SIZE = 10

export type StatusFilter = QueueItemStatus | 'All'

export interface UseQueueItemsResult {
  page: PaginatedResponse<QueueItem> | null
  loading: boolean
  error: string | null
  /** Reload the first page (used after inserts/completions — newest first). */
  refresh: () => Promise<void>
  nextPage: () => Promise<void>
  previousPage: () => Promise<void>
}

/**
 * Loads one page of a queue's items, newest first.
 *
 * SDK call: the bound `queue.getAllItems(options)` — the queue's own id and
 * folder are filled in automatically. Passing `pageSize` opts into the
 * paginated response shape (`items` + `totalCount` + next/previous cursors).
 * The status filter becomes an OData `filter` string; field names use the
 * SDK's camelCase (the SDK maps them to API names internally).
 */
export function useQueueItems(
  queue: QueueGetWithMethodsResponse,
  status: StatusFilter,
): UseQueueItemsResult {
  const [page, setPage] = useState<PaginatedResponse<QueueItem> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(
    async (cursor?: PaginationCursor) => {
      setLoading(true)
      setError(null)
      try {
        const response = await queue.getAllItems({
          pageSize: PAGE_SIZE,
          cursor,
          filter: status === 'All' ? undefined : `status eq '${status}'`,
          orderby: 'createdTime desc',
        })
        setPage(response)
      } catch (err) {
        setError(
          err instanceof UiPathError ? err.message : 'Failed to load queue items',
        )
      } finally {
        setLoading(false)
      }
    },
    [queue, status],
  )

  // First page on mount and whenever the status filter changes.
  useEffect(() => {
    load()
  }, [load])

  return {
    page,
    loading,
    error,
    refresh: () => load(),
    nextPage: () => load(page?.nextCursor),
    previousPage: () => load(page?.previousCursor),
  }
}
