import { useAuth } from '@/hooks/useAuth';
import { useAsync } from '@/hooks/useAsync';
import { getCaseActionTasks } from '@/lib/sdk';
import { Card, Badge, Spinner } from '@/components/ui';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@uipath/apollo-wind/components/ui/table';
import { formatDate, humanize, statusTone, priorityTone, looksLikeMoney } from '@/lib/format';
import { IncidentsCard } from '@/components/IncidentsCard';
import { parseDetails, type VarContext } from '@/lib/expr';
import type { CaseInstance, CaseStage } from '@/lib/types';

/** Render an overview "details" blob, resolving =vars.* expressions against the context. */
function OverviewDetails({ details, ctx }: { details: string; ctx: VarContext }) {
  const pairs = parseDetails(details, ctx);
  if (pairs) {
    return (
      <dl className="divide-y">
        {pairs.map((p, i) => (
          <div key={i} className="flex items-start justify-between gap-4 py-2 text-sm">
            <dt className="text-muted-foreground">{p.label}</dt>
            <dd
              className={`text-right font-medium ${
                !p.resolved
                  ? 'font-mono text-[11px] text-muted-foreground'
                  : looksLikeMoney(p.value)
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : ''
              }`}
            >
              {p.value}
            </dd>
          </div>
        ))}
      </dl>
    );
  }
  return <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{details}</p>;
}

export function OverviewTab({
  inst,
  ctx,
  stages,
}: {
  inst: CaseInstance;
  ctx: VarContext;
  stages: CaseStage[];
}) {
  const { sdk } = useAuth();
  const tasks = useAsync(() => getCaseActionTasks(sdk, inst.instanceId), [inst.instanceId]);

  const overview = inst.caseAppConfig?.overview ?? [];
  const completedStages = stages.filter((s) => s.status.toLowerCase().includes('complet')).length;

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-5">
        {/* Live incidents for this case (shown only when there are any) */}
        <IncidentsCard instanceId={inst.instanceId} folderKey={inst.folderKey} />

        {/* Overview sections from caseAppConfig (resolved values only) */}
        {overview.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {overview.map((section, i) => (
              <Card key={i}>
                <h3 className="mb-2 text-[13px] font-semibold">{section.title}</h3>
                <OverviewDetails details={section.details} ctx={ctx} />
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <p className="text-sm text-muted-foreground">
              This case has no overview configured. Open the Stages, Actions or History tabs for live execution data.
            </p>
          </Card>
        )}

        {/* Action tasks for this case (CaseInstances.getActionTasks) */}
        <Card padded={false}>
          <div className="flex items-center justify-between px-5 py-3.5">
            <h3 className="text-[15px] font-semibold">Actions</h3>
            {tasks.loading && <Spinner className="h-4 w-4" />}
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Assignee</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>State</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(tasks.data ?? []).map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.title}</TableCell>
                  <TableCell className="text-muted-foreground">{t.taskAssigneeName || 'Unassigned'}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(t.taskSlaDetail?.expiryTime, false)}</TableCell>
                  <TableCell>
                    <Badge tone={priorityTone(String(t.priority))}>{String(t.priority)}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge tone={statusTone(String(t.status))}>{humanize(String(t.status))}</Badge>
                  </TableCell>
                </TableRow>
              ))}
              {tasks.data && tasks.data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                    No action tasks for this case.
                  </TableCell>
                </TableRow>
              )}
              {tasks.error && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-destructive">
                    {tasks.error}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Right rail */}
      <div className="space-y-4">
        <Card>
          <h3 className="mb-3 text-[13px] font-semibold">Case progress</h3>
          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {completedStages} of {stages.length} stages complete
            </span>
            <span>{stages.length ? Math.round((completedStages / stages.length) * 100) : 0}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${stages.length ? (completedStages / stages.length) * 100 : 0}%` }}
            />
          </div>
          <ul className="mt-3 space-y-1.5">
            {stages.map((s) => (
              <li key={s.id} className="flex items-center justify-between text-[13px]">
                <span className="text-muted-foreground">{s.name}</span>
                <Badge tone={statusTone(s.status)}>{humanize(s.status)}</Badge>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <h3 className="mb-2 text-[13px] font-semibold">Details</h3>
          <Meta label="Case type" value={inst.caseType || '—'} />
          <Meta label="Started" value={formatDate(inst.startedTime)} />
          <Meta label="Started by" value={inst.startedByUser || 'Unknown'} />
          <Meta label="Completed" value={inst.completedTime ? formatDate(inst.completedTime) : '—'} />
        </Card>
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-t py-2 text-sm first:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="max-w-[60%] truncate text-right font-medium" title={value}>
        {value}
      </span>
    </div>
  );
}
