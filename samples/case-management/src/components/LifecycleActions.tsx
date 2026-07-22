import { useState } from 'react';
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
import { useAuth } from '@/hooks/useAuth';
import { runLifecycle, type LifecycleAction } from '@/lib/sdk';
import type { CaseStage } from '@/lib/types';

const COPY: Record<LifecycleAction, { label: string; title: string; body: string; icon: React.ReactNode; destructive?: boolean }> = {
  pause: { label: 'Pause', title: 'Pause this case?', body: 'Work stops until the case is resumed.', icon: <Pause className="h-4 w-4" /> },
  resume: { label: 'Resume', title: 'Resume this case?', body: 'The case continues from where it was paused.', icon: <Play className="h-4 w-4" /> },
  reopen: { label: 'Reopen', title: 'Reopen this case?', body: 'Pick the stage to resume from, then confirm.', icon: <RotateCcw className="h-4 w-4" /> },
  close: { label: 'Close', title: 'Close this case?', body: 'This cancels the case. Add a note explaining why, if helpful.', icon: <Ban className="h-4 w-4" />, destructive: true },
};

const PAST: Record<LifecycleAction, string> = { pause: 'paused', resume: 'resumed', reopen: 'reopened', close: 'closed' };

/** Decide which lifecycle actions apply to the instance's current status. */
function availableActions(status: string): LifecycleAction[] {
  const s = (status || '').toLowerCase();
  const closed = ['completed', 'closed', 'done', 'cancelled', 'canceled'].includes(s);
  const faulted = s === 'faulted' || s === 'failed';
  const paused = s.includes('paus');
  const running = ['running', 'in progress', 'inprogress', 'active', 'resuming', 'retrying'].includes(s);

  const actions: LifecycleAction[] = [];
  if (running) actions.push('pause');
  if (paused) actions.push('resume');
  if (closed || faulted) actions.push('reopen');
  if (!closed) actions.push('close');
  return actions;
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
      const ok = await runLifecycle(sdk, action, instanceId, folderKey, {
        comment: comment.trim() || undefined,
        stageId: stageId || undefined,
      });
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
      toast.error(e instanceof Error ? e.message : `Could not ${action} the case.`);
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
