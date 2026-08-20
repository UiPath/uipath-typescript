import type { ReactNode } from 'react'
import type { QueueItem } from '@uipath/uipath-typescript/queues'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@uipath/apollo-wind/components/ui/dialog'
import { Separator } from '@uipath/apollo-wind/components/ui/separator'
import { PriorityBadge, StatusBadge } from './StatusBadge'
import { formatDateTime, prettyJson } from '../lib/format'

interface Props {
  item: QueueItem
  onClose: () => void
}

/**
 * Read-only view of one queue item: identity, timing, and the three payload
 * blocks. `specificData` / `outputData` keep the exact keys the producer
 * sent — the SDK never case-converts user-defined payload keys.
 */
export function ItemInspector({ item, onClose }: Props) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Item #{item.id}
            <StatusBadge status={item.status} />
          </DialogTitle>
          <DialogDescription>
            {item.reference ? `Reference ${item.reference}` : 'No reference'} ·
            review status {item.reviewStatus}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <Field label="Priority">
              <PriorityBadge priority={item.priority} />
            </Field>
            <Field label="Retries">{item.retryNumber}</Field>
            <Field label="Created">{formatDateTime(item.createdTime)}</Field>
            <Field label="Defer date">{formatDateTime(item.deferDate)}</Field>
            <Field label="Due date">{formatDateTime(item.dueDate)}</Field>
            <Field label="Risk SLA date">{formatDateTime(item.riskSlaDate)}</Field>
            <Field label="Processing started">
              {formatDateTime(item.processingStartTime)}
            </Field>
            <Field label="Processing ended">
              {formatDateTime(item.processingEndTime)}
            </Field>
            {item.progress && <Field label="Progress">{item.progress}</Field>}
          </dl>

          <Separator />

          <JsonBlock label="Specific data (input payload)" value={item.specificData} />
          <JsonBlock label="Output data" value={item.outputData} />
          <JsonBlock label="Processing error" value={item.processingError} />
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  )
}

function JsonBlock({ label, value }: { label: string; value: unknown }) {
  return (
    <div>
      <h4 className="text-xs font-medium text-muted-foreground mb-1.5">{label}</h4>
      {value == null ? (
        <p className="text-sm text-muted-foreground">—</p>
      ) : (
        <pre className="font-mono text-xs bg-muted rounded-md p-3 overflow-x-auto max-h-48">
          {prettyJson(value)}
        </pre>
      )}
    </div>
  )
}
