import type { UiPath, PaginationCursor } from '@uipath/uipath-typescript/core';
import { Cases, CaseInstances, TimeInterval } from '@uipath/uipath-typescript/cases';
import { ProcessInstances } from '@uipath/uipath-typescript/maestro-processes';
import { Tasks } from '@uipath/uipath-typescript/tasks';
import { hoursUntil } from '@/lib/format';
import type {
  CaseInstance,
  CaseStage,
  ExecutionHistory,
  ElementExecution,
  ActionTask,
  CaseDefinition,
  CaseEnrichment,
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

// ---- thin wrappers around the SDK (all data is live from the tenant) ----

export async function listCaseInstances(sdk: UiPath, pageSize = 100): Promise<CaseInstance[]> {
  const ci = new CaseInstances(sdk);
  const res = await ci.getAll({ pageSize });
  return res.items;
}

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

export async function getCaseActionTasks(sdk: UiPath, instanceId: string): Promise<ActionTask[]> {
  const ci = new CaseInstances(sdk);
  const res = await ci.getActionTasks(instanceId, { pageSize: 100, asTaskAdmin: true });
  return res.items;
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

export async function getCaseHistory(
  sdk: UiPath,
  instanceId: string,
  folderKey: string,
): Promise<ExecutionHistory> {
  const ci = new CaseInstances(sdk);
  // The SDK's element-execution type is narrower than the runtime payload (it
  // omits elementType/elementExtensionType); ExecutionHistory widens it. The
  // SDK response is structurally assignable, so no cast is needed.
  return ci.getExecutionHistory(instanceId, folderKey);
}

export interface GlobalVariable {
  id: string;
  name: string;
  type: string;
  source?: string;
  value: unknown;
}

export interface ElementVariables {
  elementId: string;
  inputs?: Record<string, unknown>;
  outputs?: Record<string, unknown>;
}

export interface CaseVariables {
  globalVariables: GlobalVariable[];
  elements: ElementVariables[];
}

export async function getCaseVariables(
  sdk: UiPath,
  instanceId: string,
  folderKey: string,
): Promise<CaseVariables> {
  // A Maestro case instance is a process instance; variables live there.
  const pi = new ProcessInstances(sdk);
  const res = await pi.getVariables(instanceId, folderKey);
  return { globalVariables: res.globalVariables ?? [], elements: res.elements ?? [] };
}

// ---- derived signals (computed from real data, never invented) ----

const PRIORITY_RANK: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };

export function slaStatusOf(expiry?: string | null): CaseEnrichment['slaStatus'] {
  const h = hoursUntil(expiry);
  if (h === null) return null;
  if (h < 0) return 'breached';
  if (h <= 24) return 'at-risk';
  return 'on-track';
}

/** Compute the current stage + nearest SLA + highest open-task priority for one case. */
export async function enrichCase(sdk: UiPath, inst: CaseInstance): Promise<CaseEnrichment> {
  const [stagesR, tasksR] = await Promise.allSettled([
    getCaseStages(sdk, inst.instanceId, inst.folderKey),
    getCaseActionTasks(sdk, inst.instanceId),
  ]);

  const enrichment: CaseEnrichment = { openTasks: 0 };

  if (stagesR.status === 'fulfilled') {
    const stages = stagesR.value;
    // Current stage = first non-completed stage, else the last stage.
    const active = stages.find((s) => {
      const st = s.status.toLowerCase();
      return st !== 'completed' && st !== 'complete' && st !== 'not started' && st !== 'notstarted';
    });
    const current =
      active ??
      [...stages].reverse().find((s) => s.status.toLowerCase().includes('progress')) ??
      stages.find((s) => s.status.toLowerCase() !== 'completed');
    if (current) {
      enrichment.currentStage = current.name;
      enrichment.currentStageStatus = current.status;
    } else if (stages.length) {
      enrichment.currentStage = stages[stages.length - 1].name;
      enrichment.currentStageStatus = stages[stages.length - 1].status;
    }
  }

  if (tasksR.status === 'fulfilled') {
    const open = tasksR.value.filter((t) => String(t.status || '').toLowerCase() !== 'completed');
    enrichment.openTasks = open.length;
    let bestRank = 0;
    let nearest: string | null = null;
    for (const t of open) {
      const rank = PRIORITY_RANK[String(t.priority || '').toLowerCase()] ?? 0;
      if (rank > bestRank) {
        bestRank = rank;
        enrichment.priority = String(t.priority);
      }
      const exp = t.taskSlaDetail?.expiryTime;
      if (exp) {
        if (nearest === null || new Date(exp).getTime() < new Date(nearest).getTime()) {
          nearest = exp;
        }
      }
    }
    enrichment.slaTime = nearest;
    enrichment.slaStatus = slaStatusOf(nearest);
  }

  return enrichment;
}

/** Enrich a batch of instances in parallel (used by dashboard + cases list). */
export async function enrichCases(
  sdk: UiPath,
  instances: CaseInstance[],
): Promise<Map<string, CaseEnrichment>> {
  const results = await Promise.allSettled(instances.map((inst) => enrichCase(sdk, inst)));
  const map = new Map<string, CaseEnrichment>();
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') map.set(instances[i].instanceId, r.value);
  });
  return map;
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

/** Load every case instance by looping the cursor (bounded for safety). */
export async function listAllCaseInstances(
  sdk: UiPath,
  processKey?: string,
  max = 1000,
): Promise<CaseInstance[]> {
  const out: CaseInstance[] = [];
  let cursor: PaginationCursor | undefined;
  for (let i = 0; i < 40 && out.length < max; i++) {
    const page = await listCaseInstancesPage(sdk, { pageSize: 100, cursor, processKey });
    out.push(...page.items);
    if (!page.hasNextPage || !page.nextCursor) break;
    cursor = page.nextCursor;
  }
  return out;
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
  } catch {
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
  return new Cases(sdk).getElementStats(processKey, packageId, start, end, packageVersion);
}

// ============================================================
// Case instance lifecycle operations
// ============================================================
export type LifecycleAction = 'pause' | 'resume' | 'close' | 'reopen';

/** Run a lifecycle operation on a case instance. Returns whether it succeeded. */
export async function runLifecycle(
  sdk: UiPath,
  action: LifecycleAction,
  instanceId: string,
  folderKey: string,
  options: { comment?: string; stageId?: string } = {},
): Promise<boolean> {
  const ci = new CaseInstances(sdk);
  const opts = options.comment ? { comment: options.comment } : undefined;
  switch (action) {
    case 'pause':
      return (await ci.pause(instanceId, folderKey, opts)).success;
    case 'resume':
      return (await ci.resume(instanceId, folderKey, opts)).success;
    case 'close':
      return (await ci.close(instanceId, folderKey, opts)).success;
    case 'reopen':
      return (await ci.reopen(instanceId, folderKey, { stageId: options.stageId ?? '', comment: options.comment })).success;
  }
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
  const ts = (s?: string | null) => {
    const t = s ? new Date(s).getTime() : NaN;
    return Number.isNaN(t) ? Number.MAX_SAFE_INTEGER : t;
  };

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
