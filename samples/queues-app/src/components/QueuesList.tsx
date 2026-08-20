import { useEffect, useMemo, useState } from 'react'
import { Folder, Inbox, RefreshCw, Search } from 'lucide-react'
import { Queues } from '@uipath/uipath-typescript/queues'
import type { QueueGetWithMethodsResponse } from '@uipath/uipath-typescript/queues'
import { UiPathError } from '@uipath/uipath-typescript/core'
import { toast } from '@uipath/apollo-wind/components/ui/sonner'
import { useAuth } from '../context/AuthContext'
import { useQueues } from '../hooks/useQueues'
import { Button } from '@uipath/apollo-wind/components/ui/button'
import { Combobox } from '@uipath/apollo-wind/components/ui/combobox'
import { Input } from '@uipath/apollo-wind/components/ui/input'
import { Alert, AlertDescription } from '@uipath/apollo-wind/components/ui/alert'
import { Skeleton } from '@uipath/apollo-wind/components/ui/skeleton'

interface Props {
  selectedQueueId: number | null
  onSelectQueue: (queue: QueueGetWithMethodsResponse) => void
}

const GUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Sidebar listing the queues visible to the signed-in user.
 *
 * - `Queues.getAllWithMethods()` — across all folders by default; picking a
 *   folder in the dropdown re-fetches with `{ folderId }` (folder scoping).
 * - Typing filters the loaded list client-side (by name, key, or folder);
 *   pressing Enter looks the term up on the server instead — `getByKey` when
 *   it's a GUID, otherwise `getByName`. Server lookups are folder-scoped, so
 *   they need a folder selected.
 */
export function QueuesList({ selectedQueueId, onSelectQueue }: Props) {
  const { sdk } = useAuth()
  const [folderScope, setFolderScope] = useState<'all' | number>('all')
  const { queues, loading, error, refresh } = useQueues(
    folderScope === 'all' ? undefined : folderScope,
  )
  const [search, setSearch] = useState('')
  const [lookingUp, setLookingUp] = useState(false)

  // Folder choices accumulate from every fetch (each queue carries its own
  // folderId), so scoping to one folder doesn't shrink the choices to that
  // folder alone.
  const [folders, setFolders] = useState<number[]>([])
  useEffect(() => {
    setFolders((prev) => {
      const merged = new Set(prev)
      let changed = false
      for (const q of queues) {
        if (!merged.has(q.folderId)) {
          merged.add(q.folderId)
          changed = true
        }
      }
      return changed ? [...merged].sort((a, b) => a - b) : prev
    })
  }, [queues])

  // Combobox values are the bare folder ids so its search box matches typed
  // digits directly.
  const folderItems = useMemo(
    () => [
      { value: 'all', label: 'All folders' },
      ...folders.map((id) => ({ value: String(id), label: `Folder ${id}` })),
    ],
    [folders],
  )

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return queues
    // Matches name, key, and folder so a pasted GUID narrows the list the
    // same way a name does. `folderName` can come back null from the
    // across-folders listing, so guard before lowercasing.
    return queues.filter(
      (q) =>
        q.name.toLowerCase().includes(term) ||
        q.key.toLowerCase().includes(term) ||
        (q.folderName ?? '').toLowerCase().includes(term),
    )
  }, [queues, search])

  /**
   * Server-side lookup: `getByKey` for GUIDs, `getByName` otherwise. Both
   * return the queue with methods attached, so the result can be selected
   * directly.
   */
  const handleLookup = async () => {
    const term = search.trim()
    if (!term || lookingUp) return
    if (folderScope === 'all') {
      toast.info('Pick a folder first — getByName/getByKey are folder-scoped lookups.')
      return
    }
    const byKey = GUID_REGEX.test(term)
    setLookingUp(true)
    try {
      const queueService = new Queues(sdk)
      const queue = byKey
        ? await queueService.getByKey(term, { folderId: folderScope })
        : await queueService.getByName(term, { folderId: folderScope })
      toast.success(`Resolved via ${byKey ? 'getByKey' : 'getByName'}: ${queue.name}`)
      onSelectQueue(queue)
    } catch (err) {
      toast.error(err instanceof UiPathError ? err.message : 'Lookup failed')
    } finally {
      setLookingUp(false)
    }
  }

  return (
    <aside className="w-72 shrink-0 border-r bg-background flex flex-col min-h-0">
      <div className="p-3 border-b space-y-2.5 shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">
            Queues
            {!loading && (
              <span className="ml-1.5 text-muted-foreground font-normal">
                {filtered.length}
              </span>
            )}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={refresh}
            disabled={loading}
            aria-label="Refresh queues"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <Combobox
          items={folderItems}
          value={folderScope === 'all' ? 'all' : String(folderScope)}
          onValueChange={(v) => setFolderScope(!v || v === 'all' ? 'all' : Number(v))}
          searchPlaceholder="Type a folder id…"
          emptyText="No folder matches."
          className="h-8 w-full text-sm font-normal"
        />
        <div className="relative">
          <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleLookup()
            }}
            placeholder="Filter — Enter looks up name/key"
            className="h-8 pl-8 text-sm"
            disabled={lookingUp}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {error ? (
          <Alert variant="destructive" className="m-1">
            <AlertDescription>
              {error}
              <Button variant="outline" size="sm" className="mt-2 w-full" onClick={refresh}>
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        ) : loading ? (
          <div className="space-y-2 p-1">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full rounded-md" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center p-6">
            <Inbox className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              {queues.length === 0 ? 'No queues in this scope.' : 'Nothing loaded matches this text.'}
            </p>
            {queues.length > 0 && search.trim() !== '' && (
              <p className="text-xs text-muted-foreground mt-1.5">
                Press Enter to look it up on the server instead —{' '}
                <code>getByKey</code> for a GUID, <code>getByName</code> otherwise.
              </p>
            )}
          </div>
        ) : (
          <ul className="space-y-0.5">
            {filtered.map((queue) => {
              const selected = queue.id === selectedQueueId
              return (
                <li key={queue.id}>
                  <button
                    onClick={() => onSelectQueue(queue)}
                    className={`w-full text-left rounded-md px-2.5 py-2 transition-colors ${
                      selected
                        ? 'bg-primary/10 text-primary'
                        : 'hover:bg-muted/60'
                    }`}
                  >
                    <div className="text-sm font-medium truncate">{queue.name}</div>
                    <div
                      className={`flex items-center gap-1 text-xs mt-0.5 truncate ${
                        selected ? 'text-primary/80' : 'text-muted-foreground'
                      }`}
                    >
                      <Folder className="h-3 w-3 shrink-0" />
                      {queue.folderName || `folder ${queue.folderId}`}
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </aside>
  )
}
