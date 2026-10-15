import { useCallback, useEffect, useState } from 'react'
import { Buckets } from '@uipath/uipath-typescript/buckets'
import type { BucketFile } from '@uipath/uipath-typescript/buckets'
import { UiPathError } from '@uipath/uipath-typescript/core'
import { useAuth } from '../context/AuthContext'
import { FILES_PAGE_SIZE } from '../lib/config'
import { escapeRegex } from '../lib/format'

export interface UseBucketFilesResult {
  files: BucketFile[]
  page: number
  totalCount: number | null
  hasNextPage: boolean
  loading: boolean
  error: string | null
  setPage: (page: number) => void
  refresh: () => Promise<void>
}

/**
 * One page of files in a bucket, optionally filtered by file name.
 *
 * SDK call: `Buckets.getFiles({ id }, { folderId, pageSize, jumpToPage, fileNameRegex })`
 * — a recursive listing with offset pagination, so pages can be addressed
 * directly by number.
 */
export function useBucketFiles(
  bucketId: number,
  folderId: number,
  search: string,
): UseBucketFilesResult {
  const { sdk } = useAuth()
  const [page, setPage] = useState(1)
  const [files, setFiles] = useState<BucketFile[]>([])
  const [totalCount, setTotalCount] = useState<number | null>(null)
  const [hasNextPage, setHasNextPage] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // A new search starts back at page 1.
  useEffect(() => {
    setPage(1)
  }, [search])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const term = search.trim()
      const response = await new Buckets(sdk).getFiles(
        { id: bucketId },
        {
          folderId,
          pageSize: FILES_PAGE_SIZE,
          jumpToPage: page,
          ...(term ? { fileNameRegex: `(?i).*${escapeRegex(term)}.*` } : {}),
        },
      )
      setFiles(response.items)
      setTotalCount(response.totalCount ?? null)
      setHasNextPage(response.hasNextPage)
    } catch (err) {
      console.error('Failed to load files:', err)
      setError(err instanceof UiPathError ? err.message : 'Failed to load files')
      setFiles([])
    } finally {
      setLoading(false)
    }
  }, [sdk, bucketId, folderId, page, search])

  useEffect(() => {
    load()
  }, [load])

  return { files, page, totalCount, hasNextPage, loading, error, setPage, refresh: load }
}
