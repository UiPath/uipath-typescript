import { Badge } from '@uipath/apollo-wind/components/ui/badge';
import { Card, CardContent } from '@uipath/apollo-wind/components/ui/card';
import { Button } from '@uipath/apollo-wind/components/ui/button';
import { Spinner } from '@uipath/apollo-wind/components/ui/spinner';
import { CheckCircle2, Paperclip, Play, XCircle } from 'lucide-react';
import type { Run } from '../api';

/** One channel: what it is, how to call it, and what happened. */
export function RunCard({
  title,
  declaration,
  blurb,
  run,
  error,
  busy,
  tick,
  onRun,
}: {
  title: string;
  declaration: string;
  blurb: string;
  run: Run | null;
  error: string | null;
  busy: boolean;
  tick?: string | null;
  onRun: () => void;
}) {
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          <code className="mt-1 block font-mono text-xs text-muted-foreground">{declaration}</code>
        </div>
        <p className="text-sm text-muted-foreground">{blurb}</p>

        <div className="flex items-center gap-2">
          <Button size="sm" onClick={onRun} disabled={busy}>
            {busy ? <Spinner className="size-4" /> : <Play className="size-4" />}
            Run
          </Button>
          {tick ? <span className="font-mono text-xs text-muted-foreground">{tick}</span> : null}
        </div>

        {error ? (
          <div className="space-y-1 rounded-md border border-destructive/40 p-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <XCircle className="size-4 text-destructive" />
              Failed
            </div>
            <p className="whitespace-pre-wrap text-xs text-muted-foreground">{error}</p>
          </div>
        ) : null}

        {run ? (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="outline">
                <CheckCircle2 className="mr-1 size-3" />
                {run.state ?? 'answered'}
              </Badge>
              <Badge variant={run.transport === 'attachment' ? 'default' : 'secondary'}>
                {run.transport === 'attachment' ? (
                  <>
                    <Paperclip className="mr-1 size-3" />
                    attachment
                  </>
                ) : (
                  'inline'
                )}
              </Badge>
              <Badge variant="outline" className="font-mono">
                {run.clientMs.toLocaleString()} ms
              </Badge>
            </div>

            <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
              <dt className="text-muted-foreground">sent</dt>
              <dd className="font-mono">{run.sentKb} KB</dd>
              <dt className="text-muted-foreground">function received</dt>
              <dd className="font-mono">{run.output ? `${run.output.receivedKb} KB` : '—'}</dd>
              <dt className="text-muted-foreground">function returned</dt>
              <dd className="font-mono">{run.output ? `${run.output.returnedKb} KB` : '—'}</dd>
            </dl>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
