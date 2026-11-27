import { useState } from 'react';
import { reportError } from '@/lib/errors';
import { Ban, Loader2, Pause, Play, RotateCcw } from 'lucide-react';
import { Button } from '@uipath/apollo-wind/components/ui/button';
import { Label } from '@uipath/apollo-wind/components/ui/label';
import { Textarea } from '@uipath/apollo-wind/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@uipath/apollo-wind/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@uipath/apollo-wind/components/ui/alert-dialog';
import { toast } from '@uipath/apollo-wind/components/ui/sonner';
import { InstanceStatus } from '@uipath/uipath-typescript/cases';
import { useAuth } from '@/hooks/useAuth';
import { reopenCase, runLifecycle, type LifecycleAction } from '@/lib/sdk';
import type { CaseStage } from '@/lib/types';

const COPY: Record<LifecycleAction, { label: string; title: string; body: string; icon: React.ReactNode; destructive?: boolean }> = {
  pause: { label: 'Pause', title: 'Pause this case?', body: 'Work stops until the case is resumed.', icon: <Pause className="h-4 w-4" /> },
  resume: { label: 'Resume', title: 'Resume this case?', body: 'The case continues from where it was paused.', icon: <Play className="h-4 w-4" /> },
  reopen: { label: 'Reopen', title: 'Reopen this case?', body: 'Pick the stage to resume from, then confirm.', icon: <RotateCcw className="h-4 w-4" /> },
  close: { label: 'Close', title: 'Close this case?', body: 'This cancels the case. Add a note explaining why, if helpful.', icon: <Ban className="h-4 w-4" />, destructive: true },
};

const PAST: Record<LifecycleAction, string> = { pause: 'paused', resume: 'resumed', reopen: 'reopened', close: 'closed' };

/**
 * Lifecycle actions offered for each instance status. A status that is not
 * listed (Canceling, Upgrading, or one the backend has not set yet) offers none.
 */
const ACTIONS_BY_STATUS: Partial<Record<InstanceStatus, LifecycleAction[]>> = {
  [InstanceStatus.PENDING]: ['close'],
  [InstanceStatus.RUNNING]: ['pause', 'close'],
  [InstanceStatus.RESUMING]: ['pause', 'close'],
  [InstanceStatus.RETRYING]: ['pause', 'close'],
  [InstanceStatus.PAUSING]: ['resume', 'close'],
  [InstanceStatus.PAUSED]: ['resume', 'close'],
  [InstanceStatus.FAULTED]: ['reopen', 'close'],
  [InstanceStatus.COMPLETED]: ['reopen'],
  [InstanceStatus.CANCELLED]: ['reopen'],
};

function availableActions(status: string): LifecycleAction[] {
  return ACTIONS_BY_STATUS[status as InstanceStatus] ?? [];
}

export function LifecycleActions({
  instanceId,
  folderKey,
  status,
  stages,
  onChanged,
}: {
  instanceId: string;
  folderKey: string;
  status: string;
  stages: CaseStage[];
  onChanged: () => void;
}) {
  const actions = availableActions(status);
  if (actions.length === 0) return null;
  return (
    <div className="flex items-center gap-2">
      {actions.map((a) => (
        <ActionButton key={a} action={a} instanceId={instanceId} folderKey={folderKey} stages={stages} onChanged={onChanged} />
      ))}
    </div>
  );
}

function ActionButton({
  action,
  instanceId,
  folderKey,
  stages,
  onChanged,
}: {
  action: LifecycleAction;
  instanceId: string;
  folderKey: string;
  stages: CaseStage[];
  onChanged: () => void;
}) {
  const { sdk } = useAuth();
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState('');
  const [stageId, setStageId] = useState('');
  const [busy, setBusy] = useState(false);

  const copy = COPY[action];
  const needsStage = action === 'reopen';
  const canConfirm = !needsStage || stageId !== '';

  const confirm = async () => {
    setBusy(true);
    try {
      const note = comment.trim() || undefined;
      const ok =
        action === 'reopen'
          ? await reopenCase(sdk, instanceId, folderKey, stageId, note)
          : await runLifecycle(sdk, action, instanceId, folderKey, note);
      if (ok) {
        toast.success(`Case ${PAST[action]}.`);
        setOpen(false);
        setComment('');
        setStageId('');
        onChanged();
      } else {
        toast.error(`Could not ${action} the case.`);
      }
    } catch (e) {
      toast.error(reportError(`Could not ${action} the case.`, e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(o) => !busy && setOpen(o)}>
      <AlertDialogTrigger asChild>
        <Button variant={copy.destructive ? 'destructive' : 'outline'} size="sm">
          {copy.icon}
          {copy.label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{copy.title}</AlertDialogTitle>
          <AlertDialogDescription>{copy.body}</AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-1">
          {needsStage && (
            <div className="space-y-1.5">
              <Label htmlFor="reopen-stage">Resume from stage</Label>
              <Select value={stageId} onValueChange={setStageId}>
                <SelectTrigger id="reopen-stage">
                  <SelectValue placeholder="Select a stage" />
                </SelectTrigger>
                <SelectContent>
                  {stages.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="lifecycle-comment">Note (optional)</Label>
            <Textarea
              id="lifecycle-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add context for the audit trail…"
              rows={3}
            />
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={!canConfirm || busy}
            onClick={(e) => {
              e.preventDefault();
              void confirm();
            }}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {copy.label}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
