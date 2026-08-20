import { useState } from 'react'
import { QueuePriority } from '@uipath/uipath-typescript/queues'
import type {
  QueueGetWithMethodsResponse,
  QueueItemValue,
} from '@uipath/uipath-typescript/queues'
import { UiPathError } from '@uipath/uipath-typescript/core'
import { toast } from '@uipath/apollo-wind/components/ui/sonner'
import { Button } from '@uipath/apollo-wind/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@uipath/apollo-wind/components/ui/dialog'
import { Input } from '@uipath/apollo-wind/components/ui/input'
import { Label } from '@uipath/apollo-wind/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@uipath/apollo-wind/components/ui/select'
import { Textarea } from '@uipath/apollo-wind/components/ui/textarea'

interface Props {
  queue: QueueGetWithMethodsResponse
  onClose: () => void
  onInserted: () => void
}

const DEFAULT_PAYLOAD = `{
  "invoiceId": "INV-1001",
  "amount": 1520
}`

/**
 * Parses the payload textarea into the flat scalar map the API accepts.
 * Queue item payloads are flat — nested objects/arrays are rejected by the
 * SDK (`ValidationError`), so this validates up front for a friendlier error.
 */
function parsePayload(text: string): Record<string, QueueItemValue> {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('Payload is not valid JSON.')
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Payload must be a JSON object.')
  }
  for (const [key, value] of Object.entries(parsed)) {
    const type = typeof value
    if (value !== null && type !== 'string' && type !== 'number' && type !== 'boolean') {
      throw new Error(
        `Payload values must be flat scalars — "${key}" is ${Array.isArray(value) ? 'an array' : `a ${type}`}.`,
      )
    }
  }
  return parsed as Record<string, QueueItemValue>
}

/**
 * Inserts a new item into the queue via the bound `queue.insertItem(payload,
 * options)` (which delegates to `Queues.insertItemByName` with this queue's
 * name and folder). Payload keys are stored exactly as typed — the SDK never
 * case-converts user-defined payload keys.
 */
export function InsertItemDialog({ queue, onClose, onInserted }: Props) {
  const [payloadText, setPayloadText] = useState(DEFAULT_PAYLOAD)
  const [reference, setReference] = useState('')
  const [priority, setPriority] = useState<QueuePriority>(QueuePriority.Normal)
  const [dueDate, setDueDate] = useState('')
  const [deferDate, setDeferDate] = useState('')
  const [progress, setProgress] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    let payload: Record<string, QueueItemValue>
    try {
      payload = parsePayload(payloadText)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Invalid payload')
      return
    }

    setSubmitting(true)
    try {
      const item = await queue.insertItem(payload, {
        priority,
        reference: reference.trim() || undefined,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        deferDate: deferDate ? new Date(deferDate) : undefined,
        progress: progress.trim() || undefined,
      })
      toast.success(`Item #${item.id} inserted into ${queue.name}`)
      onInserted()
      onClose()
    } catch (err) {
      toast.error(
        err instanceof UiPathError ? err.message : 'Failed to insert the item',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Insert item</DialogTitle>
          <DialogDescription>
            Adds a new work item to <span className="font-medium">{queue.name}</span>.
            The payload is a flat JSON object of scalar values.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto">
          <div className="space-y-1.5">
            <Label htmlFor="payload">Payload (specific data)</Label>
            <Textarea
              id="payload"
              value={payloadText}
              onChange={(e) => setPayloadText(e.target.value)}
              rows={6}
              className="font-mono text-xs"
              spellCheck={false}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="reference">Reference</Label>
              <Input
                id="reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. INV-1001"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select
                value={priority}
                onValueChange={(v) => setPriority(v as QueuePriority)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={QueuePriority.High}>High</SelectItem>
                  <SelectItem value={QueuePriority.Normal}>Normal</SelectItem>
                  <SelectItem value={QueuePriority.Low}>Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="deferDate">Defer until</Label>
              <Input
                id="deferDate"
                type="datetime-local"
                value={deferDate}
                onChange={(e) => setDeferDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dueDate">Due date</Label>
              <Input
                id="dueDate"
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="progress">Progress note</Label>
              <Input
                id="progress"
                value={progress}
                onChange={(e) => setProgress(e.target.value)}
                placeholder="Optional free-form progress text"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Inserting…' : 'Insert item'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
