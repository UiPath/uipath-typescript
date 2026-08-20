import { CheckCircle2, Eye, Inbox } from 'lucide-react'
import { QueueItemStatus } from '@uipath/uipath-typescript/queues'
import type { QueueItem } from '@uipath/uipath-typescript/queues'
import { Button } from '@uipath/apollo-wind/components/ui/button'
import { Spinner } from '@uipath/apollo-wind/components/ui/spinner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@uipath/apollo-wind/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@uipath/apollo-wind/components/ui/tooltip'
import { PriorityBadge, StatusBadge } from './StatusBadge'
import { formatDateTime } from '../lib/format'

interface Props {
  items: QueueItem[]
  loading: boolean
  onInspect: (item: QueueItem) => void
  onComplete: (item: QueueItem) => void
}

/**
 * One page of queue items. Rows expose two actions: inspect (payloads +
 * timing) and — only while an item holds an active transaction
 * (`InProgress`) — complete, which reports the processing outcome.
 */
export function ItemsTable({ items, loading, onInspect, onComplete }: Props) {
  if (loading && items.length === 0) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
        <Spinner className="h-4 w-4" />
        Loading items…
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-16">
        <Inbox className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No items match this view.</p>
        <p className="text-xs text-muted-foreground mt-1">
          Use “Insert item” to add one.
        </p>
      </div>
    )
  }

  return (
    <Table className={loading ? 'opacity-60' : ''}>
      <TableHeader>
        <TableRow>
          <TableHead className="w-24">ID</TableHead>
          <TableHead>Reference</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Priority</TableHead>
          <TableHead>Created</TableHead>
          <TableHead>Started</TableHead>
          <TableHead className="w-16 text-center">Retries</TableHead>
          <TableHead className="w-24 text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell className="font-mono text-xs">{item.id}</TableCell>
            <TableCell className="max-w-44 truncate" title={item.reference ?? undefined}>
              {item.reference ?? <span className="text-muted-foreground">—</span>}
            </TableCell>
            <TableCell>
              <StatusBadge status={item.status} />
            </TableCell>
            <TableCell>
              <PriorityBadge priority={item.priority} />
            </TableCell>
            <TableCell className="text-muted-foreground whitespace-nowrap">
              {formatDateTime(item.createdTime)}
            </TableCell>
            <TableCell className="text-muted-foreground whitespace-nowrap">
              {formatDateTime(item.processingStartTime)}
            </TableCell>
            <TableCell className="text-center text-muted-foreground">
              {item.retryNumber}
            </TableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-0.5">
                {item.status === QueueItemStatus.InProgress && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-primary"
                        onClick={() => onComplete(item)}
                        aria-label={`Complete transaction for item ${item.id}`}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left">Complete transaction…</TooltipContent>
                  </Tooltip>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onInspect(item)}
                      aria-label={`Inspect item ${item.id}`}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">Inspect item</TooltipContent>
                </Tooltip>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
