/** The backend operations behind the converted rules. */
import { JobService } from '@uipath/uipath-typescript/jobs';

import { TaskType } from '@uipath/uipath-typescript/tasks';
import { defaultFolderKey, getUiPath, tenantName } from './sdk';
import type { QueueItemValue, QueuePriority } from '@uipath/uipath-typescript/queues';
import { RESOURCE_FOLDERS } from './resource-folders';
import { ENTITY_IDS, ENTITY_ID_TENANTS } from './entity-ids';
import { attachmentResolvers, bumpEntityVersion, cellTextResolvers, type EntityAttachment, fieldOf, getHostFolderId, setProcessOutput,
  type AppsFile } from './runtime';

/**
 * Numeric folder id, which several SDK methods require.
 *
 * The HOST's folder wins: an Action Center task reports the folder it runs in
 * (`getTask().folderId`), so a deployed action app resolves this with nothing
 * configured at all. Only a standalone local run — no task, no platform — falls back
 * to the authored folder or an explicit override.
 */
function folderId(resource: string): number {
  const known = knownFolderId(resource);
  if (known !== undefined) return known;
  const authored = RESOURCE_FOLDERS[resource];
  throw new Error(
    `no folder id for "${resource}". An Action Center task states its own folder; ` +
    'outside one, record the folder in src/lib/resource-folders.ts'
    + (authored?.path ? ` — it was authored in "${authored.path}"` : '') + '.',
  );
}

/** The host task's folder, else the one authored for this resource — or nothing known. */
function knownFolderId(resource: string): number | undefined {
  const fromHost = getHostFolderId();
  if (fromHost !== undefined) return fromHost;
  const authored = RESOURCE_FOLDERS[resource]?.folderId;
  return typeof authored === 'number' ? authored : undefined;
}

// ── solution bindings ────────────────────────────────────────────────────────
/** One remapped resource, as the Solution's deploy stated it. */
type ResourceOverride = Record<string, string>;

const OVERRIDES_SLOT = Symbol.for('uipath.resourceOverwrites.v1');
let pageOverrides: Map<string, ResourceOverride> | undefined;
let pageOverridesRead = false;

/**
 * The resources a Solution's deploy remapped — read from the same place, the same way, as
 * the SDK reads them: a host accessor at `Symbol.for('uipath.resourceOverwrites.v1')` when
 * one is installed, otherwise the `<script id="uipath-overrides">` the platform injects.
 *
 * Read HERE because the SDK consults it only inside its `getByName` lookups. A queue
 * insert, a process started by its release key, a connector called by connection id and a
 * transaction started by queue name all bypass it — so a remap made at deploy reached none
 * of them, and the app went on calling the resource it was authored against.
 *
 * Parsed, never evaluated, and narrowed to string values: it is data the page carries.
 */
function overrideTable(): Map<string, ResourceOverride> | undefined {
  try {
    const slot = (globalThis as Record<symbol, unknown>)[OVERRIDES_SLOT];
    if (typeof slot === 'function') return asOverrideTable(slot());
    if (!pageOverridesRead) {
      pageOverridesRead = true;
      const text = typeof document === 'undefined'
        ? undefined : document.getElementById('uipath-overrides')?.textContent;
      pageOverrides = text ? asOverrideTable(JSON.parse(text)) : undefined;
    }
    return pageOverrides;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[uiapp-convert] the resource override table could not be read, so every '
      + 'resource resolves as authored: ' + (e instanceof Error ? e.message : String(e)));
    return undefined;
  }
}

/** Keys become Map entries, so none of them can reach an object's prototype. */
function asOverrideTable(value: unknown): Map<string, ResourceOverride> | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined;
  const table = new Map<string, ResourceOverride>();
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) continue;
    table.set(key, Object.fromEntries(
      Object.entries(entry).filter((field): field is [string, string] => typeof field[1] === 'string')));
  }
  return table;
}

/**
 * What the deploy remapped a resource to, if anything.
 *
 * Keyed `<kind>.<name>` — the `resource` and `key` of its `bindings_v2.json` entry, which
 * is how the platform keys the table. The folder-qualified key is tried first, as the SDK
 * does, so an entry scoped to the authored folder still matches.
 */
function resourceOverride(
  kind: string, name: string, path = RESOURCE_FOLDERS[name]?.path,
): ResourceOverride | undefined {
  const table = overrideTable();
  if (!table) return undefined;
  return (path ? table.get(`${kind}.${name}.${path}`) : undefined) ?? table.get(`${kind}.${name}`);
}

/** Folder context for one call. */
type FolderScope = { folderPath?: string; folderKey?: string; folderId?: number };

/**
 * A resource's name and folder as DEPLOYED, for the calls the SDK does not redirect itself.
 *
 * A remap wins over an Action Center task's folder: it is the administrator's explicit
 * choice for this resource, where the task's folder is only where the app happens to run.
 */
function located(kind: string, name: string): { name: string; scope: FolderScope } {
  const bound = resourceOverride(kind, name);
  return {
    name: bound?.name || name,
    scope: bound?.folderPath ? { folderPath: bound.folderPath } : folderScope(name),
  };
}

/**
 * Folder context for an SDK by-name lookup — which applies a remap ITSELF.
 *
 * Remapped to another folder, the lookup is handed only the authored path: the SDK finds the
 * remap by the key it builds from the path it is given, and a folder id sent beside the
 * remapped path would leave the server to choose between the two.
 */
function lookupScope(bound: ResourceOverride | undefined, resource: string): FolderScope {
  const path = RESOURCE_FOLDERS[resource]?.path;
  return bound?.folderPath ? (path ? { folderPath: path } : {}) : folderScope(resource);
}

// ── entities ─────────────────────────────────────────────────────────────────
const entityIds = new Map<string, string>();

/** Entity name -> id, cached. */
async function resolveEntityId(name: string): Promise<string> {
  const hit = entityIds.get(name);
  if (hit) return hit;

  const configuredTenant = tenantName();
  if (configuredTenant && ENTITY_ID_TENANTS.includes(configuredTenant) && ENTITY_IDS[name]) {
    const known = ENTITY_IDS[name]!;
    entityIds.set(name, known);
    return known;
  }
  /*
   * `includeFolderEntities`, NOT `folderKey`.
   *
   * Passing the app's install folder scopes the listing to that folder alone, and a Data
   * Fabric entity is usually TENANT-level: a deployed app in a folder holding 6 entities
   * could not see the tenant's other 768, so every lookup threw "not found". This flag is
   * the SDK's "tenant-level AND folder-level together", which is what resolving a bare
   * entity NAME means.
   */
  const all = await getUiPath().entities.getAll({ includeFolderEntities: true });
  for (const e of all) if (e.name) entityIds.set(e.name, String(e.id));
  const id = entityIds.get(name);
  if (!id) {
    throw new Error(`entity "${name}" not found in this tenant`
      + (ENTITY_ID_TENANTS.length
        ? ` (the app was exported from "${ENTITY_ID_TENANTS[ENTITY_ID_TENANTS.length - 1]}")`
        : ''));
  }
  return id;
}

/** The entity name behind a binding, which may be a name or a record. */
function entityNameOf(binding: unknown): string {
  if (typeof binding === 'string') return binding;
  const r = binding as { entityName?: string; __entity?: string } | null;
  const name = r?.entityName ?? r?.__entity;
  if (!name) throw new Error('cannot determine the entity for this operation');
  return name;
}

function recordIdOf(record: unknown): string {
  const r = record as Record<string, unknown> | null;
  const id = r?.Id ?? r?.id;
  if (!id) throw new Error('cannot update or delete a record with no Id');
  return String(id);
}

/**
 * insert a RECORD (not `entities.create`, which makes a schema).
 *
 * Returns the rule's OUTCOME, not the bare response. Every backend helper a rule
 * outcome is built from returns a normalised, camelCase shape — `startProcess` gives
 * `{ jobKey, state, output }`, `uploadToBucket` gives `{ name }` — and the emitter reads
 * those keys by exact name. This one used to hand back the raw insert response, so the
 * emitted `RecordId` read `.id` off a payload whose id is `Id`: the SDK types the insert
 * response as `EntityInsertResponse extends EntityRecord` with `Id: string`, and unlike
 * its task, asset, bucket, job and queue services the entity service does NOT camel-case
 * what it returns. `RecordId` was therefore `undefined` after every create, which is
 * silent — the create succeeds, and only the rules downstream fail, each in its own way.
 *
 * The id is read through `fieldOf`, the same tolerant resolver the grids and
 * `recordIdOf` use, because record casing is not stable: Data Fabric returns authored
 * field casing while older rows come back camelCase.
 *
 * `record` keeps the full response, so nothing is lost by normalising.
 */
export async function createEntityRecord(
  entity: unknown, data: Record<string, unknown>,
): Promise<{ id?: string; record: unknown }> {
  const name = entityNameOf(entity);
  const entityId = await resolveEntityId(name);
  const created = await getUiPath().entities.insertRecordById(entityId, data);
  // Every source over this entity re-fetches — the re-evaluation Apps does itself.
  bumpEntityVersion(name);
  const recordId = fieldOf(created, 'Id');
  return {
    id: recordId === null || recordId === undefined ? undefined : String(recordId),
    record: created,
  };
}

/**
 * Two authored shapes reach here: a binding that IS the record, and — the current
 * designer's shape — an ENTITY binding (`Entity.ExpenseRequest`) plus a separate
 * record-id expression (`Grid.SelectedItem.Id`) in the rule's `entityId` slot.
 * The id argument wins when the rule supplies one; otherwise the record must carry
 * its own Id. Dropping the second shape's id updated and deleted NOTHING while the
 * low-code original worked — the buttons' whole job is that id.
 */
export async function updateEntityRecord(
  record: unknown, data: Record<string, unknown>, recordId?: unknown,
): Promise<unknown> {
  const name = entityNameOf(record);
  const id = await resolveEntityId(name);
  const rid = recordId !== undefined && recordId !== null
    ? String(recordId) : recordIdOf(record);
  const updated = await getUiPath().entities.updateRecordById(id, rid, data);
  bumpEntityVersion(name);
  return updated;
}

/** Same two shapes as `updateEntityRecord`. */
export async function deleteEntityRecord(record: unknown, recordId?: unknown): Promise<void> {
  const name = entityNameOf(record);
  const id = await resolveEntityId(name);
  const rid = recordId !== undefined && recordId !== null
    ? String(recordId) : recordIdOf(record);
  await getUiPath().entities.deleteRecordById(id, rid);
  bumpEntityVersion(name);
}

/** Rows for a data source, from Apps' `Fetch`. */
export interface EntityQuery {
  filterGroup?: unknown;
  sortOptions?: unknown[];
  selectedFields?: string[];
  expansionLevel?: number;
  /** From Apps' `New PaginationProps(start, limit)`. */
  pageSize?: number;
  /** From Apps' pagination START, divided into a page number by `pageFromOffset`. */
  jumpToPage?: number;
  /**
   * A ROW offset, from a workflow's `Skip`. The query API addresses pages, so the read
   * below fetches the page this row falls in and drops the rows before it, topping up
   * from the next page when the offset is mid-page. A paging loop that advances `Skip`
   * by the rows it received ends mid-page (`Skip = 2439`, `Top = 1000`) and gets no
   * rows, as it did on the platform.
   */
  skip?: number;
  /**
   * Fail the query after this many milliseconds.
   *
   * From a workflow's `TimeoutInMs`. Enforced here because the SDK exposes no timeout —
   * the request itself keeps running, but the caller stops waiting, which is the part
   * the designer set a ceiling for.
   */
  timeoutMs?: number;
}

/** Reject after `ms`, so a query cannot outlive the ceiling the workflow set. */
async function withTimeout<T>(work: Promise<T>, ms: number | undefined, what: string): Promise<T> {
  if (!ms || !Number.isFinite(ms) || ms <= 0) return work;
  let timer: ReturnType<typeof setTimeout>;
  try {
    return await Promise.race([
      work,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(what + ' timed out after ' + ms + 'ms')), ms);
      }),
    ]);
  } finally {
    clearTimeout(timer!);
  }
}

/**
 * Drop the parts of an authored query that were never really asked.
 *
 * The authored source expression reads the grid's search, sort and paging props
 * unconditionally — that is faithful to Apps, whose OWN runtime then prunes the
 * untouched parts before the wire (its payload carries `queryFilters: null` while a
 * literal translation sent `field "undefined" contains "undefined"` with PAGE SIZE
 * ZERO — a query for nothing, answered correctly with nothing, no error anywhere:
 * a grid over seven live records rendered empty). `"undefined"` is matched as a
 * name because `String(undefined)` is how an unset control prop reaches a filter;
 * a FIELD genuinely named "undefined" cannot exist in Data Fabric.
 */
function pruneQuery(query: EntityQuery): EntityQuery {
  const unset = (v: unknown) => v === undefined || v === '' || v === 'undefined';
  const out: EntityQuery = { ...query };

  const pruneGroup = (g: unknown): unknown => {
    if (!g || typeof g !== 'object') return undefined;
    const group = g as { filterGroups?: unknown[]; queryFilters?: unknown[] };
    /*
     * A filter is dropped only when its FIELD is unset — that is the untouched search
     * box Apps itself prunes. An unset VALUE on a named field stays, as "": Apps sends
     * `Id = <empty input>` and gets no rows, which is what the low-code app showed. Dropping
     * it here returned every row instead — the opposite answer.
     */
    const filters = (group.queryFilters ?? []).flatMap((f) => {
      const q = f as { fieldName?: unknown; operator?: unknown; value?: unknown; valueList?: unknown };
      if (unset(q.fieldName)) return [];
      /*
       * `in` and `not in` carry their values as `valueList` and no `value` at all, so
       * the no-value rule below would read every one of them as empty and drop it: the
       * query then ran without that condition and returned rows it excludes.
       */
      if (Array.isArray(q.valueList)) return [q];
      const nothing = q.value === undefined || q.value === null || q.value === 'undefined';
      /*
       * Apps drops a filter whose value is Nothing unless its operator is = or != (its
       * `isFilterValid`), and its evaluator reads a member off an unselected item as
       * Nothing. The converted expression spells that Nothing as "" (`ToString` of Nothing
       * is "" in VB), so an untouched "By tags" dropdown produced `Tags contains ""`,
       * which Data Fabric answers with only the rows that HAVE a value — the existing
       * rows with no tags vanished. So: a non-equality filter with no value is no filter.
       */
      const equality = q.operator === '=' || q.operator === '!=';
      if (!equality && (nothing || q.value === '')) return [];
      // VB's Nothing travels as null: Data Fabric matches `ParentId = null` to a record whose
      // ParentId was never set (measured), while "" matches nothing — Apps gets the row, so
      // must we. A genuine "" (an empty text box) stays "".
      return [nothing ? { ...q, value: null } : q];
    });
    const groups = (group.filterGroups ?? []).map(pruneGroup).filter((x) => x !== undefined);
    if (!filters.length && !groups.length) return undefined;
    return { ...group, queryFilters: filters, filterGroups: groups };
  };
  out.filterGroup = pruneGroup(out.filterGroup);
  if (out.filterGroup === undefined) delete out.filterGroup;

  out.sortOptions = (out.sortOptions ?? []).filter(
    (s) => !unset((s as { fieldName?: unknown }).fieldName));
  if (!out.sortOptions.length) delete out.sortOptions;

  // Page size zero is "the pager has not initialised", never "give me no rows".
  if (!(typeof out.pageSize === 'number' && out.pageSize > 0)) {
    delete out.pageSize;
    delete out.jumpToPage;
    delete out.skip;
  }
  return out;
}

export async function fetchEntityRecords(
  entityName: string, query: EntityQuery = {},
): Promise<{ data: unknown[]; totalRecords: number }> {
  /*
   * A workflow activity may carry a timeout; a page read never does. The timed call is the
   * same read without it, so the one below is exactly the read every page makes.
   */
  const { timeoutMs, ...untimed } = query;
  if (timeoutMs !== undefined) {
    return withTimeout(fetchEntityRecords(entityName, untimed), timeoutMs,
      'querying "' + entityName + '"');
  }
  const id = await resolveEntityId(entityName);
  // Before the rows, so the first render already has choice and relationship text.
  await ensureEntityMeta(entityName, id);
  const pruned = pruneQuery(query);
  if (typeof pruned.pageSize !== 'number') return fetchAllRecords(id, pruned);
  const { skip, ...paged } = pruned;
  if (typeof skip === 'number' && skip > 0) return fetchFromRow(id, paged, skip);
  return readPage(id, paged);
}

async function readPage(
  id: string, query: EntityQuery,
): Promise<{ data: unknown[]; totalRecords: number }> {
  const res = await getUiPath().entities.queryRecordsById(id, query as never);
  const rows = (res as { items?: unknown[] }).items ?? (res as unknown as unknown[]);
  const data = Array.isArray(rows) ? rows : [];
  const total = (res as { totalCount?: number }).totalCount;
  return { data, totalRecords: typeof total === 'number' ? total : data.length };
}

/**
 * `pageSize` rows starting at row `skip`, over an API that addresses pages.
 *
 * The page the row falls in is read and the rows before it dropped. When the offset is
 * mid-page that leaves the page short, so if the page was full the next one is read and
 * the shortfall taken from its start; a short page means the rows ran out, and the loop
 * that asked (`Skip` advanced by the rows received) gets the empty result it ends on.
 */
async function fetchFromRow(
  id: string, query: EntityQuery, skip: number,
): Promise<{ data: unknown[]; totalRecords: number }> {
  const size = query.pageSize as number;
  const page = Math.floor(skip / size) + 1;
  const before = skip - (page - 1) * size;
  const first = await readPage(id, { ...query, jumpToPage: page });
  const data = first.data.slice(before);
  if (before > 0 && first.data.length === size) {
    const next = await readPage(id, { ...query, jumpToPage: page + 1 });
    data.push(...next.data.slice(0, before));
  }
  return { data, totalRecords: first.totalRecords };
}

/**
 * A `Fetch` with no PaginationProps is EVERY matching row. Apps sends `limit: 10000`
 * for it (measured on the wire beside the low-code app, for a dropdown over an entity);
 * the SDK's default is one page, which would have shown a dropdown its first page of
 * options and nothing more. The SDK caps a page at 1000, so the promise is kept by
 * following the cursor until the service reports no next page.
 */
async function fetchAllRecords(
  id: string, query: EntityQuery,
): Promise<{ data: unknown[]; totalRecords: number }> {
  const data: unknown[] = [];
  let total: number | undefined;
  let cursor: { value: string } | undefined;
  for (let page = 0; page < 100; page++) {
    const res = await getUiPath().entities.queryRecordsById(
      id, { ...query, pageSize: 1000, ...(cursor ? { cursor } : {}) } as never,
    ) as { items?: unknown[]; totalCount?: number; hasNextPage?: boolean; nextCursor?: { value: string } };
    data.push(...(res.items ?? []));
    if (typeof res.totalCount === 'number') total = res.totalCount;
    if (!res.hasNextPage || !res.nextCursor) break;
    cursor = res.nextCursor;
  }
  return { data, totalRecords: total ?? data.length };
}

/**
 * A choice set, WHOLE.
 *
 * Apps asks Data Fabric for a choice set with `limit: 10000` (measured on the wire beside
 * the low-code app). The SDK caps a page at 1000, so the same promise is kept by paging:
 * every page until the service says there is no next one. The default of one page would
 * have left a dropdown over a large set silently short of options.
 */
/**
 * Read once per session. A choice set does not change while the app runs, and Apps reads
 * it once at page load and reuses it; a popup that re-read its two choice sets on every
 * open was two data calls the low-code app never made.
 */
const choiceSetRows = new Map<string, Promise<unknown[]>>();

function readChoiceSetWhole(id: string): Promise<unknown[]> {
  let pending = choiceSetRows.get(id);
  if (!pending) {
    pending = readChoiceSetPages(id).catch((err: unknown) => { choiceSetRows.delete(id); throw err; });
    choiceSetRows.set(id, pending);
  }
  return pending;
}

async function readChoiceSetPages(id: string): Promise<unknown[]> {
  const rows: unknown[] = [];
  let cursor: { value: string } | undefined;
  for (let page = 0; page < 100; page++) {
    const res = await getUiPath().entities.choicesets.getById(id, { pageSize: 1000, ...(cursor ? { cursor } : {}) }) as {
      items?: unknown[]; hasNextPage?: boolean; nextCursor?: { value: string };
    };
    rows.push(...(res.items ?? (Array.isArray(res) ? res as unknown[] : [])));
    if (!res.hasNextPage || !res.nextCursor) break;
    cursor = res.nextCursor;
  }
  return rows;
}

/** The bytes of a record's attachment, by the ids the attachment carries. */
export async function downloadAttachment(att: EntityAttachment): Promise<Blob> {
  const [entity, recordId, field] = att.Path.split('/') as [string, string, string];
  const entityId = att.EntityId ?? await resolveEntityId(entity);
  // 1.7 takes an EntityRef, not the bare id: the attachment methods changed together.
  return getUiPath().entities.downloadAttachment(
    { id: entityId }, att.RecordId ?? recordId, field) as Promise<Blob>;
}
attachmentResolvers.download = downloadAttachment;

// ── entity field metadata ────────────────────────────────────────────────────
/** How to DISPLAY a field whose stored value is not what a person reads. */
interface EntityFieldDisplay {
  choiceSetId?: string;
  /** Which field of the related record to show, per the schema. */
  referenceField?: string;
  multiple?: boolean;
}
const fieldDisplays = new Map<string, Map<string, EntityFieldDisplay>>();
/** choiceSetId -> numberId -> displayName */
const choiceTexts = new Map<string, Map<number, string>>();

async function ensureEntityMeta(entityName: string, entityId: string): Promise<void> {
  if (fieldDisplays.has(entityName)) return;
  const byField = new Map<string, EntityFieldDisplay>();

  fieldDisplays.set(entityName, byField);
  let fields: {
    name?: string; fieldDisplayType?: string; choiceSetId?: string;
    referenceChoiceSet?: { id?: string }; referenceField?: { name?: string };
  }[] = [];
  try {
    const meta = await getUiPath().entities.getById(entityId) as { fields?: typeof fields };
    fields = meta.fields ?? [];
  } catch (err) {
    console.warn('[uiapp-convert] entity schema unavailable; choice and relationship '
      + 'cells will show raw values', err);
    return;
  }
  const wanted = new Set<string>();
  for (const f of fields) {
    if (!f.name) continue;
    const kind = String(f.fieldDisplayType ?? '');
    const setId = f.choiceSetId ?? f.referenceChoiceSet?.id;
    if (kind === 'ChoiceSetSingle' || kind === 'ChoiceSetMultiple') {
      byField.set(f.name, { choiceSetId: setId, multiple: kind === 'ChoiceSetMultiple' });
      if (setId) wanted.add(setId);
    } else if (kind === 'Relationship') {
      byField.set(f.name, { referenceField: f.referenceField?.name });
    }
  }
  await Promise.all([...wanted].map(async (setId) => {
    if (choiceTexts.has(setId)) return;
    const byNumber = new Map<number, string>();
    choiceTexts.set(setId, byNumber);
    try {
      const rows = await readChoiceSetWhole(setId) as {
        numberId?: number; displayName?: string; name?: string;
      }[];
      for (const c of rows) {
        if (typeof c.numberId === 'number') byNumber.set(c.numberId, c.displayName ?? c.name ?? '');
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[uiapp-convert] choice set ' + setId + ' could not be read', err);
    }
  }));
}

/**
 * One cell's text when the field's SCHEMA says the stored value is not the display value,
 * or `undefined` when this field needs no translation and the caller should use the value
 * as it is.
 */
export function entityCellText(
  entity: unknown, field: unknown, value: unknown,
): string | undefined {
  const display = fieldDisplays.get(String(entity))?.get(String(field));
  if (!display) return undefined;
  if (value === null || value === undefined) return '';
  if (display.referenceField) {
    if (typeof value !== 'object') return undefined;
    const text = (value as Record<string, unknown>)[display.referenceField];
    return text === null || text === undefined ? '' : String(text);
  }
  const texts = display.choiceSetId ? choiceTexts.get(display.choiceSetId) : undefined;
  if (!texts) return undefined;

  /*
   * A choice value is a number, but it does not always ARRIVE as one: a query's JSON can
   * carry it as "1", and a strict typeof check then refused to translate and the control
   * showed the ordinal where Apps shows the text.
   */
  const one = (v: unknown) => {
    const n = typeof v === 'number' ? v
      : typeof v === 'string' && /^-?\d+$/.test(v.trim()) ? Number(v) : undefined;
    return n !== undefined && Number.isInteger(n) ? texts.get(n) ?? String(n) : undefined;
  };
  if (Array.isArray(value)) {
    const mapped = value.map((v) => one(v) ?? '');
    return mapped.some((t) => t !== '') ? mapped.filter((t) => t !== '').join(',') : undefined;
  }
  return one(value);
}
// The late-bound half of the registry in runtime.ts: components ask through the
// registry, and only an app that carries this data layer can answer.
cellTextResolvers.entity = (entity, field, value) => entityCellText(entity, field, value);

// ── choice sets ──────────────────────────────────────────────────────────────
const choiceSetIds = new Map<string, string>();

/** `GetChoiceSet(name)` — every value of a Data Fabric choice set. */
export async function getChoiceSet(name: unknown): Promise<unknown[]> {
  const wanted = required(name, 'choice set name', 'GetChoiceSet');
  let id = choiceSetIds.get(wanted);
  if (!id) {
    /*
     * `includeFolderChoiceSets`, NOT `folderKey` — the same mistake `resolveEntityId`
     * once made. A folder key scopes the listing to that ONE folder, and a choice set is
     * usually tenant-level, so a deployed app saw none of them and every lookup said
     * "no choice set named". This flag lists tenant-level and folder-level together.
     */
    const listed = await getUiPath().entities.choicesets.getAll({ includeFolderChoiceSets: true }) as
      unknown as { items?: unknown[] } | unknown[];
    const all = (Array.isArray(listed) ? listed : listed?.items ?? []) as { id?: string; name?: string }[];
    const match = all.find((c) => c.name === wanted);
    if (!match?.id) throw new Error('no choice set named "' + wanted + '" in this tenant');
    id = match.id;
    choiceSetIds.set(wanted, id);
  }
  return readChoiceSetWhole(id);
}

// ── processes ────────────────────────────────────────────────────────────────
/**
 * Start an Orchestrator process and return its job.
 *
 * `state` is the job's LAST observed Orchestrator state, and it is part of the return
 * because the rule outcome exposes it as `JobStatus`. It used to be computed inside
 * `awaitJobOutput` and thrown away, so `JobStatus` was `undefined` on every process
 * rule — a member real apps log and branch on.
 *
 * On the normal path that state is `Successful`; a job that ends any other terminal way
 * throws, and a cancelled one reports `Stopped`. A job that never started has neither a
 * key nor a state.
 */
export async function startProcess(
  processName: unknown, inputs: Record<string, unknown> = {}, hooks: JobHooks = {},
  limits: JobWaitLimits = {},
): Promise<{ jobKey?: string; state?: string; output: Record<string, unknown> | null }> {
  const sdk = getUiPath();
  const name = required(processName, 'process', 'start process');
  const release = await resolveRelease(name);
  const started = await sdk.processes.start(
    { processKey: release.key, inputArguments: JSON.stringify(inputs) },
    { folderId: release.folderId },
  );
  const jobKey = (started?.[0] as { key?: string } | undefined)?.key;
  if (!jobKey) return { jobKey, output: null };

  const { state, output } = await awaitJobOutput(jobKey, release.folderId, hooks, limits);

  setProcessOutput(name, { ...inputs, ...(output ?? {}) });
  return { jobKey, state, output };
}

const releases = new Map<string, { key: string; folderId: number }>();

/**
 * The release a process is started by, and the folder it lives in.
 *
 * By NAME through the SDK when the deploy remapped the process, or when nothing states a
 * numeric folder — a Solution app's resources carry none. `processes.getByName` applies the
 * remap itself and, with no folder named, asks the app's install folder, where a Solution
 * provisions its processes; either way it answers with the release key AND its folder id.
 * Listing the releases of a known folder stays the path for an Action Center task and for a
 * standalone app whose payload recorded the folder.
 */
async function resolveRelease(name: string): Promise<{ key: string; folderId: number }> {
  const known = knownFolderId(name);
  // Per folder context too: a host task's folder can arrive after the first call.
  const cacheKey = `${name}|${known ?? ''}`;
  const hit = releases.get(cacheKey);
  if (hit) return hit;
  const bound = resourceOverride('process', name);
  let release: { key: string; folderId: number };
  if (!bound && known !== undefined) {
    release = { key: await resolveReleaseKey(name, known), folderId: known };
  } else if (bound || (!RESOURCE_FOLDERS[name]?.path && defaultFolderKey())) {
    const found = await getUiPath().processes.getByName(name, lookupScope(bound, name));
    release = { key: found.key, folderId: found.folderId };
  } else {
    // Authored in a folder the payload named but gave no id for: the error it has always raised.
    const fid = folderId(name);
    release = { key: await resolveReleaseKey(name, fid), folderId: fid };
  }
  releases.set(cacheKey, release);
  return release;
}

/**
 * The RELEASE key a process is started by — resolved, never assumed.
 *
 * Three different strings name one process, and only one of them starts it:
 *   - the Apps name an expression uses (`TP_AllTypes`), which is `name` here;
 *   - the PACKAGE id the payload records as `processKey` (`AA_AllTypes`), which the SDK
 *     returns as a release's `packageKey`;
 *   - the release's own key, a GUID minted per folder, which is what the SDK's
 *     `ProcessStartRequest.processKey` means (it is sent as `ReleaseKey`).
 * Passing the package id as the release key was a 400 "Undefined process" on every start.
 * The GUID is per tenant, so it cannot be baked in; it is looked up once per session by
 * listing the folder's releases and matching the package id, then the name.
 */
async function resolveReleaseKey(name: string, fid: number): Promise<string> {
  const packageId = RESOURCE_FOLDERS[name]?.processKey ?? name;
  const listed = await getUiPath().processes.getAll({ folderId: fid }) as unknown as
    { items?: unknown[] } | unknown[];
  const rows = (Array.isArray(listed) ? listed : listed?.items ?? []) as
    { key?: string; name?: string; packageKey?: string; processKey?: string }[];
  const same = (a: unknown, b: string) => typeof a === 'string' && a.toLowerCase() === b.toLowerCase();
  const release = rows.find((r) => r.packageKey === packageId)
    ?? rows.find((r) => same(r.packageKey, packageId) || same(r.processKey, packageId))
    ?? rows.find((r) => r.name === name || same(r.name, name));
  if (!release?.key) {
    throw new Error(`process "${name}" (package "${packageId}") has no release in folder ${fid}; `
      + 'the folder has: ' + (rows.map((r) => r.name).filter(Boolean).join(', ') || 'none'));
  }
  return release.key;
}

/** How long to wait for a job, and how often to ask. */
const JOB_POLL_MS = 1500;
const JOB_TIMEOUT_MS = 5 * 60 * 1000;

/** Wait for a job to finish, then read its output arguments. */
/** What an authored rule can hook into while a job runs. */
export interface JobHooks {
  onStateChange?: () => void | Promise<void>;
  onCancelled?: () => void | Promise<void>;
}

/** How long a workflow's job wait may take, and whether a faulted job is an error. */
export interface JobWaitLimits {
  timeoutMs?: unknown;
  continueWhenFaulted?: unknown;
}

async function awaitJobOutput(
  jobKey: string, fid: number, hooks: JobHooks = {}, limits: JobWaitLimits = {},
): Promise<{ state: string; output: Record<string, unknown> | null }> {
  const jobs = new JobService(getUiPath());
  const ms = Number(limits.timeoutMs ?? 0);
  const deadline = Date.now() + (ms > 0 ? ms : JOB_TIMEOUT_MS);
  let previous = '';
  for (;;) {
    const job = await jobs.getById(jobKey, fid) as { state?: string };
    const state = String(job?.state ?? '');
    if (state && state !== previous) {
      previous = state;
      await hooks.onStateChange?.();
    }
    if (TERMINAL_JOB_STATES.has(state)) {
      if (state === 'Stopped' && hooks.onCancelled) {
        await hooks.onCancelled();
        return { state, output: null };
      }

      if (state !== 'Successful') {
        // `ContinueWhenFaulted`: the activity carries on past a faulted job when asked.
        if (state === 'Faulted' && limits.continueWhenFaulted) return { state, output: null };
        throw new Error('process job ' + jobKey + ' finished as ' + state);
      }
      return { state, output: await jobs.getOutput(jobKey, fid) };
    }
    if (Date.now() > deadline) {
      throw new Error('process job ' + jobKey + ' did not finish within the timeout');
    }
    await new Promise((resolve) => { setTimeout(resolve, JOB_POLL_MS); });
  }
}

const TERMINAL_JOB_STATES = new Set(['Successful', 'Faulted', 'Stopped', 'Suspended']);

// ── storage buckets ──────────────────────────────────────────────────────────
/** A required argument, or a clear failure. */
function required(value: unknown, argument: string, rule: string): string {
  if (value === null || value === undefined || value === '') {
    throw new Error(
      `${rule}: "${argument}" evaluated to nothing. The authored expression for it `
      + 'produced no value — check the variable or control it reads.',
    );
  }
  return String(value);
}

/** Folder context for ONE resource. */
function folderScope(resource: string): FolderScope {
  const fromHost = getHostFolderId();
  if (fromHost !== undefined) return { folderId: fromHost };

  const authored = RESOURCE_FOLDERS[resource];
  const scope = {
    ...(authored?.path ? { folderPath: authored.path } : {}),
    ...(authored?.authoredKey ? { folderKey: authored.authoredKey } : {}),
    ...(typeof authored?.folderId === 'number' ? { folderId: authored.folderId } : {}),
  };
  if (Object.keys(scope).length) return scope;
  /*
   * Nothing recorded, but the app knows where it was installed: `uip codedapp deploy` and a
   * Solution deploy both state it (`uipath:folder-key`), and the SDK falls back to it when
   * a call names no folder. That is where a Solution provisions its own resources, so a
   * Solution app — whose resources carry no authored folder — finds them there.
   */
  if (defaultFolderKey()) return {};
  throw new Error(
    `no folder recorded for "${resource}" — open this app from an Action Center `
    + 'task, which states its folder, or give the resource its folder in '
    + 'src/lib/resource-folders.ts.',
  );
}

/** A bucket's id and its folder. */
async function resolveBucket(
  name: string,
): Promise<{ id: number; scope: ReturnType<typeof folderScope> }> {
  /*
   * By NAME, always — never the authored `resourceId`.
   *
   * An entity keeps its GUID when an app is imported into another tenant, which is why
   * the entity ids are worth baking in. A storage bucket's id is a per-tenant NUMBER and
   * does not travel: an app imported into another tenant carries the ORIGINAL tenant's
   * number, so trusting the authored id downloaded from a bucket that does not exist. The
   * name is the only part of the authoring that survives.
   */
  /*
   * The bucket's REAL name, not the identifier expressions use. Apps derives a VB-safe
   * spelling for every resource (`Invoice Archive` -> `Invoice_Archive`) and that is what
   * a rule names; Orchestrator only knows the original. Sending the identifier found
   * nothing for every bucket whose name holds a space — an exact `Name eq` filter.
   */
  const realName = RESOURCE_FOLDERS[name]?.name ?? name;
  // The SDK keys a remap by the name it is asked for — the real one.
  const bound = resourceOverride('bucket', realName, RESOURCE_FOLDERS[name]?.path);
  const scope = lookupScope(bound, name);
  const bucket = await getUiPath().buckets.getByName(realName, scope);
  if (!bucket?.id) throw new Error(`storage bucket "${realName}" not found`);
  /*
   * The calls that follow go by id, which the SDK does not redirect: they go to the folder
   * the lookup was redirected to, or a bucket found in one folder is written to in another.
   */
  return { id: Number(bucket.id), scope: bound?.folderPath ? { folderPath: bound.folderPath } : scope };
}

/** Upload a file to a storage bucket. */
export async function uploadToBucket(
  bucketName: unknown, file: unknown, destinationFileName?: unknown,
  autoGenerateName = false,
): Promise<{ name: string }> {
  const { id, scope } = await resolveBucket(
    required(bucketName, 'storage bucket', 'upload to storage bucket'));
  const f = file as { blob?: Blob; dataUrl?: string; name?: string } | Blob | File;
  let content: Blob;

  let name = destinationFileName === undefined || destinationFileName === null
    ? undefined : String(destinationFileName);
  if (f instanceof Blob) { content = f; name ??= (f as File).name; }
  else if (f?.blob) { content = f.blob; name ??= f.name; }
  else if (f?.dataUrl) { content = await (await fetch(f.dataUrl)).blob(); name ??= f.name; }
  else throw new Error('nothing uploadable in the file binding');

  if (autoGenerateName) {
    const source = name ?? 'file';
    const dot = source.lastIndexOf('.');
    const base = dot > 0 ? source.slice(0, dot) : source;
    const ext = dot > 0 ? source.slice(dot + 1) : '';
    const uuid = crypto.randomUUID().replace(/-/g, '');
    name = ext ? `${base}_${uuid}.${ext}` : `${base}_${uuid}`;
  }
  if (!name) throw new Error('no destination file name for the upload');
  await getUiPath().buckets.uploadFile(id, name, content, scope);
  // What the rule leaves behind: Apps exposes it as the rule's UploadedFileName.
  return { name };
}

/** Resolve a download URI for a file in a storage bucket. */
export async function downloadFromBucket(
  bucketName: unknown, fileName: unknown,
): Promise<AppsFile> {
  const bucket = required(bucketName, 'storage bucket', 'download file from storage bucket');
  const { id, scope } = await resolveBucket(bucket);

  /*
   * The name goes to the SDK RAW. Encoding it here encodes it TWICE.
   *
   * `getReadUri` passes the name on as the `path` QUERY PARAMETER, and the SDK's
   * request builder serialises every parameter through `URLSearchParams`, which
   * percent-encodes on its own. A name pre-encoded here arrives with its escapes
   * escaped: one space became `%2520` — `%20` with the `%` re-encoded as `%25` —
   * and Orchestrator answered 404, because no blob is named that.
   *
   * Only names made entirely of the characters `encodeURIComponent` leaves alone
   * (`A-Z a-z 0-9 - _ . ! ~ * ' ( )`) survived, since for those the first encode is
   * a no-op. Every other name was unreachable: spaces, any non-ASCII letter, and
   * `# & + % @ $ , / : ; = ?`. That is why plain-ASCII fixtures never caught it.
   *
   * `uploadToBucket` above already hands `name` over raw, so the two halves of the
   * same bucket disagreed — a file could be uploaded under a name it could not then
   * be downloaded by.
   */
  const uri = await getUiPath().buckets.getReadUri(
    id,
    required(fileName, 'file name', 'download file from storage bucket'),
    scope,
  );
  const body = uri as { uri?: string; url?: string; requiresAuth?: boolean };
  const href = body.uri ?? body.url;
  if (!href) throw new Error(`no read URI returned for "${String(fileName)}"`);

  let link = href;
  if (body.requiresAuth) {
    const url = new URL(href);
    const fid = scope.folderId;
    if (fid !== undefined) url.searchParams.append('folderId', String(fid));
    link = url.toString();
  }

  const path = String(fileName);
  const dot = path.lastIndexOf('.');
  return {
    Name: path,
    FullName: path,
    URL: link,
    Extension: dot > 0 ? path.slice(dot) : '',
    NameWithoutExtension: dot > 0 ? path.slice(0, dot) : path,
    Metadata: { __type: 'URL' },
    FileSize: 0,
    MimeType: 'application/octet-stream',
  };
}

// ── queues ───────────────────────────────────────────────────────────────────
/**
 * `vb-add-to-queue`, through the typed SDK.
 *
 * `queues.insertItemByName` landed in v1.6.2 — `QueueService` was read-only at
 * v1.6.0, which made this the one authenticated-REST call in the app. Typed now,
 * so a signature change is a compile error rather than a 400.
 *
 * The payload is passed as authored. The SDK requires it FLAT (scalars only —
 * `QueueItemValue`) and rejects nested values loudly, which is the right failure
 * for a payload this converter cannot reshape without guessing. The authored
 * defer/due values arrive as expression results (text or a Date) and become
 * Dates here; the SDK serialises them to ISO-8601, same as the old REST body.
 */
/**
 * What an authored rule can hook into while a queue item is processed.
 *
 * Apps nests rules under the three transaction slots. A queue add with none of them
 * never polls, which is why the watcher is a separate call rather than part of the add.
 */
export interface QueueTransactionHooks {
  onStarted?: () => void | Promise<void>;
  onCompleted?: () => void | Promise<void>;
  onFailed?: () => void | Promise<void>;
}

const QUEUE_POLL_MS = 2000;
const QUEUE_TIMEOUT_MS = 10 * 60 * 1000;
const QUEUE_FAILED_STATES = new Set(['Failed', 'Abandoned']);

/**
 * Follow a queue item until its transaction finishes.
 *
 * `addToQueue` returns the created `QueueItem`, which carries its own `id`,
 * `queueId` and `folderId` — the whole handle, so the watch needs no extra
 * configuration. Polled through the typed SDK (`queues.getAllItems` filtered to
 * the one item); the status walks New -> InProgress -> Successful | Failed, and
 * each step maps to one authored slot.
 */
export async function watchQueueItem(
  added: unknown, hooks: QueueTransactionHooks = {},
): Promise<void> {
  const item = queueItemHandle(added);
  if (item === null) {
    // eslint-disable-next-line no-console
    console.warn('[uiapp-convert] the queue add did not return the created item, so the '
      + 'transaction rules cannot be watched and will not run');
    return;
  }
  const deadline = Date.now() + QUEUE_TIMEOUT_MS;
  let previous = '';
  for (;;) {
    let status = '';
    try {
      const res = await getUiPath().queues.getAllItems(item.queueId,
        { folderId: item.folderId, filter: `id eq ${item.id}` });
      status = String(res.items[0]?.status ?? '');
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[uiapp-convert] could not read queue item ' + item.id + ' ('
        + (e instanceof Error ? e.message : String(e)) + '); transaction rules will not run');
      return;
    }
    if (status !== previous) {
      previous = status;
      if (status === 'InProgress') await hooks.onStarted?.();
      if (status === 'Successful') { await hooks.onCompleted?.(); return; }
      if (QUEUE_FAILED_STATES.has(status)) { await hooks.onFailed?.(); return; }
    }
    if (Date.now() > deadline) {
      // eslint-disable-next-line no-console
      console.warn('[uiapp-convert] queue item ' + item.id + ' had not finished after '
        + (QUEUE_TIMEOUT_MS / 60000) + ' minutes; last status was ' + (previous || 'unknown'));
      return;
    }
    await new Promise((resolve) => { setTimeout(resolve, QUEUE_POLL_MS); });
  }
}

/** The created item's handle, from the `QueueItem` the typed insert returned. */
function queueItemHandle(
  added: unknown,
): { id: number; queueId: number; folderId: number } | null {
  const item = added as { id?: unknown; queueId?: unknown; folderId?: unknown } | null;
  return typeof item?.id === 'number' && typeof item.queueId === 'number'
      && typeof item.folderId === 'number'
    ? { id: item.id, queueId: item.queueId, folderId: item.folderId }
    : null;
}

export async function addToQueue(
  queueName: unknown,
  specificContent: Record<string, unknown>,
  options: {
    priority?: unknown; reference?: unknown; postponeBy?: unknown; deadlineBy?: unknown;
    /** The activity's `FolderPath`: the queue lives in this folder, not the app's. */
    folderPath?: unknown;
  } = {},
): Promise<unknown> {
  const queue = located('queue', required(queueName, 'queue', 'add queue item'));
  // An authored folder path names the queue's folder outright and wins over the app's own.
  if (options.folderPath) queue.scope = { folderPath: String(options.folderPath) };
  const asDate = (v: unknown): Date => (v instanceof Date ? v : new Date(String(v)));
  // `insertItemByName` does not consult the Solution's remaps; `located` applies them.
  return getUiPath().queues.insertItemByName(
    queue.name,
    specificContent as Record<string, QueueItemValue>,
    {
      // The folder the payload recorded for THIS queue — path first because it is
      // the portable form, exactly as every other backend call scopes itself.
      ...queue.scope,
      // The SDK defaults to Normal, so priority travels only when authored.
      ...(options.priority ? { priority: String(options.priority) as QueuePriority } : {}),
      ...(options.reference ? { reference: String(options.reference) } : {}),
      ...(options.postponeBy ? { deferDate: asDate(options.postponeBy) } : {}),
      ...(options.deadlineBy ? { dueDate: asDate(options.deadlineBy) } : {}),
    },
  );
}

/** Complete an Action Center task — Apps' `submit-action`. */
export async function submitAction(
  task: unknown, outcome: unknown, data: Record<string, unknown> = {},
): Promise<unknown> {
  /*
   * The HOST'S OWN task — an action app's `actionBinding` resolves to a marker from
   * `lib/action.ts` that carries its completion, because the host (Action Center)
   * must close it through its bridge, not through a direct API call. Duck-typed so
   * this always-emitted-with-data module never imports that optional one.
   */
  const marker = task as {
    __actionTask?: boolean;
    complete?: (outcome: string, data: Record<string, unknown>) => Promise<unknown>;
  } | null;
  if (marker?.__actionTask && typeof marker.complete === 'function') {
    return marker.complete(String(outcome ?? ''), data);
  }
  const sdk = getUiPath();
  const id = typeof task === 'object' && task !== null
    ? Number((task as { id?: unknown; Id?: unknown }).id ?? (task as { Id?: unknown }).Id)
    : Number(task);
  if (!Number.isFinite(id)) {
    throw new Error(`submitAction: no task id in ${JSON.stringify(task)}`);
  }
  return sdk.tasks.complete(
    { taskId: id, type: TaskType.App, action: String(outcome ?? ''), data },
    folderId(String(outcome ?? 'action')),
  );
}

/**
 * Anything the app calls a file, as a `Blob`.
 *
 * An Apps file binding is a descriptor rather than bytes — it may already hold a
 * `blob`, or only a `dataUrl` that has to be fetched back. Shared by the bucket upload
 * and the entity attachment upload so the two cannot disagree about what is uploadable.
 */
async function blobOf(file: unknown): Promise<Blob> {
  const f = file as { blob?: Blob; dataUrl?: string } | Blob | null | undefined;
  if (f instanceof Blob) return f;
  if (f?.blob) return f.blob;
  if (f?.dataUrl) return (await fetch(f.dataUrl)).blob();
  throw new Error('nothing uploadable in the file binding');
}

/**
 * The record a create or update writes, as the object it must be.
 *
 * Taken as `unknown` because that is what a workflow local holding a record IS — its fields
 * are read and written through `recordField` / `setRecordField` for the tenant's casing —
 * and checked here, once, rather than asserted at every call site.
 */
function recordToWrite(record: unknown, what: string): Record<string, unknown> {
  if (record === null || typeof record !== 'object' || Array.isArray(record)) {
    throw new Error(`${what}: the record to write is not set`);
  }
  return record as Record<string, unknown>;
}

/** Options shared by the record operations a workflow activity performs. */
export interface EntityRecordOptions {
  expansionLevel?: number;
  /** From a workflow's `ContinueBatchOnFailure`, already inverted by the emitter. */
  failOnFirst?: boolean;
  timeoutMs?: number;
}

/** What a batch operation answers with. */
export interface EntityBatchResult {
  data: unknown[];
  failed: unknown[];
}

function recordOptions(options: EntityRecordOptions): Record<string, unknown> {
  const { timeoutMs, ...rest } = options;
  return rest as Record<string, unknown>;
}

/**
 * The batch answer, with its failures in the activity's OWN shape.
 *
 * `FailedRecords` is a `Tuple(Of String, TEntity)` list for create and update — the
 * error, then the record — and a list of record ids for delete. The platform answers with
 * `{ error, record }`, which is the same content under other names.
 */
function batchResult(res: unknown, failedAs: 'records' | 'ids' = 'records'): EntityBatchResult {
  const r = res as { successRecords?: unknown[]; failureRecords?: { error?: string; record?: Record<string, unknown> }[] };
  const failed = (r?.failureRecords ?? []).map((f) => (failedAs === 'ids'
    ? fieldOf(f?.record, 'Id') ?? f?.record
    : { Item1: f?.error ?? '', Item2: f?.record }));
  return { data: r?.successRecords ?? [], failed };
}

/** A collection the activity typed as ICollection, as an array. */
function rowsOf(records: unknown): unknown[] {
  if (Array.isArray(records)) return records;
  if (records && typeof (records as Iterable<unknown>)[Symbol.iterator] === 'function') {
    return [...(records as Iterable<unknown>)];
  }
  throw new Error('the records to send are not a collection');
}

/** `GetEntityRecordById` — one record by its id. */
export async function entityRecordById(
  entityName: string, recordId: unknown, options: EntityRecordOptions = {},
): Promise<unknown> {
  const id = await resolveEntityId(entityName);
  // Before the record, so a choice or relationship cell reads as text straight away.
  await ensureEntityMeta(entityName, id);
  return withTimeout(
    getUiPath().entities.getRecordById(id, String(recordId), recordOptions(options) as never),
    options.timeoutMs, `reading a "${entityName}" record`);
}

/** `CreateEntityRecord` — insert one record, answering with the stored one. */
export async function entityRecordCreate(
  entityName: string, record: unknown, options: EntityRecordOptions = {},
): Promise<unknown> {
  const data = recordToWrite(record, `creating a "${entityName}" record`);
  const id = await resolveEntityId(entityName);
  return withTimeout(
    getUiPath().entities.insertRecordById(id, data, recordOptions(options) as never),
    options.timeoutMs, `creating a "${entityName}" record`);
}

/**
 * `UpdateEntityRecord` — overwrite the named fields of one record.
 *
 * A null `recordId` means the RECORD carries it, which is how the activity's
 * record-view mode is authored: the whole entity object is the input and no separate id
 * is given.
 */
export async function entityRecordUpdate(
  entityName: string, recordId: unknown, record: unknown,
  options: EntityRecordOptions = {},
): Promise<unknown> {
  const data = recordToWrite(record, `updating a "${entityName}" record`);
  const id = await resolveEntityId(entityName);
  const target = recordId === null || recordId === undefined
    ? recordIdOf(data) : String(recordId);
  return withTimeout(
    getUiPath().entities.updateRecordById(
      id, target, data, recordOptions(options) as never),
    options.timeoutMs, `updating a "${entityName}" record`);
}

/** `DeleteEntityRecord` — remove one record by its id. */
export async function entityRecordDelete(
  entityName: string, recordId: unknown, options: EntityRecordOptions = {},
): Promise<void> {
  const id = await resolveEntityId(entityName);
  await withTimeout(
    getUiPath().entities.deleteRecordById(id, String(recordId), recordOptions(options) as never),
    options.timeoutMs, `deleting a "${entityName}" record`);
}

/** `CreateMultipleEntityRecords` — one round trip for the whole collection. */
export async function entityRecordsCreate(
  entityName: string, records: unknown, options: EntityRecordOptions = {},
): Promise<EntityBatchResult> {
  const id = await resolveEntityId(entityName);
  return batchResult(await withTimeout(
    getUiPath().entities.insertRecordsById(
      id, rowsOf(records) as Record<string, unknown>[], recordOptions(options) as never),
    options.timeoutMs, `creating "${entityName}" records`));
}

/** `UpdateMultipleEntityRecords` — each record carries its own id. */
export async function entityRecordsUpdate(
  entityName: string, records: unknown, options: EntityRecordOptions = {},
): Promise<EntityBatchResult> {
  const id = await resolveEntityId(entityName);
  return batchResult(await withTimeout(
    getUiPath().entities.updateRecordsById(
      id, rowsOf(records) as never, recordOptions(options) as never),
    options.timeoutMs, `updating "${entityName}" records`));
}

/** `DeleteMultipleEntityRecords` — a collection of record ids. */
export async function entityRecordsDelete(
  entityName: string, recordIds: unknown, options: EntityRecordOptions = {},
): Promise<EntityBatchResult> {
  const id = await resolveEntityId(entityName);
  return batchResult(await withTimeout(
    getUiPath().entities.deleteRecordsById(
      id, rowsOf(recordIds).map(String), recordOptions(options) as never),
    options.timeoutMs, `deleting "${entityName}" records`), 'ids');
}

/** `UploadFileToRecordField` — attach a file to one field of one record. */
export async function entityFileUpload(
  entityName: string, recordId: unknown, field: unknown, file: unknown,
  options: EntityRecordOptions = {},
): Promise<unknown> {
  const id = await resolveEntityId(entityName);
  return withTimeout(
    getUiPath().entities.uploadAttachment(
      { id }, String(recordId), String(field), await blobOf(file),
      recordOptions(options) as never),
    options.timeoutMs, `uploading to "${entityName}"`);
}

/** `DownloadFileFromRecordField` — the field's file, as bytes. */
export async function entityFileDownload(
  entityName: string, recordId: unknown, field: unknown,
  options: EntityRecordOptions = {},
): Promise<Blob> {
  const id = await resolveEntityId(entityName);
  const record = String(recordId);
  const fieldName = String(field);
  const named = async (): Promise<Blob> => {
    const [bytes, stored] = await Promise.all([
      // 1.7 takes an EntityRef, not the bare id: the attachment methods changed together.
      getUiPath().entities.downloadAttachment(
        { id }, record, fieldName, recordOptions(options) as never) as Promise<Blob>,
      // Read only for the name: if it fails, the bytes come back as they are.
      getUiPath().entities.getRecordById(id, record).catch(() => undefined),
    ]);
    const name = (fieldOf(stored, fieldName) as EntityAttachment | undefined)?.Name;
    return name ? new File([bytes], name, { type: bytes.type }) : bytes;
  };
  return withTimeout(named(), options.timeoutMs, `downloading from "${entityName}"`);
}

/** `DeleteFileFromRecordField` — clear the field's file. */
export async function entityFileDelete(
  entityName: string, recordId: unknown, field: unknown,
  options: EntityRecordOptions = {},
): Promise<unknown> {
  const id = await resolveEntityId(entityName);
  return withTimeout(
    getUiPath().entities.deleteAttachment(
      { id }, String(recordId), String(field), recordOptions(options) as never),
    options.timeoutMs, `removing a file from "${entityName}"`);
}

/** `AddTransactionItem` — take the next item and mark it InProgress. */
export async function queueStartTransaction(queueName: unknown): Promise<unknown> {
  // The SDK sends only the queue name: this is "take the next waiting item". The
  // AddTransactionItem activity, which ADDS one, refuses rather than calling this.
  // Started where the deploy put the queue, so a remap reaches it.
  const queue = located('queue', String(required(queueName, 'queue', 'start transaction')));
  return getUiPath().queues.startTransaction({ name: queue.name }, queue.scope as never);
}

/**
 * `SetTransactionStatus` — close a transaction, successfully or not.
 *
 * A failure carries its reason: the activity requires one, and a failed item with no
 * reason is one nobody can triage.
 */
export async function queueCompleteTransaction(
  item: unknown, status: unknown,
  detail: { reason?: unknown; details?: unknown; errorType?: unknown;
    output?: Record<string, unknown>; analytics?: Record<string, unknown> } = {},
): Promise<void> {
  const i = item as { id?: unknown; Id?: unknown; folderId?: unknown } | number | string;
  const id = typeof i === 'object' && i !== null ? (i.id ?? i.Id) : i;
  // In the item's own folder: it was started wherever its queue was, remapped or not.
  const folder = typeof i === 'object' && i !== null && typeof i.folderId === 'number' ? i.folderId : undefined;
  if (id === undefined || id === null) {
    throw new Error('set transaction status: the transaction item has no id');
  }
  const failed = String(status ?? 'Successful') === 'Failed';
  /*
   * The activity's `ErrorType` is `Business` or `Application`; Orchestrator's is
   * `BusinessException` or `ApplicationException`, and the difference decides whether
   * the item is RETRIED. Unset, the activity means Business — no retry — so that is sent
   * rather than leaving the server to pick.
   */
  const kind = String(detail.errorType ?? 'Business').replace(/Exception$/, '');
  await getUiPath().queues.completeTransaction(Number(id), String(status ?? 'Successful') as never, {
    ...(failed ? {
      processingError: {
        reason: String(detail.reason ?? ''),
        ...(detail.details ? { details: String(detail.details) } : {}),
        type: (kind + 'Exception') as never,
      },
    } : {}),
    ...(detail.output ? { outputData: detail.output } : {}),
    ...(detail.analytics ? { analytics: detail.analytics } : {}),
    ...(folder !== undefined ? { folderId: folder } : {}),
  } as never);
}

/**
 * `GetQueueItems` — a page of a queue's items.
 *
 * The page NUMBER arrives already divided, for the same reason `jobList`'s does.
 */
export async function queueItems(
  queueName: unknown, pageSize?: unknown, jumpToPage?: unknown,
): Promise<unknown[]> {
  const name = String(required(queueName, 'queue', 'get queue items'));
  // `getByName` applies a Solution remap itself; the items are read where it found the queue.
  const queue = await getUiPath().queues.getByName(name, lookupScope(resourceOverride('queue', name), name));
  if (!queue?.id) throw new Error('queue "' + name + '" not found');
  const size = pageSize === null || pageSize === undefined ? undefined : Number(pageSize);
  const jump = jumpToPage === null || jumpToPage === undefined ? undefined : Number(jumpToPage);
  const res = await getUiPath().queues.getAllItems(Number(queue.id), {
    folderId: queue.folderId,
    ...(size ? { pageSize: size } : {}),
    ...(jump ? { jumpToPage: jump } : {}),
  } as never) as { items?: unknown[] } | unknown[];
  return Array.isArray(res) ? res : (res.items ?? []);
}

/**
 * `NetHttpRequest` — an ordinary HTTP call to somewhere that is NOT Orchestrator.
 *
 * Deliberately not the authenticated-REST helper: that one attaches the user's UiPath
 * bearer token and resolves a tenant-relative path. Sending that token to a third-party URL
 * would hand a UiPath credential to whoever owns the host, so this takes an absolute
 * URL and sends only the headers the designer asked for.
 *
 * RETRIES ARE NOT REPRODUCED. The activity retries three times by default, but which
 * status codes trigger a retry is not documented anywhere available, and a guess would
 * change which calls repeat — and a repeated POST is not a repeated GET. Without them a
 * transient failure throws where the original would have recovered, which is the loud
 * direction rather than the silent one.
 */
export async function httpRequest(
  url: unknown,
  options: {
    method?: unknown; headers?: Record<string, unknown>;
    params?: Record<string, unknown>; body?: unknown; contentType?: unknown;
    bearer?: unknown; timeoutMs?: unknown;
  } = {},
): Promise<{ StatusCode: number; TextContent: string; Headers: Record<string, string> }> {
  const target = new URL(String(required(url, 'url', 'HTTP request')));
  for (const [k, v] of Object.entries(options.params ?? {})) {
    if (v !== undefined && v !== null) target.searchParams.set(k, String(v));
  }
  const headers: Record<string, string> = {};
  for (const [k, v] of Object.entries(options.headers ?? {})) headers[k] = String(v ?? '');
  if (options.bearer) headers.Authorization = `Bearer ${String(options.bearer)}`;
  const verb = String(options.method ?? 'GET').toUpperCase();
  const sendsBody = options.body !== undefined && options.body !== null
    && verb !== 'GET' && verb !== 'HEAD';
  if (sendsBody && !headers['Content-Type']) {
    headers['Content-Type'] = String(options.contentType ?? 'application/json');
  }
  const ms = Number(options.timeoutMs ?? 0);
  const res = await fetch(target.toString(), {
    method: verb,
    headers,
    ...(sendsBody
      ? { body: typeof options.body === 'string' ? options.body : JSON.stringify(options.body) }
      : {}),
    // The activity's own default is 10 seconds; a browser fetch has no timeout at all,
    // so one left unset here would hang where the original gave up.
    signal: AbortSignal.timeout(ms > 0 ? ms : 10000),
  });
  const out: Record<string, string> = {};
  res.headers.forEach((v, k) => { out[k] = v; });
  return { StatusCode: res.status, TextContent: await res.text(), Headers: out };
}

/**
 * `StartJob` / `BeginProcess` — launch a process and do NOT wait.
 *
 * The waiting kind is `startProcess`, which an authored rule already uses; the
 * difference is the whole point of these two activities, so they do not share it. The
 * job key comes back so a later `StopJob` has something to name.
 */
export async function jobStart(
  processName: unknown, inputs: Record<string, unknown> = {},
): Promise<{ jobKey?: string; jobId?: number; folderId: number }> {
  const name = String(required(processName, 'process', 'start job'));
  /*
   * The RELEASE key, not the payload's processKey — that is the PACKAGE id, and starting
   * with it is a 400 "Undefined process". Resolved the same way `startProcess` does, and
   * through the options overload the SDK keeps.
   */
  const release = await resolveRelease(name);
  const started = await getUiPath().processes.start(
    { processKey: release.key, inputArguments: JSON.stringify(inputs) },
    { folderId: release.folderId },
  );
  const job = started?.[0] as { key?: string; id?: number } | undefined;
  return { jobKey: job?.key, jobId: job?.id, folderId: release.folderId };
}

/**
 * `RunJob` / `InvokeProcess` — launch and wait for the outputs.
 *
 * The same call `startProcess` makes for an authored rule, so the two cannot drift. The
 * answer is shaped as the activity's `OrchestratorJob`: `Key`, `State` and the
 * `OutputArguments` a workflow reads off it.
 */
export async function jobRun(
  processName: unknown, inputs: Record<string, unknown> = {}, limits: JobWaitLimits = {},
): Promise<{ Key?: string; State?: string; OutputArguments: Record<string, unknown> }> {
  const run = await startProcess(processName, inputs, {}, limits);
  return { Key: run.jobKey, State: run.state, OutputArguments: run.output ?? {} };
}

/**
 * The folder a job lives in, for the SDK calls that take a number.
 *
 * A job from `GetJobs` or `StartJob` carries its folder. A bare key does not, and
 * outside an Action Center task the app knows none — so the job is looked up, in the
 * folder the deployment resolves, and its folder read off it.
 */
async function jobFolder(key: string, carried: unknown): Promise<number> {
  if (typeof carried === 'number') return carried;
  const known = getHostFolderId();
  if (known !== undefined) return known;
  const listed = await new JobService(getUiPath()).getAll({ filter: `Key eq ${key}` } as never) as
    { items?: { key?: string; folderId?: number }[] } | { key?: string; folderId?: number }[];
  const rows = Array.isArray(listed) ? listed : listed.items ?? [];
  const found = rows.find((j) => j.key === key);
  if (typeof found?.folderId !== 'number') {
    throw new Error('stop job: job ' + key + ' was not found in the folder this app works in');
  }
  return found.folderId;
}

/** `StopJob` — soft-stop or kill a job started earlier. */
export async function jobStop(job: unknown, strategy?: unknown): Promise<void> {
  const j = job as { jobKey?: string; key?: string; Key?: string; folderId?: number } | string;
  const key = typeof j === 'string' ? j : (j?.jobKey ?? j?.key ?? j?.Key);
  if (!key) throw new Error('stop job: the job has no key to stop');
  const fid = await jobFolder(String(key), typeof j === 'object' ? j?.folderId : undefined);
  // `JobService` is a SUBPATH service, not a property of the SDK root — the same
  // construction `awaitJobOutput` already uses.
  await new JobService(getUiPath()).stop([String(key)], fid,
    strategy ? { strategy: String(strategy) as never } : undefined);
}

/**
 * `GetJobs` — a page of jobs.
 *
 * The page NUMBER arrives already divided. The activity gives a row offset and the SDK
 * addresses pages, and the division belongs where the Data Fabric query already does
 * it — in the emitted code, through the shared `pageFromOffset`, which throws rather
 * than landing on a neighbouring page. Repeating it here would be a second copy of a
 * rule that has to agree with itself.
 *
 * The folder is named only when one is known — a host task's, or one recorded for the
 * app. Otherwise the SDK scopes the listing to the folder the app was deployed to, which
 * is what every other call here does; demanding a number threw in every app that was
 * not opened from an Action Center task.
 */
export async function jobList(
  pageSize?: unknown, jumpToPage?: unknown,
): Promise<unknown[]> {
  const size = pageSize === null || pageSize === undefined ? undefined : Number(pageSize);
  const jump = jumpToPage === null || jumpToPage === undefined
    ? undefined : Number(jumpToPage);
  const fid = getHostFolderId();
  const res = await new JobService(getUiPath()).getAll({
    ...(fid !== undefined ? { folderId: fid } : {}),
    ...(size ? { pageSize: size } : {}),
    ...(jump ? { jumpToPage: jump } : {}),
  } as never) as { items?: unknown[] } | unknown[];
  return Array.isArray(res) ? res : (res.items ?? []);
}

export async function storageUpload(
  bucketName: unknown, destination: unknown, fileName: unknown, file: unknown,
): Promise<unknown> {
  const { id, scope } = await resolveBucket(
    String(required(bucketName, 'storage bucket', 'upload storage file')));
  const content = await blobOf(file);
  const name = fileName === null || fileName === undefined || fileName === ''
    ? ((file as { name?: string } | null)?.name ?? 'file')
    : String(fileName);
  const dir = String(destination ?? '').replace(/^\/+|\/+$/g, '');
  return getUiPath().buckets.uploadFile(id, dir ? dir + '/' + name : name, content, scope);
}

/** `DownloadStorageFile` — the file's bytes, as the app's own file shape. */
export async function storageDownload(
  bucketName: unknown, path: unknown,
): Promise<AppsFile> {
  return downloadFromBucket(bucketName, path);
}

/** `DeleteStorageFile`. */
export async function storageDelete(bucketName: unknown, path: unknown): Promise<void> {
  const { id, scope } = await resolveBucket(
    String(required(bucketName, 'storage bucket', 'delete storage file')));
  await getUiPath().buckets.deleteFile(
    id, String(required(path, 'path', 'delete storage file')), scope);
}

/**
 * `ListStorageFiles` — the files under a directory.
 *
 * Filtered HERE rather than by the service. `getFiles` takes only a `fileNameRegex`
 * and no directory or recursion, and what that regex matches — a base name or a whole
 * path — is not documented, so pushing the directory into it would be a guess about
 * which files come back. Every page is walked because a partial listing is a wrong
 * answer rather than a shorter one.
 *
 * Each entry is a `StorageFileInfo` — `{ FileFullPath }` — because that is what the
 * activity's result holds: a workflow iterates it and reads `.FileFullPath` off each
 * entry. Returning the bare path strings made every such read `undefined`.
 */
export async function storageList(
  bucketName: unknown, directory: unknown, recursive = true,
): Promise<{ FileFullPath: string }[]> {
  const { id, scope } = await resolveBucket(
    String(required(bucketName, 'storage bucket', 'list storage files')));
  const dir = String(directory ?? '').replace(/^\/+|\/+$/g, '');
  const prefix = dir ? dir + '/' : '';

  const found: { FileFullPath: string }[] = [];
  let cursor: unknown;
  do {
    const page = await getUiPath().buckets.getFiles(
      id, { ...scope, pageSize: 100, ...(cursor ? { cursor } : {}) } as never,
    ) as { items?: { fullPath?: string; path?: string; name?: string }[]; nextCursor?: unknown };
    for (const item of page.items ?? []) {
      const full = item.fullPath ?? item.path ?? item.name ?? '';
      if (!full.startsWith(prefix)) continue;
      // A non-recursive listing is this directory only, not everything beneath it.
      if (!recursive && full.slice(prefix.length).includes('/')) continue;
      found.push({ FileFullPath: full });
    }
    cursor = page.nextCursor;
  } while (cursor);
  return found;
}

/** `ReadStorageText` — a bucket file as text. */
export async function storageReadText(
  bucketName: unknown, path: unknown,
): Promise<string> {
  const file = await downloadFromBucket(bucketName, path);
  if (file.blob) return file.blob.text();
  if (file.dataUrl) return (await fetch(file.dataUrl)).text();
  throw new Error('the storage file returned no content to read');
}

/** `WriteStorageText` — text into a bucket file, replacing it. */
export async function storageWriteText(
  bucketName: unknown, path: unknown, text: unknown,
): Promise<unknown> {
  const { id, scope } = await resolveBucket(
    String(required(bucketName, 'storage bucket', 'write storage text')));
  return getUiPath().buckets.uploadFile(
    id, String(required(path, 'path', 'write storage text')),
    new Blob([String(text ?? '')], { type: 'text/plain' }), scope);
}

// ── integration service ──────────────────────────────────────────────────────

/**
 * `GetRobotAsset` — an Orchestrator asset's value, by name.
 *
 * The value only. The activity's output is typed `object` and carries whatever the
 * asset's type says — text, integer or boolean — which is exactly what `value` holds.
 */
export async function orchestratorAsset<T = unknown>(name: unknown): Promise<T> {
  const asset = await getUiPath().assets.getByName(
    String(required(name, 'asset', 'get asset')));
  // Typed as the variable the activity fills declares: the asset's own type is what
  // Orchestrator stores and returns, and that variable is where the workflow stated it.
  return asset.value as T;
}

/**
 * `SetAsset` — update an asset that already exists.
 *
 * The activity cannot create one either ("the asset must already exist in
 * Orchestrator"), so a missing asset is the platform's error to raise, not ours to
 * paper over by creating it.
 */
export async function orchestratorAssetSet(name: unknown, value: unknown): Promise<void> {
  await getUiPath().assets.updateValue(
    { name: String(required(name, 'asset', 'set asset')) },
    value as string | number | boolean);
}
