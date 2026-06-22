import { useState } from 'react';
import { CalendarClock, ChevronDown, ChevronRight, ExternalLink, PanelRightOpen, User } from 'lucide-react';
import { Badge, Card, SlaBadge } from '@/components/ui';
import { Button } from '@uipath/apollo-wind/components/ui/button';
import { Avatar, AvatarFallback } from '@uipath/apollo-wind/components/ui/avatar';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@uipath/apollo-wind/components/ui/sheet';
import { Skeleton } from '@uipath/apollo-wind/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useAsync } from '@/hooks/useAsync';
import { buildTaskUrl, getEmbedTaskUrl } from '@/lib/taskUrl';
import { getTaskById, slaStatusOf } from '@/lib/sdk';
import { buildTaskFields, taskTypeLabel } from '@/lib/taskForm';
import { formatDate, humanize, initials, looksLikeMoney, priorityTone, statusTone } from '@/lib/format';
import type { ActionTask } from '@/lib/types';

function FieldValue({ value }: { value: unknown }) {
  if (value === null || value === undefined || value === '') return <span className="text-muted-foreground">—</span>;
  if (typeof value === 'boolean') return <Badge tone={value ? 'green' : 'gray'}>{value ? 'Yes' : 'No'}</Badge>;
  if (typeof value === 'object') {
    return (
      <pre className="mt-0.5 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted/60 p-2 font-mono text-[11px] leading-relaxed">
        {JSON.stringify(value, null, 2)}
      </pre>
    );
  }
  const s = String(value);
  return <span className={looksLikeMoney(s) ? 'font-semibold text-emerald-600 dark:text-emerald-400' : 'font-medium'}>{s}</span>;
}

function MetaItem({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-0.5 truncate text-sm">{children}</div>
    </div>
  );
}

/**
 * Native rendering of an Action Center task. The list endpoint returns only a
 * summary, so on selection we fetch the full task (Tasks.getById, which resolves
 * formLayout + data) and build a display schema from its properties. The live
 * interactive form stays available via the Action Center embed.
 */
export function TaskDetail({
  task,
  caseLabel,
  onOpenCase,
}: {
  task: ActionTask;
  caseLabel?: string;
  onOpenCase?: () => void;
}) {
  const { sdk, tenant } = useAuth();
  const [formOpen, setFormOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [showSchema, setShowSchema] = useState(false);

  const full = useAsync(() => getTaskById(sdk, task.id, task.folderId, task.type), [task.id, task.folderId]);
  const t = full.data ?? task;

  const taskUrl = buildTaskUrl(task.id, { tenant });
  const embedUrl = getEmbedTaskUrl(taskUrl);
  const assignee = t.taskAssigneeName || 'Unassigned';
  const due = t.taskSlaDetail?.expiryTime;
  const fields = buildTaskFields(t);
  const hasSchema = !!t.formLayout && Object.keys(t.formLayout).length > 0;

  return (
    <>
      <Card padded={false} className="flex h-full min-h-[420px] flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-base font-semibold">{t.title}</h3>
              {caseLabel && (
                <button
                  onClick={onOpenCase}
                  className="mt-0.5 truncate text-xs text-primary hover:underline disabled:no-underline"
                  disabled={!onOpenCase}
                >
                  {caseLabel}
                </button>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <Badge tone="gray">{taskTypeLabel(t.type)}</Badge>
              <Badge tone={priorityTone(String(t.priority))}>{String(t.priority)}</Badge>
              <Badge tone={statusTone(String(t.status))}>{humanize(String(t.status))}</Badge>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <MetaItem icon={<User className="h-3 w-3" />} label="Assignee">
              <span className="flex items-center gap-1.5">
                {t.taskAssigneeName && (
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="bg-primary/10 text-[9px] font-semibold text-primary">
                      {initials(t.taskAssigneeName)}
                    </AvatarFallback>
                  </Avatar>
                )}
                <span className="truncate">{assignee}</span>
              </span>
            </MetaItem>
            <MetaItem icon={<CalendarClock className="h-3 w-3" />} label="Created">
              {formatDate(t.createdTime, false)}
            </MetaItem>
            <MetaItem icon={<CalendarClock className="h-3 w-3" />} label="SLA due">
              <span className="flex items-center gap-1.5">
                <SlaBadge status={slaStatusOf(due)} />
                {due ? formatDate(due, false) : ''}
              </span>
            </MetaItem>
          </div>
        </div>

        {/* Form values (schema-driven, from formLayout + data) */}
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {full.loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-5 w-full" />
                </div>
              ))}
            </div>
          ) : fields.length > 0 ? (
            <>
              <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                {fields.map((f) => {
                  const isObject = f.value !== null && typeof f.value === 'object';
                  return (
                    <div key={f.key} className={isObject ? 'sm:col-span-2' : ''}>
                      <dt className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                        {f.label}
                        {f.type && <span className="rounded bg-muted px-1 py-0.5 text-[9px] normal-case">{f.type}</span>}
                      </dt>
                      <dd className="mt-0.5 text-sm">
                        <FieldValue value={f.value} />
                      </dd>
                    </div>
                  );
                })}
              </dl>

              {hasSchema && (
                <div className="mt-5 border-t pt-3">
                  <button
                    onClick={() => setShowSchema((s) => !s)}
                    className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                  >
                    {showSchema ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                    Form schema (raw)
                  </button>
                  {showSchema && (
                    <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted/60 p-3 font-mono text-[11px] leading-relaxed">
                      {JSON.stringify(t.formLayout, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              <PanelRightOpen className="h-7 w-7 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {taskTypeLabel(t.type) === 'Action App'
                  ? 'This is an Action App task — open the form to view and act on it.'
                  : 'No preview fields on this task. Open the form to view and act on it.'}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-2 border-t px-5 py-3">
          <Button size="sm" onClick={() => setFormOpen(true)}>
            <PanelRightOpen className="h-4 w-4" />
            Open form
          </Button>
          <a
            href={taskUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Action Center <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </Card>

      {/* Live interactive task form (Action Center embed), on demand */}
      <Sheet open={formOpen} onOpenChange={setFormOpen}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-3xl">
          <SheetHeader className="border-b px-5 py-4 text-left">
            <SheetTitle className="truncate pr-8">{t.title}</SheetTitle>
            <a
              href={taskUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-fit items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              Open in Action Center <ExternalLink className="h-3 w-3" />
            </a>
          </SheetHeader>
          <div className="relative min-h-0 flex-1 bg-muted/30">
            {!loaded && (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                Loading task…
              </div>
            )}
            <iframe src={embedUrl} title={t.title} className="h-full w-full border-0" onLoad={() => setLoaded(true)} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
