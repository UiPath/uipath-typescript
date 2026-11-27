import { useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAsync } from '@/hooks/useAsync';
import { getCaseHistory, buildHistoryGroups } from '@/lib/sdk';
import { Card, Badge, Button, Loading, ErrorState, EmptyState, ActorBadge } from '@/components/ui';
import { formatDate, humanize, statusTone } from '@/lib/format';
import type { HistoryEvent } from '@/lib/types';

function dot(tone: ReturnType<typeof statusTone>): string {
  return tone === 'green'
    ? 'bg-emerald-500'
    : tone === 'red'
      ? 'bg-rose-500'
      : tone === 'blue'
        ? 'bg-sky-500'
        : tone === 'amber'
          ? 'bg-amber-500'
          : tone === 'violet'
            ? 'bg-violet-500'
            : 'bg-muted-foreground/40';
}

export function HistoryTab({ instanceId, folderKey }: { instanceId: string; folderKey: string }) {
  const { sdk } = useAuth();
  const [raw, setRaw] = useState(false);
  const hist = useAsync(() => getCaseHistory(sdk, instanceId, folderKey), [instanceId, folderKey]);

  const groups = useMemo(() => buildHistoryGroups(hist.data), [hist.data]);

  if (hist.loading) return <Loading label="Loading history…" />;
  if (hist.error) return <ErrorState message={hist.error} />;

  // Raw view: the exact getExecutionHistory output, to inspect parentElementId relationships.
  if (raw) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Raw <code className="rounded bg-muted px-1">getExecutionHistory</code> output
          </p>
          <Button variant="default" onClick={() => setRaw(false)}>
            ← Back to timeline
          </Button>
        </div>
        <Card padded={false}>
          <pre className="max-h-[70vh] overflow-auto p-4 font-mono text-[11px] leading-relaxed text-muted-foreground">
            {JSON.stringify(hist.data, null, 2)}
          </pre>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Execution history grouped by parent element</p>
        <Button variant="ghost" onClick={() => setRaw(true)}>
          Show raw
        </Button>
      </div>

      {groups.length === 0 ? (
        <EmptyState title="No execution history" hint="No user-facing steps have run yet." />
      ) : (
        groups.map((g, gi) => (
          <Card key={`${g.stage}:${gi}`} padded={false}>
            <div className="flex items-center justify-between border-b px-5 py-3">
              <h3 className="text-[14px] font-semibold">{g.stage}</h3>
              {g.status && <Badge tone={statusTone(g.status)}>{humanize(g.status)}</Badge>}
            </div>
            <ol className="relative my-4 ml-6 border-l pr-5">
              {g.events.map((ev: HistoryEvent) => {
                const tone = statusTone(ev.status);
                return (
                  <li key={ev.elementId} className="mb-4 ml-5 last:mb-0">
                    <span className={`absolute -left-[7px] mt-1 h-3.5 w-3.5 rounded-full border-2 border-background ${dot(tone)}`} />
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold">{ev.label}</span>
                        <ActorBadge actor={ev.actor} />
                      </span>
                      <span className="shrink-0 text-[11px] text-muted-foreground">{formatDate(ev.startedTime)}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <Badge tone={tone}>{humanize(ev.status)}</Badge>
                      {ev.completedTime && (
                        <span className="text-[11px] text-muted-foreground">completed {formatDate(ev.completedTime, false)}</span>
                      )}
                      {ev.externalLink && (
                        <a
                          href={ev.externalLink}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] font-medium text-primary hover:underline"
                        >
                          Open task ↗
                        </a>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </Card>
        ))
      )}
    </div>
  );
}
