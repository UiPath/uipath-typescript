import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAsync } from '@/hooks/useAsync';
import { useCases } from '@/hooks/useCases';
import { useInstancePages } from '@/hooks/useInstancePages';
import { getCaseActionTasks, caseLabel, slaStatusOf } from '@/lib/sdk';
import { Badge, PageHeader, Loading, ErrorState, EmptyState, Spinner, SlaBadge, CursorPagination, Card } from '@/components/ui';
import { TaskDetail } from '@/components/TaskDetail';
import { formatDate, priorityTone } from '@/lib/format';
import type { ActionTask, CaseInstance } from '@/lib/types';

type Row = ActionTask & { _case: CaseInstance };

export function ActionsPage() {
  const { sdk } = useAuth();
  const navigate = useNavigate();
  const { caseProcessKey, caseDefinition } = useCases();
  const { items, page, setPage, hasNext, loading: pageLoading, error: pageError } = useInstancePages(25, caseProcessKey);
  const [tab, setTab] = useState<'Open' | 'Completed'>('Open');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Action tasks come from CaseInstances.getActionTasks — for the cases on this page only.
  const tasksQ = useAsync(async () => {
    const results = await Promise.allSettled(
      items.map((inst) => getCaseActionTasks(sdk, inst.instanceId).then((tasks) => ({ inst, tasks }))),
    );
    const rows: Row[] = [];
    for (const r of results) if (r.status === 'fulfilled') for (const t of r.value.tasks) rows.push({ ...t, _case: r.value.inst });
    return rows;
  }, [items.map((i) => i.instanceId).join(',')]);

  const { open, completed } = useMemo(() => {
    const all = tasksQ.data ?? [];
    return {
      open: all.filter((t) => String(t.status || '').toLowerCase() !== 'completed'),
      completed: all.filter((t) => String(t.status || '').toLowerCase() === 'completed'),
    };
  }, [tasksQ.data]);

  const list = tab === 'Open' ? open : completed;
  const rowKey = (t: Row) => `${t._case.instanceId}:${t.id}`;
  const active = list.find((t) => rowKey(t) === selectedId) ?? list[0] ?? null;

  if (pageLoading && items.length === 0) return <Loading label="Loading cases…" />;
  if (pageError)
    return (
      <div className="p-7">
        <ErrorState message={pageError} />
      </div>
    );

  return (
    <div className="flex h-full flex-col p-7">
      <PageHeader
        title={caseDefinition ? `Actions · ${caseDefinition.name}` : 'Actions'}
        subtitle={`Action tasks across ${items.length} case instance${items.length === 1 ? '' : 's'} on this page`}
        right={tasksQ.loading ? <Spinner /> : undefined}
      />

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 lg:grid-cols-[380px_minmax(0,1fr)]">
        {/* Task list */}
        <div className="flex min-h-0 flex-col">
          <div className="mb-3 flex shrink-0 gap-4 border-b">
            {(['Open', 'Completed'] as const).map((t) => (
              <button
                key={t}
                onClick={() => {
                  setTab(t);
                  setSelectedId(null);
                }}
                className={`-mb-px border-b-2 px-1 pb-2.5 text-sm font-medium ${
                  tab === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {t} ({t === 'Open' ? open.length : completed.length})
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          {tasksQ.error ? (
            <ErrorState message={tasksQ.error} />
          ) : list.length === 0 ? (
            <EmptyState title={`No ${tab.toLowerCase()} action tasks on this page`} />
          ) : (
            <div className="space-y-2">
              {list.map((t) => {
                const k = rowKey(t);
                const isActive = active && rowKey(active) === k;
                return (
                  <button
                    key={k}
                    onClick={() => setSelectedId(k)}
                    className={`w-full rounded-lg border p-3 text-left transition ${
                      isActive ? 'border-primary/40 bg-primary/5 ring-1 ring-primary/20' : 'hover:bg-muted'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-[13px] font-semibold">{t.title}</span>
                      <Badge tone={priorityTone(String(t.priority))}>{String(t.priority)}</Badge>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                      <span className="truncate text-primary">{caseLabel(t._case)}</span>
                      <span className="flex shrink-0 items-center gap-1.5">
                        <SlaBadge status={slaStatusOf(t.taskSlaDetail?.expiryTime)} />
                        {formatDate(t.taskSlaDetail?.expiryTime, false)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          </div>

          <Card padded={false} className="mt-2 shrink-0">
            <CursorPagination
              page={page}
              hasNext={hasNext}
              onPage={(p) => {
                setPage(p);
                setSelectedId(null);
              }}
              count={items.length}
            />
          </Card>
        </div>

        {/* Selected task — embedded Action Center task (the actual human task) */}
        <div className="min-h-0">
          {active ? (
            <TaskDetail
              key={`${active._case.instanceId}:${active.id}`}
              task={active}
              caseLabel={caseLabel(active._case)}
              onOpenCase={() =>
                navigate(`/cases/${encodeURIComponent(active._case.folderKey)}/${encodeURIComponent(active._case.instanceId)}`)
              }
            />
          ) : (
            <Card className="flex h-full min-h-[420px] items-center justify-center">
              <div className="text-center text-sm text-muted-foreground">Select a task to open it</div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
