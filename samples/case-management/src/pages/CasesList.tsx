import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAsync } from '@/hooks/useAsync';
import { useCases } from '@/hooks/useCases';
import { useInstancePages } from '@/hooks/useInstancePages';
import { caseLabel, getSlaSummaryAll } from '@/lib/sdk';
import { Card, Badge, PageHeader, Loading, ErrorState, Spinner, SlaBadge, CursorPagination } from '@/components/ui';
import { Input } from '@uipath/apollo-wind/components/ui/input';
import { Button } from '@uipath/apollo-wind/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@uipath/apollo-wind/components/ui/table';
import { formatDate, humanize, statusTone } from '@/lib/format';
import { SearchIcon } from '@/components/icons';
import type { CaseInstance, CaseSla } from '@/lib/types';

const STATUS_FILTERS = ['All', 'Running', 'Completed', 'Paused', 'Faulted'] as const;

export function CasesList() {
  const { sdk } = useAuth();
  const navigate = useNavigate();
  const { caseProcessKey, caseDefinition } = useCases();
  const { items, page, setPage, hasNext, loading, error } = useInstancePages(25, caseProcessKey);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<string>('All');

  // SLA summary is one lazy aggregate query (only when this page is open) used to
  // annotate the rows; it is NOT a per-case detail fetch.
  const slaQ = useAsync(() => getSlaSummaryAll(sdk).catch(() => [] as CaseSla[]), []);
  const sla = useMemo(() => new Map((slaQ.data ?? []).map((r) => [r.caseInstanceId, r])), [slaQ.data]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => {
      const s = i.latestRunStatus.toLowerCase();
      if (status === 'Running' && !['running', 'in progress', 'inprogress', 'active', 'resuming'].includes(s)) return false;
      if (status === 'Completed' && !['completed', 'closed'].includes(s)) return false;
      if (status === 'Paused' && !['paused', 'pausing'].includes(s)) return false;
      if (status === 'Faulted' && !['faulted', 'failed'].includes(s)) return false;
      if (!q) return true;
      return caseLabel(i).toLowerCase().includes(q) || (i.caseType || '').toLowerCase().includes(q);
    });
  }, [items, query, status]);

  if (loading && items.length === 0) return <Loading label="Loading cases…" />;
  if (error)
    return (
      <div className="p-7">
        <ErrorState message={error} />
      </div>
    );

  return (
    <div className="p-7">
      <PageHeader title={caseDefinition?.name ?? 'Cases'} subtitle="Case instances — open one to load its details" />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative">
          <SearchIcon width={16} height={16} className="absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter this page…"
            className="w-64 pl-8"
          />
        </div>
        <div className="flex flex-wrap gap-1 rounded-lg border p-0.5">
          {STATUS_FILTERS.map((s) => (
            <Button
              key={s}
              variant={status === s ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setStatus(s)}
            >
              {s}
            </Button>
          ))}
        </div>
        {(loading || slaQ.loading) && (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Spinner className="h-3.5 w-3.5" /> loading…
          </span>
        )}
      </div>

      <Card padded={false}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Case</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>SLA</TableHead>
              <TableHead>SLA due</TableHead>
              <TableHead>Started</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((inst: CaseInstance) => {
              const s = sla.get(inst.instanceId);
              const overdue = s?.slaStatus === 'breached';
              return (
                <TableRow
                  key={inst.instanceId}
                  onClick={() =>
                    navigate(`/cases/${encodeURIComponent(inst.folderKey)}/${encodeURIComponent(inst.instanceId)}`)
                  }
                  className={`cursor-pointer ${overdue ? 'bg-destructive/5' : ''}`}
                >
                  <TableCell className="font-medium text-primary">{caseLabel(inst)}</TableCell>
                  <TableCell className="text-muted-foreground">{inst.caseType || '—'}</TableCell>
                  <TableCell>
                    <Badge tone={statusTone(inst.latestRunStatus)}>{humanize(inst.latestRunStatus)}</Badge>
                  </TableCell>
                  <TableCell>{s ? <SlaBadge status={s.slaStatus} /> : <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell>
                    {s?.slaDueTime ? (
                      <span className={overdue ? 'text-destructive' : s?.slaStatus === 'at-risk' ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}>
                        {formatDate(s.slaDueTime, false)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(inst.startedTime, false)}</TableCell>
                </TableRow>
              );
            })}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                  No cases on this page match your filter.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <CursorPagination page={page} hasNext={hasNext} onPage={setPage} count={items.length} />
      </Card>
    </div>
  );
}
