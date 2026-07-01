import { useCallback, useState } from 'react'
import { useTheme } from 'next-themes'
import {
  ValidationStation,
  ValidationStationLanguage,
  type ValidationStationProps,
} from '@uipath/ui-widgets-validation-station'
import { TaskType } from '@uipath/uipath-typescript/tasks'
import type { DuFramework } from '@uipath/uipath-typescript/document-understanding'
import { UiPathError } from '@uipath/uipath-typescript/core'
import { Alert, AlertDescription } from '@uipath/apollo-wind/components/ui/alert'
import { Badge } from '@uipath/apollo-wind/components/ui/badge'
import { Button } from '@uipath/apollo-wind/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@uipath/apollo-wind/components/ui/dialog'
import { Spinner } from '@uipath/apollo-wind/components/ui/spinner'
import { toast } from '@uipath/apollo-wind/components/ui/sonner'
import { useAuth } from '../context/AuthContext'
import { useTask } from '../hooks/useTasks'
import { priorityBadge, statusBadge } from '../taskUtils'

/**
 * The single argument the validation station hands back to `onSaveComplete`.
 * Derived from the widget's own prop type so it tracks the package version.
 */
type SaveValidatedDataResult = Parameters<
  NonNullable<ValidationStationProps['onSaveComplete']>
>[0]

/** Which button kicked off the in-flight save. */
type PendingAction = 'save' | 'submit'

interface Props {
  /** Lightweight task from the list — used for the header before the full payload loads. */
  taskId: number
  folderId: number
  title: string
  onClose: () => void
  /** Called after the task is submitted (completed) so the list can refresh. */
  onCompleted: () => void
}

/**
 * Near-fullscreen host for `@uipath/ui-widgets-validation-station`, shown when
 * a selected task is a Document Validation task. The widget renders the source
 * document alongside the extracted fields; the reviewer edits, then **Save**
 * (validate + keep open) or **Submit** (validate + complete the task).
 *
 * Both buttons go through the widget's validated-save path: we flip the `save`
 * prop to `{ validate: true }`, and the widget reports back via
 * `onSaveComplete`. Only the `submit` flow then completes the Action Center task.
 */
export function DocumentValidationDialog({
  taskId,
  folderId,
  title,
  onClose,
  onCompleted,
}: Props) {
  const { sdk } = useAuth()
  const { resolvedTheme } = useTheme()

  // Full DU payload — `getById` with the task type returns the validation data
  // the widget needs (the list response carries only summary fields).
  const { task, loading, error } = useTask(taskId, folderId, TaskType.DocumentValidation)

  const [save, setSave] = useState<{ validate: boolean } | undefined>(undefined)
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const handleSaveComplete = useCallback(
    async (result: SaveValidatedDataResult) => {
      // Always clear the trigger so a later Save/Submit re-arms the widget.
      setSave(undefined)
      const action = pendingAction
      setPendingAction(null)

      // Widget validation failed, the payload is missing, or this was a plain
      // Save — nothing further to do; the widget keeps the edits in view.
      if (!result.success || !task || action !== 'submit') return

      try {
        await task.complete({
          type: TaskType.DocumentValidation,
          action: 'Completed',
          data: task.data ?? {},
        })
        toast.success('Document validated and submitted')
        onCompleted()
      } catch (err) {
        setActionError(
          err instanceof UiPathError ? err.message : 'Failed to submit the task',
        )
      }
    },
    [pendingAction, task, onCompleted],
  )

  const trigger = (action: PendingAction) => {
    setActionError(null)
    setPendingAction(action)
    setSave({ validate: true })
  }

  // Widget needs a loaded payload, and we block re-entry while a save is in flight.
  const canAct = !!task?.data && pendingAction === null

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="flex h-[92vh] w-[96vw] max-w-[96vw] flex-col gap-0 p-0 sm:max-w-[96vw]"
        // The widget owns scrolling/focus inside the document viewer.
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="flex-row items-center justify-between gap-4 space-y-0 border-b px-6 py-4">
          <div className="flex min-w-0 items-center gap-2">
            <DialogTitle className="truncate">{task?.title ?? title}</DialogTitle>
            {task && (
              <div className="flex shrink-0 items-center gap-1.5">
                <Badge variant={statusBadge(task.status).variant}>
                  {statusBadge(task.status).label}
                </Badge>
                <Badge variant={priorityBadge(task.priority).variant}>
                  {priorityBadge(task.priority).label}
                </Badge>
              </div>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2 pr-8">
            <Button variant="outline" onClick={() => trigger('save')} disabled={!canAct}>
              {pendingAction === 'save' ? 'Saving…' : 'Save'}
            </Button>
            <Button onClick={() => trigger('submit')} disabled={!canAct}>
              {pendingAction === 'submit' ? 'Submitting…' : 'Submit'}
            </Button>
          </div>
        </DialogHeader>

        {actionError && (
          <Alert variant="destructive" className="mx-6 mt-3 w-auto">
            <AlertDescription>{actionError}</AlertDescription>
          </Alert>
        )}

        <div className="min-h-0 flex-1 overflow-hidden">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <Spinner label="Loading document…" showLabel />
            </div>
          ) : error ? (
            <Alert variant="destructive" className="m-6 w-auto">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : !task?.data ? (
            <div className="flex h-full items-center justify-center p-6 text-sm text-muted-foreground">
              This task has no validation payload to display.
            </div>
          ) : (
            <ValidationStation
              sdk={sdk}
              data={task.data as DuFramework.ContentValidationData}
              folderId={task.folderId}
              theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
              language={ValidationStationLanguage.English}
              save={save}
              onSaveComplete={handleSaveComplete}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
