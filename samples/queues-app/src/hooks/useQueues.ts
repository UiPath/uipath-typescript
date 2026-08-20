import { useCallback, useEffect, useState } from 'react'
import { Queues } from '@uipath/uipath-typescript/queues'
import type { QueueGetWithMethodsResponse } from '@uipath/uipath-typescript/queues'
import { UiPathError } from '@uipath/uipath-typescript/core'
import { useAuth } from '../context/AuthContext'

export interface UseQueuesResult {
  queues: QueueGetWithMethodsResponse[]
  loading: boolean
  error: string | null
  /** Re-fetch the queue list. Useful for a "Refresh" button. */
  refresh: () => Promise<void>
}

/**
 * Lists the queues the user can see — across all folders by default, or
 * scoped to one folder when `folderId` is given.
 *
 * SDK call: `Queues.getAllWithMethods()` — the successor of the deprecated
 * `getAll()`. It supports folder scoping (`folderId` / `folderKey` /
 * `folderPath`) and each returned queue comes with the operational methods
 * bound (`getAllItems`, `insertItem`, `startTransaction`,
 * `completeTransaction`), so the rest of the app never has to thread folder
 * scoping around.
 *
 * @example
 *   const { queues, loading, error, refresh } = useQueues()          // all folders
 *   const scoped = useQueues(756377)                                 // one folder
 */
export function useQueues(folderId?: number): UseQueuesResult {
  const { sdk } = useAuth()
  const [queues, setQueues] = useState<QueueGetWithMethodsResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Construct a service instance per call. The SDK keeps these cheap;
      // there's no shared client to manage. The instance is bound to the
      // authenticated `sdk` from useAuth().
      const queueService = new Queues(sdk)
      // Without pagination options this returns a `NonPaginatedResponse` —
      // every queue in one `items` array. Passing `folderId` switches the
      // request to the folder-scoped endpoint (also accepts `folderKey` /
      // `folderPath`).
      const response = await queueService.getAllWithMethods(
        folderId !== undefined ? { folderId } : undefined
      )
      setQueues(response.items)
    } catch (err) {
      setError(err instanceof UiPathError ? err.message : 'Failed to load queues')
    } finally {
      setLoading(false)
    }
  }, [sdk, folderId])

  useEffect(() => {
    load()
  }, [load])

  return { queues, loading, error, refresh: load }
}
