import { useState } from 'react'
import type { ReactNode } from 'react'
import { Folder, Info, PlayCircle, Plus, RefreshCw } from 'lucide-react'
import { QueueItemStatus, Queues } from '@uipath/uipath-typescript/queues'
import type {
  QueueGetWithMethodsResponse,
  QueueItem,
} from '@uipath/uipath-typescript/queues'
import { UiPathError } from '@uipath/uipath-typescript/core'
import { toast } from '@uipath/apollo-wind/components/ui/sonner'
import { Badge } from '@uipath/apollo-wind/components/ui/badge'
import { Button } from '@uipath/apollo-wind/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@uipath/apollo-wind/components/ui/card'
import { Alert, AlertDescription } from '@uipath/apollo-wind/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@uipath/apollo-wind/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@uipath/apollo-wind/components/ui/tooltip'
import { useAuth } from '../context/AuthContext'
import { PAGE_SIZE, useQueueItems } from '../hooks/useQueueItems'
import type { StatusFilter } from '../hooks/useQueueItems'
import { ItemsTable } from './ItemsTable'
import { ItemInspector } from './ItemInspector'
import { InsertItemDialog } from './InsertItemDialog'
import { CompleteTransactionDialog } from './CompleteTransactionDialog'
import { formatDateTime } from '../lib/format'

interface Props {
  queue: QueueGetWithMethodsResponse
}

/**
 * Right-hand pane for one queue: definition properties, its items (paged,
 * filterable by status), and the write operations — insert item, start a
 * transaction, complete a transaction.
 */
export function QueueDetail({ queue: initialQueue }: Props) {
  const { sdk } = useAuth()
  // Local copy so "Refresh" can swap in the latest definition from
  // `Queues.getByIdWithMethods` without round-tripping through the sidebar list.
  const [queue, setQueue] = useState(initialQueue)
  const [refreshingQueue, setRefreshingQueue] = useState(false)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All')
  const { page, loading, error, refresh, nextPage, previousPage } =
    useQueueItems(queue, statusFilter)

  const [starting, setStarting] = useState(false)
  const [showInsert, setShowInsert] = useState(false)
  const [inspecting, setInspecting] = useState<QueueItem | null>(null)
  const [completing, setCompleting] = useState<QueueItem | null>(null)

  const refreshQueue = async () => {
    setRefreshingQueue(true)
    try {
      // The queue object carries its own folder; getByIdWithMethods returns
      // the definition with the operational methods re-attached.
      const fresh = await new Queues(sdk).getByIdWithMethods(queue.id, { folderId: queue.folderId })
      setQueue(fresh)
      await refresh()
    } catch (err) {
      toast.error(
        err instanceof UiPathError ? err.message : 'Failed to refresh the queue',
      )
    } finally {
      setRefreshingQueue(false)
    }
  }

  /**
   * `startTransaction` asks Orchestrator to hand this caller the next
   * available item. Allocation follows the caller's identity: only robot
   * sessions receive items, so a user signed in via OAuth always gets
   * `null` back — surfaced here as an informational toast rather than an
   * error, since that is documented SDK behavior.
   */
  const handleStartTransaction = async () => {
    setStarting(true)
    try {
      const item = await queue.startTransaction()
      if (item) {
        toast.success(`Transaction started — item #${item.id} is now InProgress`)
        await refresh()
      } else {
        toast.info(
          'No item acquired. startTransaction requires a robot session — user and application identities always receive null.',
          { duration: 8000 },
        )
      }
    } catch (err) {
      toast.error(
        err instanceof UiPathError ? err.message : 'Failed to start a transaction',
      )
    } finally {
      setStarting(false)
    }
  }

  const items = page?.items ?? []
  const showingFrom = items.length > 0 && page?.currentPage
    ? (page.currentPage - 1) * PAGE_SIZE + 1
    : 0

  return (
    <div className="flex-1 min-w-0 overflow-y-auto p-4 sm:p-6 space-y-4">
      {/* Queue header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold truncate">{queue.name}</h2>
          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Folder className="h-3.5 w-3.5" />
              {queue.folderName || `folder ${queue.folderId}`}
            </span>
            <span className="font-mono text-xs">#{queue.id}</span>
            <span className="font-mono text-xs truncate" title="Queue key — paste into the sidebar search to test getByKey">
              {queue.key}
            </span>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={refreshQueue}
          disabled={refreshingQueue}
        >
          <RefreshCw
            className={`h-3.5 w-3.5 mr-1.5 ${refreshingQueue ? 'animate-spin' : ''}`}
          />
          Refresh
        </Button>
      </div>

      {/* Queue definition properties */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Definition</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-3 text-sm">
            <Property label="Max retries">{queue.maxNumberOfRetries}</Property>
            <Property label="Auto retry">
              <BoolBadge value={queue.acceptAutomaticallyRetry} />
            </Property>
            <Property label="Retry abandoned">
              <BoolBadge value={queue.retryAbandonedItems} />
            </Property>
            <Property label="Unique references">
              <BoolBadge value={queue.enforceUniqueReference} />
            </Property>
            <Property label="Encrypted">
              <BoolBadge value={queue.encrypted} />
            </Property>
            <Property label="SLA">
              {queue.slaInMinutes ? `${queue.slaInMinutes} min` : '—'}
            </Property>
            <Property label="Risk SLA">
              {queue.riskSlaInMinutes ? `${queue.riskSlaInMinutes} min` : '—'}
            </Property>
            <Property label="Created">{formatDateTime(queue.createdTime)}</Property>
          </dl>
          {queue.description && (
            <p className="text-sm text-muted-foreground mt-3">{queue.description}</p>
          )}
        </CardContent>
      </Card>

      {/* Items */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-sm">
              Items
              {page?.totalCount != null && (
                <span className="ml-1.5 text-muted-foreground font-normal">
                  {page.totalCount}
                </span>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as StatusFilter)}
              >
                <SelectTrigger className="h-8 w-36 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All statuses</SelectItem>
                  {Object.values(QueueItemStatus).map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={refresh}
                disabled={loading}
                aria-label="Refresh items"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              <span className="flex items-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleStartTransaction}
                  disabled={starting}
                >
                  <PlayCircle className="h-3.5 w-3.5 mr-1.5" />
                  {starting ? 'Starting…' : 'Start transaction'}
                </Button>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 ml-1.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-64">
                    Acquires the next available item and marks it InProgress.
                    Orchestrator only allocates items to robot sessions — user
                    identities always receive null.
                  </TooltipContent>
                </Tooltip>
              </span>
              <Button size="sm" onClick={() => setShowInsert(true)}>
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Insert item
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {error ? (
            <Alert variant="destructive" className="m-4">
              <AlertDescription>
                {error}
                <Button variant="outline" size="sm" className="mt-2" onClick={refresh}>
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <ItemsTable
                items={items}
                loading={loading}
                onInspect={setInspecting}
                onComplete={setCompleting}
              />
              {page && (page.hasNextPage || (page.currentPage ?? 1) > 1) && (
                <div className="flex items-center justify-between border-t px-4 py-2.5 text-sm text-muted-foreground">
                  <span>
                    {items.length > 0 && showingFrom
                      ? `${showingFrom}–${showingFrom + items.length - 1}`
                      : '0'}
                    {page.totalCount != null && ` of ${page.totalCount}`}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={previousPage}
                      disabled={loading || !page.previousCursor}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={nextPage}
                      disabled={loading || !page.hasNextPage}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {showInsert && (
        <InsertItemDialog
          queue={queue}
          onClose={() => setShowInsert(false)}
          onInserted={refresh}
        />
      )}
      {completing && (
        <CompleteTransactionDialog
          queue={queue}
          item={completing}
          onClose={() => setCompleting(null)}
          onCompleted={refresh}
        />
      )}
      {inspecting && (
        <ItemInspector item={inspecting} onClose={() => setInspecting(null)} />
      )}
    </div>
  )
}

function Property({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  )
}

function BoolBadge({ value }: { value: boolean | null }) {
  return (
    <Badge variant="outline" className="font-normal">
      {value ? 'Yes' : 'No'}
    </Badge>
  )
}
