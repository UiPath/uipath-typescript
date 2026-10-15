import { useCallback, useEffect, useState } from 'react'
import { Buckets } from '@uipath/uipath-typescript/buckets'
import type { BucketGetResponse } from '@uipath/uipath-typescript/buckets'
import type { PaginationCursor } from '@uipath/uipath-typescript/core'
import { UiPathError } from '@uipath/uipath-typescript/core'
import { useAuth } from '../context/AuthContext'

const BUCKETS_PAGE_SIZE = 100

export interface UseBucketsResult {
  buckets: BucketGetResponse[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

/**
 * Lists every storage bucket in one Orchestrator folder.
 *
 * SDK call: `Buckets.getAll({ folderId, pageSize })`. A single call returns
 * one page only, so this walks `nextCursor` until `hasNextPage` is false.
 */
export function useBuckets(folderId: number): UseBucketsResult {
  const { sdk } = useAuth()
  const [buckets, setBuckets] = useState<BucketGetResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const bucketService = new Buckets(sdk)
      const all: BucketGetResponse[] = []
      let cursor: PaginationCursor | undefined
      do {
        const page = cursor
          ? await bucketService.getAll({ folderId, cursor })
          : await bucketService.getAll({ folderId, pageSize: BUCKETS_PAGE_SIZE })
        all.push(...page.items)
        cursor = page.hasNextPage ? page.nextCursor : undefined
      } while (cursor)
      setBuckets(all.sort((a, b) => a.name.localeCompare(b.name)))
    } catch (err) {
      console.error('Failed to load buckets:', err)
      setError(err instanceof UiPathError ? err.message : 'Failed to load buckets')
    } finally {
      setLoading(false)
    }
  }, [sdk, folderId])

  useEffect(() => {
    load()
  }, [load])

  return { buckets, loading, error, refresh: load }
}
