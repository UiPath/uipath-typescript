import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAsync } from '@/hooks/useAsync';
import { getCaseActionTasks } from '@/lib/sdk';
import { Card, Badge, Loading, ErrorState, EmptyState } from '@/components/ui';
import { TaskDetail } from '@/components/TaskDetail';
import { formatDate, priorityTone } from '@/lib/format';
import type { ActionTask } from '@/lib/types';

export function ActionsTab({ instanceId }: { instanceId: string }) {
  const { sdk } = useAuth();
  const { data, loading, error } = useAsync(() => getCaseActionTasks(sdk, instanceId), [instanceId]);
  const [filter, setFilter] = useState<'Open' | 'Completed'>('Open');
  const [selected, setSelected] = useState<ActionTask | null>(null);

  const { open, completed } = useMemo(() => {
    const all = data ?? [];
    return {
      open: all.filter((t) => String(t.status || '').toLowerCase() !== 'completed'),
      completed: all.filter((t) => String(t.status || '').toLowerCase() === 'completed'),
    };
  }, [data]);

  if (loading) return <Loading label="Loading action tasks…" />;
  if (error) return <ErrorState message={error} />;
  if (!data || data.length === 0)
    return <EmptyState title="No action tasks" hint="No Action Center tasks are linked to this case." />;

  const list = filter === 'Open' ? open : completed;
  const active = selected ?? list[0] ?? null;

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
      <div>
        <div className="mb-3 flex gap-4 border-b">
          {(['Open', 'Completed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => {
                setFilter(f);
                setSelected(null);
              }}
              className={`-mb-px border-b-2 px-1 pb-2 text-sm font-medium ${
                filter === f ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {f} ({f === 'Open' ? open.length : completed.length})
            </button>
          ))}
        </div>
        <div className="space-y-2">
          {list.map((t) => {
            const isActive = active?.id === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setSelected(t)}
                className={`w-full rounded-lg border p-3 text-left transition ${
                  isActive ? 'border-primary/40 bg-primary/5 ring-1 ring-primary/20' : 'hover:bg-muted'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-semibold">{t.title}</span>
                  <Badge tone={priorityTone(String(t.priority))}>{String(t.priority)}</Badge>
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{t.taskAssigneeName || 'Unassigned'}</span>
                  <span>{formatDate(t.taskSlaDetail?.expiryTime, false)}</span>
                </div>
              </button>
            );
          })}
          {list.length === 0 && <div className="py-8 text-center text-sm text-muted-foreground">Nothing here.</div>}
        </div>
      </div>

      {active ? (
        <TaskDetail key={active.id} task={active} />
      ) : (
        <Card>
          <div className="py-16 text-center text-sm text-muted-foreground">Select a task to open it</div>
        </Card>
      )}
    </div>
  );
}
