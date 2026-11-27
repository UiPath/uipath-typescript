import { useState } from 'react'
import { Repeat2, UserMinus, UserPlus } from 'lucide-react'
import {
  Tasks,
  TaskAssignmentCriteria,
  TaskStatus,
  TaskUserType,
} from '@uipath/uipath-typescript/tasks'
import type { TaskAssignmentOptions, TaskGetResponse } from '@uipath/uipath-typescript/tasks'
import { UiPathError } from '@uipath/uipath-typescript/core'
import { Alert, AlertDescription } from '@uipath/apollo-wind/components/ui/alert'
import { Button } from '@uipath/apollo-wind/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@uipath/apollo-wind/components/ui/dialog'
import { Label } from '@uipath/apollo-wind/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@uipath/apollo-wind/components/ui/select'
import { toast } from '@uipath/apollo-wind/components/ui/sonner'
import { useAuth } from '../context/AuthContext'
import { useTaskUsers } from '../hooks/useTasks'
import { assignedToGroup, formatAssignmentErrors } from '../taskUtils'

/**
 * Bulk actions on Manage Tasks. Enable/disable mirrors what the server
 * accepts: Assign needs all-unassigned, Reassign/Unassign need all-assigned,
 * completed tasks block everything.
 */
export function BulkActions({
  selectedTasks,
  onAssign,
  onReassign,
  onUnassigned,
}: {
  selectedTasks: TaskGetResponse[]
  onAssign: () => void
  onReassign: () => void
  onUnassigned: () => void
}) {
  const { sdk } = useAuth()
  const [busy, setBusy] = useState(false)
  const count = selectedTasks.length

  const assignedCount = selectedTasks.filter(hasAssignee).length
  const completedCount = selectedTasks.filter(
    (t) => t.status === TaskStatus.Completed,
  ).length
  const hasCompleted = completedCount > 0
  const allUnassigned = assignedCount === 0
  const allAssigned = assignedCount === count
  // Completed tasks are terminal — server rejects any (re)assignment.
  const canAssign = !hasCompleted && allUnassigned
  const canReassignOrUnassign = !hasCompleted && allAssigned

  const handleUnassign = async () => {
    if (count === 0) return
    setBusy(true)
    try {
      // Array form — one round-trip instead of N.
      const svc = new Tasks(sdk)
      const result = await svc.unassign(selectedTasks.map((t) => t.id))
      if (result.success) {
        toast.success(`Unassigned ${count} ${count === 1 ? 'task' : 'tasks'}`)
        onUnassigned()
      } else {
        toast.error(formatAssignmentErrors(result.data))
      }
    } catch (err) {
      toast.error(err instanceof UiPathError ? err.message : 'Bulk unassign failed')
    } finally {
      setBusy(false)
    }
  }

  const completedTooltip =
    completedCount === count
      ? 'Completed tasks can’t be (re)assigned'
      : `Selection includes ${completedCount} completed ${completedCount === 1 ? 'task' : 'tasks'}`
  const assignTooltip = canAssign
    ? `Assign ${count} ${count === 1 ? 'task' : 'tasks'}`
    : hasCompleted
      ? completedTooltip
      : allAssigned
        ? 'Already assigned — use Reassign instead'
        : 'Selection mixes assigned and unassigned tasks'
  const reassignTooltip = canReassignOrUnassign
    ? `Reassign ${count} ${count === 1 ? 'task' : 'tasks'}`
    : hasCompleted
      ? completedTooltip
      : allUnassigned
        ? 'Nothing to reassign — these tasks are unassigned'
        : 'Selection mixes assigned and unassigned tasks'
  const unassignTooltip = canReassignOrUnassign
    ? `Unassign ${count} ${count === 1 ? 'task' : 'tasks'}`
    : hasCompleted
      ? completedTooltip
      : allUnassigned
        ? 'Nothing to unassign — these tasks are already unassigned'
        : 'Selection mixes assigned and unassigned tasks'

  return (
    <>
      <span className="hidden text-sm text-muted-foreground sm:inline">
        {count} selected
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={onAssign}
        disabled={busy || !canAssign}
        title={assignTooltip}
      >
        <UserPlus className="h-4 w-4" />
        Assign
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={onReassign}
        disabled={busy || !canReassignOrUnassign}
        title={reassignTooltip}
      >
        <Repeat2 className="h-4 w-4" />
        Reassign
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleUnassign}
        disabled={busy || !canReassignOrUnassign}
        title={unassignTooltip}
      >
        <UserMinus className="h-4 w-4" />
        {busy ? 'Unassigning…' : 'Unassign'}
      </Button>
    </>
  )
}

/** True when a task has any kind of current assignee (user or directory group). */
function hasAssignee(task: TaskGetResponse): boolean {
  if (task.assignedToUser) return true
  return assignedToGroup(task)
}

/** Bulk-(re)assign dialog used on Manage Tasks when ≥1 task is selected. */
export function BulkAssignDialog({
  tasks: targetTasks,
  mode,
  onClose,
  onDone,
}: {
  tasks: TaskGetResponse[]
  mode: 'assign' | 'reassign'
  onClose: () => void
  onDone: () => void
}) {
  const { sdk } = useAuth()
  // Folder for the user dropdown — fall back to the first selected task's folder.
  const folderId = targetTasks[0]?.folderId ?? null
  const { users, loading, error } = useTaskUsers(folderId)
  const [userId, setUserId] = useState('')
  const [busy, setBusy] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const submit = async () => {
    const id = Number(userId)
    if (!Number.isFinite(id) || id <= 0) return
    const selectedUser = users.find((u) => u.id === id)
    // Group target needs an assignmentCriteria; single-user assignment omits it.
    const payload: TaskAssignmentOptions[] = targetTasks.map((t) =>
      selectedUser?.type === TaskUserType.DirectoryGroup
        ? { taskId: t.id, userId: id, assignmentCriteria: TaskAssignmentCriteria.AllUsers }
        : { taskId: t.id, userId: id },
    )
    setBusy(true)
    setSubmitError(null)
    try {
      const svc = new Tasks(sdk)
      const result = mode === 'reassign' ? await svc.reassign(payload) : await svc.assign(payload)
      if (result.success) {
        const verb = mode === 'reassign' ? 'Reassigned' : 'Assigned'
        toast.success(`${verb} ${targetTasks.length} ${targetTasks.length === 1 ? 'task' : 'tasks'}`)
        onDone()
      } else {
        setSubmitError(formatAssignmentErrors(result.data))
      }
    } catch (err) {
      setSubmitError(
        err instanceof UiPathError ? err.message : `Bulk ${mode} failed`,
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'reassign' ? 'Reassign' : 'Assign'} {targetTasks.length}{' '}
            {targetTasks.length === 1 ? 'task' : 'tasks'}
          </DialogTitle>
          <DialogDescription>Pick a user or directory group to take ownership.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading users…</p>
          ) : error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : users.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No assignable users found in this folder.
            </p>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="bulk-assign-user">Assign to</Label>
              <Select value={userId} onValueChange={setUserId}>
                <SelectTrigger id="bulk-assign-user">
                  <SelectValue placeholder="Select a user…" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.displayName || u.userName}
                      {u.emailAddress ? ` — ${u.emailAddress}` : ` (${u.type})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {submitError && (
            <Alert variant="destructive">
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!userId || busy}>
            {busy
              ? mode === 'reassign'
                ? 'Reassigning…'
                : 'Assigning…'
              : mode === 'reassign'
                ? 'Reassign'
                : 'Assign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
