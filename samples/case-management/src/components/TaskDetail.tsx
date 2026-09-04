import { useState } from 'react';
import { CalendarClock, ChevronDown, ChevronRight, ExternalLink, User } from 'lucide-react';
import { Badge, Card, SlaBadge } from '@/components/ui';
import { Button } from '@uipath/apollo-wind/components/ui/button';
import { Avatar, AvatarFallback } from '@uipath/apollo-wind/components/ui/avatar';
import { Input } from '@uipath/apollo-wind/components/ui/input';
import { Label } from '@uipath/apollo-wind/components/ui/label';
import { Skeleton } from '@uipath/apollo-wind/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@uipath/apollo-wind/components/ui/tabs';
import { Alert, AlertDescription } from '@uipath/apollo-wind/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { useAsync } from '@/hooks/useAsync';
import { buildTaskUrl, getEmbedTaskUrl } from '@/lib/taskUrl';
import { completeTask, getTaskById, slaStatusOf } from '@/lib/sdk';
import { buildTaskFields } from '@/lib/taskForm';
import { buildCompletion, describeTaskType, loadTaskForm, saveTaskDraft } from '@/lib/taskSchema';
import type { TaskFormOutcome } from '@/lib/taskSchema';
import { formatDate, humanize, initials, looksLikeMoney, priorityTone, statusTone } from '@/lib/format';
import type { ActionTask } from '@/lib/types';
import { TaskForm, ValueView } from '@/components/TaskForm';

function FieldValue({ value }: { value: unknown }) {
  if (value === null || value === undefined || value === '') return <span className="text-muted-foreground">—</span>;
  if (typeof value === 'boolean') return <Badge tone={value ? 'green' : 'gray'}>{value ? 'Yes' : 'No'}</Badge>;
  if (typeof value === 'object') return <ValueView kind="json" value={value} />;
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

function RawToggle({ label, value }: { label: string; value: unknown }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-5 border-t pt-3">
      <button
        onClick={() => setOpen((s) => !s)}
        className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        {label}
      </button>
      {open && (
        <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted/60 p-3 font-mono text-[11px] leading-relaxed">
          {JSON.stringify(value, null, 2)}
        </pre>
      )}
    </div>
  );
}

/**
 * Action Center task, rendered two ways behind tabs:
 *
 *  - **Form** (default) — a native form built from the task's schema. App tasks
 *    (coded and low-code action apps) get theirs from `GetAppTaskByKey`; Quick
 *    Form tasks from `TaskSchemas/GetByKey` (see lib/taskSchema.ts). Outcomes
 *    complete the task through `Tasks.complete`, and drafts persist through
 *    `Tasks.saveData`. Tasks without a schema (External, legacy Form) fall back
 *    to a key/value view of `data` with a free-text action.
 *  - **Action Center** — the task embedded from Action Center itself, for the
 *    exact experience the app designer built, including anything the schema
 *    can't express (custom widgets, documents, validations).
 */
export function TaskDetail({
  task,
  caseLabel,
  onOpenCase,
  onChanged,
}: {
  task: ActionTask;
  caseLabel?: string;
  onOpenCase?: () => void;
  /** Called after the task is completed or saved so the owning list can refresh. */
  onChanged?: () => void;
}) {
  const { sdk, tenant } = useAuth();
  const [embedLoaded, setEmbedLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [freeAction, setFreeAction] = useState(task.action || '');

  // The list endpoint returns a summary; the full task (Tasks.getById) resolves
  // type-specific payloads. The schema bundle loads in parallel — it only needs
  // id / key / folderId / type, which the summary already has.
  const full = useAsync(() => getTaskById(sdk, task.id, task.folderId, task.type), [task.id, task.folderId]);
  const form = useAsync(() => loadTaskForm(sdk, task), [task.id, task.folderId]);
  const t = full.data ?? task;

  const taskUrl = buildTaskUrl(task.id, { tenant });
  const embedUrl = getEmbedTaskUrl(taskUrl);
  const assignee = t.taskAssigneeName || 'Unassigned';
  const due = t.taskSlaDetail?.expiryTime;
  const isCompleted = t.isCompleted || String(t.status).toLowerCase() === 'completed';

  // Fallback view for schema-less tasks: values (with formLayout labels if any).
  // With no schema the bundle only echoes the summary task's `data`, which the
  // list endpoint leaves empty — prefer the full task from `getById`.
  const fallbackData = (Object.keys((t.data ?? {}) as object).length ? t.data : form.data?.data) ?? {};
  const fallbackFields = buildTaskFields({ ...t, data: fallbackData as Record<string, unknown> });

  const runAction = async (label: string, fn: () => Promise<void>) => {
    setBusy(true);
    setActionError(null);
    setNotice(null);
    try {
      await fn();
      setNotice(label);
      full.reload();
      form.reload();
      onChanged?.();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : `${label} failed`);
    } finally {
      setBusy(false);
    }
  };

  const submit = (outcome: TaskFormOutcome, data: Record<string, unknown>) =>
    runAction(`Completed with “${outcome.label}”`, () => completeTask(sdk, t, buildCompletion(t, outcome.key, data)));
  const saveDraft = (data: Record<string, unknown>) => runAction('Draft saved', () => saveTaskDraft(sdk, t, data));
  const completeFree = () =>
    runAction(`Completed with “${freeAction.trim()}”`, () =>
      completeTask(sdk, t, buildCompletion(t, freeAction.trim(), fallbackData as Record<string, unknown>)),
    );

  return (
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
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
            <Badge tone="gray">{describeTaskType(String(t.type))}</Badge>
            {form.data?.model?.appType && (
              <Badge tone="violet">{form.data.model.appType === 'Coded' ? 'Coded app' : 'Low-code app'}</Badge>
            )}
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

      <Tabs defaultValue="form" className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-2 border-b px-5 pt-2">
          <TabsList>
            <TabsTrigger value="form">Form</TabsTrigger>
            <TabsTrigger value="embed">Action Center</TabsTrigger>
          </TabsList>
          <a
            href={taskUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            Open in Action Center <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        {/* Native, schema-driven rendering */}
        <TabsContent value="form" className="mt-0 min-h-0 flex-1 overflow-y-auto p-5">
          {full.loading || form.loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-5 w-full" />
                </div>
              ))}
            </div>
          ) : form.data?.model ? (
            <>
              {notice && (
                <Alert className="mb-4">
                  <AlertDescription>{notice}</AlertDescription>
                </Alert>
              )}
              <TaskForm
                key={`${t.id}:${t.lastModifiedTime ?? ''}`}
                model={form.data.model}
                initialData={form.data.data}
                readOnly={isCompleted}
                busy={busy}
                error={actionError}
                onSubmit={submit}
                onSave={isCompleted ? undefined : saveDraft}
              />
              <RawToggle label={`${form.data.model.source === 'quick-form' ? 'Quick Form' : 'Action app'} schema (raw)`} value={form.data.model.raw} />
            </>
          ) : (
            <>
              {form.data?.reason === 'error' && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>
                    Could not load the task schema — showing raw values instead. {form.data.error}
                  </AlertDescription>
                </Alert>
              )}
              {form.data?.reason === 'no-schema' && (
                <p className="mb-4 text-xs text-muted-foreground">
                  Action Center returned no schema for this task, so its values are shown as stored. For app tasks this
                  usually means the token lacks the <span className="font-medium">Apps.Read</span> scope.
                </p>
              )}
              {form.data?.reason === 'empty-schema' && (
                <p className="mb-4 text-xs text-muted-foreground">
                  Action Center returned an empty schema for this task — the app version it points at declares no fields or
                  outcomes — so its values are shown as stored.
                </p>
              )}
              {fallbackFields.length > 0 ? (
                <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                  {fallbackFields.map((f) => {
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
              ) : (
                <p className="text-sm text-muted-foreground">This task carries no data.</p>
              )}

              {!isCompleted && (
                <div className="mt-5 border-t pt-4">
                  <Label htmlFor="free-action" className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Complete with action
                  </Label>
                  <div className="mt-1 flex gap-2">
                    <Input
                      id="free-action"
                      value={freeAction}
                      placeholder="e.g. Approve"
                      onChange={(e) => setFreeAction(e.target.value)}
                      className="max-w-xs"
                    />
                    <Button size="sm" onClick={completeFree} disabled={busy || !freeAction.trim()}>
                      {busy ? 'Completing…' : 'Complete'}
                    </Button>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    No schema is available for this task type, so type the action the workflow expects.
                  </p>
                </div>
              )}
              {notice && (
                <Alert className="mt-4">
                  <AlertDescription>{notice}</AlertDescription>
                </Alert>
              )}
              {actionError && (
                <Alert variant="destructive" className="mt-4">
                  <AlertDescription>{actionError}</AlertDescription>
                </Alert>
              )}
              {t.formLayout && Object.keys(t.formLayout).length > 0 && <RawToggle label="Form layout (raw)" value={t.formLayout} />}
            </>
          )}
        </TabsContent>

        {/* The same task as Action Center renders it, embedded */}
        <TabsContent value="embed" className="relative mt-0 min-h-0 flex-1 bg-muted/30">
          {!embedLoaded && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
              Loading task…
            </div>
          )}
          <iframe src={embedUrl} title={t.title} className="h-full min-h-[420px] w-full border-0" onLoad={() => setEmbedLoaded(true)} />
        </TabsContent>
      </Tabs>
    </Card>
  );
}
