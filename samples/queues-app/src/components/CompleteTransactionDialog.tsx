import { useState } from 'react'
import {
  QueueExceptionType,
  QueueTransactionOutcome,
} from '@uipath/uipath-typescript/queues'
import type {
  QueueGetWithMethodsResponse,
  QueueItem,
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
  RadioGroup,
  RadioGroupItem,
} from '@uipath/apollo-wind/components/ui/radio-group'
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
  item: QueueItem
  onClose: () => void
  onCompleted: () => void
}

/**
 * Completes an item's active transaction via the bound
 * `queue.completeTransaction(itemId, outcome, options)`.
 *
 * The outcome is the caller's own verdict (`QueueTransactionOutcome`) —
 * Orchestrator records it as reported. On failure, `processingError` is
 * optional; its `type` decides retry behavior (an `ApplicationException`
 * failure is retried per the queue's retry settings, a `BusinessException`
 * is not).
 */
export function CompleteTransactionDialog({
  queue,
  item,
  onClose,
  onCompleted,
}: Props) {
  const [outcome, setOutcome] = useState<QueueTransactionOutcome>(
    QueueTransactionOutcome.Successful,
  )
  const [outputText, setOutputText] = useState('{\n  "resultCode": "OK"\n}')
  const [reason, setReason] = useState('')
  const [details, setDetails] = useState('')
  const [errorType, setErrorType] = useState<QueueExceptionType>(
    QueueExceptionType.ApplicationException,
  )
  const [progress, setProgress] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const failed = outcome === QueueTransactionOutcome.Failed

  const handleSubmit = async () => {
    let outputData: Record<string, unknown> | undefined
    const trimmedOutput = outputText.trim()
    if (trimmedOutput) {
      try {
        const parsed: unknown = JSON.parse(trimmedOutput)
        if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
          throw new Error()
        }
        outputData = parsed as Record<string, unknown>
      } catch {
        toast.error('Output data must be a JSON object (or left empty).')
        return
      }
    }

    setSubmitting(true)
    try {
      await queue.completeTransaction(item.id, outcome, {
        outputData,
        progress: progress.trim() || undefined,
        processingError:
          failed && reason.trim()
            ? {
                reason: reason.trim(),
                details: details.trim() || undefined,
                type: errorType,
              }
            : undefined,
      })
      toast.success(`Item #${item.id} marked ${outcome}`)
      onCompleted()
      onClose()
    } catch (err) {
      toast.error(
        err instanceof UiPathError
          ? err.message
          : 'Failed to complete the transaction',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Complete transaction — item #{item.id}</DialogTitle>
          <DialogDescription>
            Reports your processing outcome for this item. Only items with an
            active transaction (InProgress) can be completed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto">
          <RadioGroup
            value={outcome}
            onValueChange={(v) => setOutcome(v as QueueTransactionOutcome)}
            className="grid grid-cols-2 gap-2"
          >
            <Label
              htmlFor="outcome-successful"
              className={`flex items-start gap-2.5 rounded-md border p-3 cursor-pointer ${
                !failed ? 'border-primary bg-primary/5' : ''
              }`}
            >
              <RadioGroupItem
                id="outcome-successful"
                value={QueueTransactionOutcome.Successful}
                className="mt-0.5"
              />
              <span>
                <span className="block text-sm font-medium">Successful</span>
                <span className="block text-xs text-muted-foreground mt-0.5">
                  Marks the item Successful.
                </span>
              </span>
            </Label>
            <Label
              htmlFor="outcome-failed"
              className={`flex items-start gap-2.5 rounded-md border p-3 cursor-pointer ${
                failed ? 'border-primary bg-primary/5' : ''
              }`}
            >
              <RadioGroupItem
                id="outcome-failed"
                value={QueueTransactionOutcome.Failed}
                className="mt-0.5"
              />
              <span>
                <span className="block text-sm font-medium">Failed</span>
                <span className="block text-xs text-muted-foreground mt-0.5">
                  Marks the item Failed; describe why below.
                </span>
              </span>
            </Label>
          </RadioGroup>

          {failed && (
            <div className="space-y-3 rounded-md border p-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="reason">Failure reason</Label>
                  <Input
                    id="reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. Vendor not found"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Error type</Label>
                  <Select
                    value={errorType}
                    onValueChange={(v) => setErrorType(v as QueueExceptionType)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={QueueExceptionType.ApplicationException}>
                        ApplicationException — retried
                      </SelectItem>
                      <SelectItem value={QueueExceptionType.BusinessException}>
                        BusinessException — not retried
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="details">Details</Label>
                <Textarea
                  id="details"
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  rows={2}
                  placeholder="Optional additional context"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="output">Output data</Label>
            <Textarea
              id="output"
              value={outputText}
              onChange={(e) => setOutputText(e.target.value)}
              rows={4}
              className="font-mono text-xs"
              spellCheck={false}
            />
            <p className="text-xs text-muted-foreground">
              Optional JSON object persisted on the item — keys are stored
              exactly as typed. Clear the field to skip.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tx-progress">Progress note</Label>
            <Input
              id="tx-progress"
              value={progress}
              onChange={(e) => setProgress(e.target.value)}
              placeholder="Optional free-form progress text"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            variant={failed ? 'destructive' : 'default'}
          >
            {submitting ? 'Reporting…' : failed ? 'Mark as Failed' : 'Mark as Successful'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
