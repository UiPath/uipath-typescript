import type { UiPath, PaginationCursor } from '@uipath/uipath-typescript/core';
import { Cases, CaseInstances, TimeInterval } from '@uipath/uipath-typescript/cases';
import { ProcessInstances } from '@uipath/uipath-typescript/maestro-processes';
import { Tasks } from '@uipath/uipath-typescript/tasks';
import type { TaskCompleteOptions, TaskDataGetResponse, TaskGetSchemaResponse } from '@uipath/uipath-typescript/tasks';
import { hoursUntil } from '@/lib/format';
import type {
  CaseInstance,
  CaseStage,
  ExecutionHistory,
  ElementExecution,
  ActionTask,
  CaseDefinition,
  CaseVariables,
  TaskSlaStatus,
  CaseSla,
  StageSla,
  SlaStatus,
  TopRunCount,
  TopFaultedCount,
  TopDuration,
  TopElementFailed,
  StatusTimelinePoint,
  ActorType,
  HistoryStageGroup,
  CaseIncident,
  ElementStat,
} from '@/lib/types';

/** For best-effort calls: log the failure and resolve to a fallback instead. */
export function orFallback<T>(label: string, fallback: T): (e: unknown) => T {
  return (e) => {
    console.warn(`${label} failed:`, e);
    return fallback;
  };
}

// ---- thin wrappers around the SDK (all data is live from the tenant) ----

export async function listCaseDefinitions(sdk: UiPath): Promise<CaseDefinition[]> {
  const cases = new Cases(sdk);
  return cases.getAll();
}

export async function getCaseInstance(
  sdk: UiPath,
  instanceId: string,
  folderKey: string,
): Promise<CaseInstance> {
  const ci = new CaseInstances(sdk);
  return ci.getById(instanceId, folderKey);
}

export async function getCaseStages(
  sdk: UiPath,
  instanceId: string,
  folderKey: string,
): Promise<CaseStage[]> {
  const ci = new CaseInstances(sdk);
  return ci.getStages(instanceId, folderKey);
}

/**
 * Action tasks of one case instance. The admin list covers every task in the
 * folders where the user can assign tasks; the plain list covers what the user
 * can work on without that permission. Both are read and merged, so a folder
 * admin sees the whole case and a reviewer still sees their own tasks.
 */
export async function getCaseActionTasks(sdk: UiPath, instanceId: string): Promise<ActionTask[]> {
  const ci = new CaseInstances(sdk);
  const results = await Promise.allSettled([
    ci.getActionTasks(instanceId, { pageSize: 100, asTaskAdmin: true }),
    ci.getActionTasks(instanceId, { pageSize: 100 }),
  ]);
  const byId = new Map<number, ActionTask>();
  const failures: unknown[] = [];
  for (const r of results) {
    if (r.status === 'rejected') failures.push(r.reason);
    else for (const t of r.value.items) if (!byId.has(t.id)) byId.set(t.id, t);
  }
  if (failures.length === results.length) throw failures[0];
  for (const f of failures) console.warn('getCaseActionTasks: one task list failed:', f);
  return [...byId.values()];
}

/**
 * Fetch the FULL task by id — `getActionTasks`/`getAll` return summaries without
 * `formLayout` (the form schema) or `data` (field values); `getById` resolves
 * them. Passing the known taskType skips the type-probe round-trip.
 */
export async function getTaskById(
  sdk: UiPath,
  id: number,
  folderId: number,
  taskType?: ActionTask['type'],
): Promise<ActionTask> {
  const tasks = new Tasks(sdk);
  return tasks.getById(id, taskType ? { taskType } : undefined, folderId);
}

/**
 * Task data + values for a task the list endpoints only summarize
 * (`Tasks.getDataById`).
 */
export async function getTaskData(sdk: UiPath, id: number, folderId: number): Promise<TaskDataGetResponse> {
  const tasks = new Tasks(sdk);
  return tasks.getDataById(id, { folderId });
}

/**
 * A task's schema: its fields and the outcomes it can be completed with
 * (`Tasks.getSchema`). App tasks and Quick Form tasks have one; for other
 * task types this resolves to null.
 */
export async function getTaskSchema(sdk: UiPath, id: number, folderId: number): Promise<TaskGetSchemaResponse | null> {
  const tasks = new Tasks(sdk);
  return tasks.getSchema(id, { folderId });
}

/** Persist a task's field values without completing it (`Tasks.saveData`). */
export async function saveTaskData(
  sdk: UiPath,
  task: Pick<ActionTask, 'id' | 'folderId' | 'type'>,
  data: Record<string, unknown>,
): Promise<void> {
  const tasks = new Tasks(sdk);
  await tasks.saveData(task.id, data, { folderId: task.folderId, type: task.type });
}

/**
 * Complete a task with an outcome and its form data (`Tasks.complete`). The
 * options carry the type so the SDK routes to the right endpoint (app / form /
 * generic); build them with `buildCompletion` from lib/taskSchema.ts.
 */
export async function completeTask(
  sdk: UiPath,
  task: Pick<ActionTask, 'id' | 'folderId'>,
  options: TaskCompleteOptions,
): Promise<void> {
  const tasks = new Tasks(sdk);
  const result = await tasks.complete({ ...options, taskId: task.id }, task.folderId);
  if (!result.success) throw new Error('The task did not complete successfully');
}

export async function getCaseHistory(
  sdk: UiPath,
  instanceId: string,
  folderKey: string,
): Promise<ExecutionHistory> {
  const ci = new CaseInstances(sdk);
  return ci.getExecutionHistory(instanceId, folderKey);
}

export async function getCaseVariables(
  sdk: UiPath,
  instanceId: string,
  folderKey: string,
): Promise<CaseVariables> {
  const ci = new CaseInstances(sdk);
  return ci.getVariables(instanceId, folderKey);
}

// ---- derived signals (computed from real data, never invented) ----

export function slaStatusOf(expiry?: string | null): TaskSlaStatus | null {
  const h = hoursUntil(expiry);
  if (h === null) return null;
  if (h < 0) return 'breached';
  if (h <= 24) return 'at-risk';
  return 'on-track';
}

export function caseLabel(inst: CaseInstance): string {
  return inst.caseTitle || inst.instanceDisplayName || 'Untitled case';
}

// ============================================================
// Pagination — cursor-based list of case instances
// ============================================================
export interface Page<T> {
  items: T[];
  nextCursor?: PaginationCursor;
  hasNextPage?: boolean;
  totalCount?: number;
}

export async function listCaseInstancesPage(
  sdk: UiPath,
  opts: { pageSize?: number; cursor?: PaginationCursor; processKey?: string } = {},
): Promise<Page<CaseInstance>> {
  const ci = new CaseInstances(sdk);
  const res = await ci.getAll({
    pageSize: opts.pageSize ?? 25,
    ...(opts.cursor ? { cursor: opts.cursor } : {}),
    ...(opts.processKey ? { processKey: opts.processKey } : {}),
  });
  return {
    items: res.items,
    nextCursor: res.nextCursor,
    hasNextPage: res.hasNextPage,
    totalCount: res.totalCount,
  };
}

// ============================================================
// SLA summary (Insights RTM — may be unprovisioned; callers must catch)
// ============================================================
export function mapSlaStatus(s?: string | null): SlaStatus {
  switch ((s || '').toLowerCase().replace(/\s+/g, '')) {
    case 'ontrack':
      return 'on-track';
    case 'atrisk':
      return 'at-risk';
    case 'overdue':
      return 'breached';
    case 'completed':
      return 'completed';
    default:
      return 'unknown';
  }
}

/** Bulk SLA summary for every case instance. Loops the cursor. Throws if RTM is not provisioned. */
export async function getSlaSummaryAll(sdk: UiPath): Promise<CaseSla[]> {
  const ci = new CaseInstances(sdk);
  const out: CaseSla[] = [];
  let cursor: PaginationCursor | undefined;
  for (let i = 0; i < 25; i++) {
    const res = await ci.getSlaSummary({ pageSize: 100, ...(cursor ? { cursor } : {}) });
    for (const r of res.items) {
      out.push({
        caseInstanceId: r.caseInstanceId,
        folderKey: r.folderKey,
        name: r.name,
        processKey: r.processKey,
        slaDueTime: r.slaDueTime ?? null,
        slaStatus: mapSlaStatus(r.slaStatus),
        instanceStatus: r.instanceStatus,
      });
    }
    if (!res.hasNextPage || !res.nextCursor) break;
    cursor = res.nextCursor;
  }
  return out;
}

/** Per-stage SLA for one case (Insights RTM). Returns [] on failure. */
export async function getCaseStageSla(sdk: UiPath, instanceId: string): Promise<StageSla[]> {
  const ci = new CaseInstances(sdk);
  try {
    const res = await ci.getStagesSlaSummary({ caseInstanceId: instanceId });
    const rec = res.find((x) => x.caseInstanceId === instanceId) ?? res[0];
    return (rec?.stages ?? []).map((s) => ({
      elementId: s.elementId,
      name: s.name,
      latestStatus: s.latestStatus,
      slaDueTime: s.slaDueTime || null,
      slaStatus: mapSlaStatus(s.slaStatus),
    }));
  } catch (e: unknown) {
    console.warn('getCaseStageSla failed:', e);
    return [];
  }
}

// ============================================================
// Cases insights / analytics (Insights RTM)
// ============================================================
function topOpts(processKey?: string) {
  return processKey ? { processKey } : undefined;
}
export async function insightsTopRunCount(
  sdk: UiPath,
  start: Date,
  end: Date,
  processKey?: string,
): Promise<TopRunCount[]> {
  return new Cases(sdk).getTopRunCount(start, end, topOpts(processKey));
}
export async function insightsTopFaultedCount(
  sdk: UiPath,
  start: Date,
  end: Date,
  processKey?: string,
): Promise<TopFaultedCount[]> {
  return new Cases(sdk).getTopFaultedCount(start, end, topOpts(processKey));
}
export async function insightsTopDuration(
  sdk: UiPath,
  start: Date,
  end: Date,
  processKey?: string,
): Promise<TopDuration[]> {
  return new Cases(sdk).getTopExecutionDuration(start, end, topOpts(processKey));
}
export async function insightsTopElementFailed(
  sdk: UiPath,
  start: Date,
  end: Date,
  processKey?: string,
): Promise<TopElementFailed[]> {
  return new Cases(sdk).getTopElementFailedCount(start, end, topOpts(processKey));
}
export async function insightsStatusTimeline(
  sdk: UiPath,
  start: Date,
  end: Date,
): Promise<StatusTimelinePoint[]> {
  return new Cases(sdk).getInstanceStatusTimeline(start, end, { groupBy: TimeInterval.Day });
}

/** Per-element execution stats for one case's package version (Insights RTM). */
export async function insightsElementStats(
  sdk: UiPath,
  processKey: string,
  packageId: string,
  packageVersion: string,
  start: Date,
  end: Date,
): Promise<ElementStat[]> {
  return new Cases(sdk).getElementStats({ processKey, packageId, packageVersion, startTime: start, endTime: end });
}

// ============================================================
// Case instance lifecycle operations
// ============================================================
export type LifecycleAction = 'pause' | 'resume' | 'close' | 'reopen';

/** Pause, resume or close a case instance. Returns whether it succeeded. */
export async function runLifecycle(
  sdk: UiPath,
  action: Exclude<LifecycleAction, 'reopen'>,
  instanceId: string,
  folderKey: string,
  comment?: string,
): Promise<boolean> {
  const ci = new CaseInstances(sdk);
  const opts = comment ? { comment } : undefined;
  switch (action) {
    case 'pause':
      return (await ci.pause(instanceId, folderKey, opts)).success;
    case 'resume':
      return (await ci.resume(instanceId, folderKey, opts)).success;
    case 'close':
      return (await ci.close(instanceId, folderKey, opts)).success;
  }
}

/** Reopen a case instance from the given stage. Returns whether it succeeded. */
export async function reopenCase(
  sdk: UiPath,
  instanceId: string,
  folderKey: string,
  stageId: string,
  comment?: string,
): Promise<boolean> {
  const ci = new CaseInstances(sdk);
  return (await ci.reopen(instanceId, folderKey, { stageId, comment })).success;
}

// ============================================================
// Incidents (a case instance is a process instance)
// ============================================================
export async function getCaseIncidents(
  sdk: UiPath,
  instanceId: string,
  folderKey: string,
): Promise<CaseIncident[]> {
  const pi = new ProcessInstances(sdk);
  const res = await pi.getIncidents(instanceId, folderKey);
  return res.map((r) => ({
    incidentId: r.incidentId,
    incidentStatus: r.incidentStatus,
    incidentType: r.incidentType,
    incidentSeverity: r.incidentSeverity,
    errorCode: r.errorCode,
    errorMessage: r.errorMessage,
    errorTime: r.errorTime,
    errorDetails: r.errorDetails,
    elementId: r.elementId,
    elementActivityName: r.incidentElementActivityName,
  }));
}

// ============================================================
// Execution-history sanitization, actor classification & parent grouping
// ============================================================
const ID_PREFIX_RE = /^[A-Za-z0-9]{6,}[_-]/; // strip random element-id prefix like "p1VMOsAkg_"

export function sanitizeElementName(name?: string | null, id?: string | null): string {
  let n = (name || id || '').trim();
  n = n.replace(ID_PREFIX_RE, '');
  n = n.replace(
    /(Service|Receive|Send|User|Script|Manual|Business|Call|Boundary|Intermediate|Catch|Throw)?(Task|Event|Activity|Node)$/i,
    '',
  );
  n = n.replace(/[_-]+/g, ' ').replace(/([a-z0-9])([A-Z])/g, '$1 $2').trim();
  return n ? n.charAt(0).toUpperCase() + n.slice(1) : '';
}

// Structural BPMN nodes carry no business meaning — drop them from the timeline.
const STRUCTURAL_TYPES = new Set([
  'StartEvent',
  'EndEvent',
  'IntermediateThrowEvent',
  'IntermediateCatchEvent',
  'BoundaryEvent',
  'ParallelGateway',
  'ExclusiveGateway',
  'InclusiveGateway',
  'SequenceFlow',
]);

/** A history element is noise if it's a structural node or has no display name. */
function isNoiseElement(el: ElementExecution): boolean {
  if (STRUCTURAL_TYPES.has(el.elementType || '')) return true;
  return sanitizeElementName(el.elementName, el.elementId).length === 0;
}

/**
 * Classify the actor from the element's UiPath semantics (authoritative), then
 * BPMN type, then name. `elementExtensionType` tells us exactly what ran.
 */
function actorOfElement(el: ElementExecution): ActorType {
  const ext = el.elementExtensionType || '';
  const t = el.elementType || '';
  if (/Agent/i.test(ext)) return 'agent'; // StartAgentJob, StartAgenticProcess
  if (ext === 'Actions.HITL' || t === 'UserTask') return 'human';
  if (ext === 'Orchestrator.ExecuteApiWorkflowAsync' || ext.startsWith('Intsvc.')) return 'api';
  if (ext === 'Orchestrator.StartJob') return 'automation'; // RPA
  if (ext.startsWith('Maestro.') || ext === 'Scp.Script') return 'system'; // engine internals
  if (t === 'ServiceTask' || t === 'ScriptTask' || t === 'Task' || t === 'CallActivity') return 'automation';
  return 'system';
}

/** Start time in ms for sorting; missing or invalid times sort last. */
const ts = (s?: string | null) => {
  const t = s ? new Date(s).getTime() : NaN;
  return Number.isNaN(t) ? Number.MAX_SAFE_INTEGER : t;
};

/**
 * Group execution history by PARENT ELEMENT (`parentElementId`).
 *
 * In Maestro the parent is the container an element ran under — typically an
 * event subprocess (Tasks/Event/Middleware) or the case root (parentElementId
 * === null). Groups are labelled with the parent element's own (sanitized) name.
 * Structural plumbing (gateways, start/end/boundary events, unnamed nodes) is
 * dropped; actor type comes from elementType/extensionType.
 */
export function buildHistoryGroups(
  history: ExecutionHistory | null | undefined,
): HistoryStageGroup[] {
  if (!history?.elementExecutions?.length) return [];
  const elements = history.elementExecutions;
  const elemById = new Map(elements.map((e) => [e.elementId, e]));

  const ROOT = '__root__';
  interface G {
    key: string;
    label: string;
    status?: string;
    events: HistoryStageGroup['events'];
    first: number;
  }
  const groups = new Map<string, G>();
  for (const el of elements) {
    if (isNoiseElement(el)) continue;
    const label = sanitizeElementName(el.elementName, el.elementId);
    const actor = actorOfElement(el);

    const pid = el.parentElementId || ROOT;
    let g = groups.get(pid);
    if (!g) {
      let groupLabel: string;
      let groupStatus: string | undefined;
      if (pid === ROOT) {
        groupLabel = 'Case (top level)';
      } else {
        const parent = elemById.get(pid);
        groupLabel = parent
          ? sanitizeElementName(parent.elementName, parent.elementId) || 'Subprocess'
          : sanitizeElementName(undefined, pid) || 'Subprocess';
        groupStatus = parent?.status;
      }
      g = { key: pid, label: groupLabel, status: groupStatus, events: [], first: Number.MAX_SAFE_INTEGER };
      groups.set(pid, g);
    }
    g.events.push({ ...el, actor, label, stageName: g.label });
    g.first = Math.min(g.first, ts(el.startedTime));
  }

  // Events oldest->newest within a group; groups ordered by their earliest event.
  return [...groups.values()]
    .sort((a, b) => a.first - b.first)
    .map((g) => ({
      stage: g.label,
      status: g.status,
      events: g.events.sort((a, b) => ts(a.startedTime) - ts(b.startedTime)),
    }));
}
