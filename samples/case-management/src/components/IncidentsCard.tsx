import { useAuth } from '@/hooks/useAuth';
import { useAsync } from '@/hooks/useAsync';
import { getCaseIncidents, sanitizeElementName } from '@/lib/sdk';
import { Card, Badge } from '@/components/ui';
import { formatDate, humanize } from '@/lib/format';
import { AlertIcon } from '@/components/icons';
import type { CaseIncident } from '@/lib/types';

function severityTone(sev?: string): 'red' | 'amber' | 'gray' {
  const s = (sev || '').toLowerCase();
  if (s === 'error') return 'red';
  if (s === 'warning') return 'amber';
  return 'gray';
}

/**
 * Live incidents for a case instance (ProcessInstances.getIncidents). Renders an
 * alert card when there are open/known incidents; renders nothing when clear.
 * Pass `showEmpty` to render a muted "no incidents" state instead.
 */
export function IncidentsCard({
  instanceId,
  folderKey,
  showEmpty = false,
}: {
  instanceId: string;
  folderKey: string;
  showEmpty?: boolean;
}) {
  const { sdk } = useAuth();
  const { data, loading } = useAsync(
    () => getCaseIncidents(sdk, instanceId, folderKey).catch(() => [] as CaseIncident[]),
    [instanceId, folderKey],
  );

  if (loading) return null;
  const incidents = data ?? [];
  const open = incidents.filter((i) => (i.incidentStatus || '').toLowerCase() !== 'closed');

  if (incidents.length === 0) {
    return showEmpty ? (
      <Card>
        <p className="text-sm text-muted-foreground">No incidents for this case.</p>
      </Card>
    ) : null;
  }

  return (
    <Card padded={false} className="border-destructive/30">
      <div className="flex items-center gap-2 border-b border-destructive/20 bg-destructive/5 px-5 py-3">
        <AlertIcon width={16} height={16} className="text-destructive" />
        <span className="text-[13px] font-semibold text-destructive">
          {incidents.length} incident{incidents.length === 1 ? '' : 's'}
          {open.length > 0 && open.length < incidents.length ? ` · ${open.length} open` : ''}
        </span>
      </div>
      <ul className="divide-y">
        {incidents.map((inc) => (
          <li key={inc.incidentId} className="px-5 py-3">
            <div className="flex items-start justify-between gap-3">
              <span className="text-[13px] font-medium">
                {inc.errorMessage || inc.errorCode || 'Incident'}
              </span>
              <span className="flex shrink-0 items-center gap-1.5">
                {inc.incidentSeverity && <Badge tone={severityTone(inc.incidentSeverity)}>{humanize(inc.incidentSeverity)}</Badge>}
                {inc.incidentStatus && (
                  <Badge tone={(inc.incidentStatus || '').toLowerCase() === 'closed' ? 'gray' : 'red'}>
                    {humanize(inc.incidentStatus)}
                  </Badge>
                )}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
              {(inc.elementActivityName || inc.elementId) && (
                <span>at {sanitizeElementName(inc.elementActivityName, inc.elementId) || inc.elementActivityName}</span>
              )}
              {inc.errorTime && <span>{formatDate(inc.errorTime)}</span>}
              {inc.errorCode && <span className="font-mono">{inc.errorCode}</span>}
              {inc.incidentType && <span>{humanize(inc.incidentType)}</span>}
            </div>
            {inc.errorDetails && inc.errorDetails !== inc.errorMessage && (
              <p className="mt-1.5 whitespace-pre-wrap break-words rounded bg-muted p-2 font-mono text-[11px] text-muted-foreground">
                {inc.errorDetails}
              </p>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
