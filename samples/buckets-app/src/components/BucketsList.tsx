import { useMemo, useState } from 'react'
import { Archive, Lock, RefreshCw, Search } from 'lucide-react'
import type { BucketGetResponse } from '@uipath/uipath-typescript/buckets'
import { BucketOptions } from '@uipath/uipath-typescript/buckets'
import { useBuckets } from '../hooks/useBuckets'
import { Button } from '@uipath/apollo-wind/components/ui/button'
import { Input } from '@uipath/apollo-wind/components/ui/input'
import { Alert, AlertDescription } from '@uipath/apollo-wind/components/ui/alert'
import { Skeleton } from '@uipath/apollo-wind/components/ui/skeleton'

interface Props {
  folderId: number
  selectedBucketId: number | null
  onSelectBucket: (bucket: BucketGetResponse) => void
}

/** Sidebar listing every bucket in the folder, with a client-side name filter. */
export function BucketsList({ folderId, selectedBucketId, onSelectBucket }: Props) {
  const { buckets, loading, error, refresh } = useBuckets(folderId)
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return buckets
    return buckets.filter(
      (b) =>
        b.name.toLowerCase().includes(term) ||
        (b.description ?? '').toLowerCase().includes(term),
    )
  }, [buckets, search])

  return (
    <aside className="w-72 shrink-0 border-r bg-background flex flex-col min-h-0">
      <div className="p-3 border-b space-y-2.5 shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">
            Buckets
            {!loading && (
              <span className="ml-1.5 text-muted-foreground font-normal">{filtered.length}</span>
            )}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={refresh}
            disabled={loading}
            aria-label="Refresh buckets"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <div className="relative">
          <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter buckets"
            className="h-8 pl-8 text-sm"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 p-2">
        {error && (
          <Alert variant="destructive" className="m-1">
            <AlertDescription className="break-words">{error}</AlertDescription>
          </Alert>
        )}
        {loading && !error && (
          <div className="space-y-2 p-1">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        )}
        {!loading && !error && filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8 px-4">
            {buckets.length === 0 ? 'No buckets in this folder.' : 'No buckets match your filter.'}
          </p>
        )}
        {!loading &&
          filtered.map((bucket) => {
            const selected = bucket.id === selectedBucketId
            return (
              <button
                key={bucket.id}
                type="button"
                onClick={() => onSelectBucket(bucket)}
                className={`w-full text-left rounded-md px-2.5 py-2 mb-0.5 flex items-start gap-2.5 transition-colors ${
                  selected ? 'bg-primary/10 text-foreground' : 'hover:bg-muted'
                }`}
              >
                <Archive
                  className={`h-4 w-4 mt-0.5 shrink-0 ${selected ? 'text-primary' : 'text-muted-foreground'}`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-sm font-medium truncate" title={bucket.name}>
                      {bucket.name}
                    </span>
                    {bucket.options === BucketOptions.ReadOnly && (
                      <Lock className="h-3 w-3 text-muted-foreground shrink-0" aria-label="Read-only" />
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground truncate" title={bucket.description ?? undefined}>
                    {bucket.description || bucket.storageProvider || 'Orchestrator'}
                  </div>
                </div>
              </button>
            )
          })}
      </div>
    </aside>
  )
}
