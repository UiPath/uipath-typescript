import { useAuth } from '@/hooks/useAuth';
import { useAsync } from '@/hooks/useAsync';
import { getCaseStages } from '@/lib/sdk';
import { Badge, Dot, Loading, ErrorState, EmptyState } from '@/components/ui';
import { formatDate, humanize, statusTone } from '@/lib/format';
import { BotIcon, UserIcon, ApiIcon, CheckIcon, ClockIcon } from '@/components/icons';
import type { StageTask } from '@/lib/types';

const TYPE_META: Record<string, { label: string; Icon: typeof BotIcon }> = {
  action: { label: 'Human task', Icon: UserIcon },
  agent: { label: 'Agent', Icon: BotIcon },
  'external-agent': { label: 'Agent', Icon: BotIcon },
  process: { label: 'Process', Icon: BotIcon },
  rpa: { label: 'RPA', Icon: BotIcon },
  'api-workflow': { label: 'API workflow', Icon: ApiIcon },
};

function TaskCard({ task }: { task: StageTask }) {
  const meta = TYPE_META[String(task.type || '').toLowerCase()] ?? { label: humanize(String(task.type)), Icon: ApiIcon };
  const done = task.status.toLowerCase().includes('complet');
  return (
    <div className="rounded-lg border bg-card p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[13px] font-semibold leading-snug">{task.name}</span>
        <meta.Icon width={15} height={15} className="mt-0.5 shrink-0 text-muted-foreground" />
      </div>
      <div className="mt-1.5 text-[11px] text-muted-foreground">{meta.label}</div>
      <div className="mt-2 flex items-center gap-1.5 text-[11px]">
        {done ? (
          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <CheckIcon width={12} height={12} /> {formatDate(task.completedTime, false)}
          </span>
        ) : (
          <span className="flex items-center gap-1 text-muted-foreground">
            <ClockIcon width={12} height={12} /> {humanize(task.status)}
          </span>
        )}
      </div>
    </div>
  );
}

export function StagesTab({ instanceId, folderKey }: { instanceId: string; folderKey: string }) {
  const { sdk } = useAuth();
  const { data, loading, error } = useAsync(() => getCaseStages(sdk, instanceId, folderKey), [instanceId, folderKey]);

  if (loading) return <Loading label="Loading stages…" />;
  if (error) return <ErrorState message={error} />;
  if (!data || data.length === 0) return <EmptyState title="No stages" hint="This case has no stage configuration." />;

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {data.map((stage) => {
        const tasks = (stage.tasks ?? []).flat();
        return (
          <div key={stage.id} className="flex w-72 shrink-0 flex-col">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Dot tone={statusTone(stage.status)} />
                <span className="text-[13px] font-semibold">{stage.name}</span>
              </div>
              <span className="text-[11px] text-muted-foreground">{tasks.length}</span>
            </div>
            <div className="mb-2">
              <Badge tone={statusTone(stage.status)}>{humanize(stage.status)}</Badge>
              {stage.sla?.length != null && (
                <span className="ml-2 text-[11px] text-muted-foreground">
                  SLA {stage.sla.length}
                  {stage.sla.duration}
                </span>
              )}
            </div>
            <div className="flex-1 space-y-2 rounded-xl bg-muted/50 p-2">
              {tasks.length === 0 ? (
                <div className="py-6 text-center text-[11px] text-muted-foreground">No tasks</div>
              ) : (
                tasks.map((t) => <TaskCard key={t.id} task={t} />)
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
