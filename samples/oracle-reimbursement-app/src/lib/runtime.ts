/** The accessors emitted expressions call. */
import { useEffect, useRef, useState } from 'react';
import { useAppSelector } from '../store/hooks';
import {
  bumpEntityVersionAction, controlKey, resetAppVarAction, resetControlPropAction,
  resolveRowName, setAppVarAction, setControlPropAction, setProcessOutputAction, store,
  useRowScopedName,
} from '../store/store';

// Components take the row scope from here, so they never import the store directly.
export { RowScope, useRowScopedName, clearRowSlots } from '../store/store';
import { APP_MEDIA } from './app-media';

// ── where the HOST serves this app from ──────────────────────────────────────
/**
 * The base path this app is served under, for the router.
 *
 * A DEPLOYED coded app is served from a sub-path — the platform states it as
 * `<meta name="uipath:app-base">` (e.g. `/org/apps_/…/public`). A `BrowserRouter`
 * without this sees that whole prefix as the route, matches NOTHING, and renders a
 * blank page with no error — which is exactly what a deployed app did while running
 * fine on localhost, where the base is `/`.
 *
 * Equivalent to the SDK's own `getAppBase()`, inlined so a data-free app (which does
 * not depend on the SDK) still routes correctly once deployed.
 */
export function appBase(): string {
  if (typeof document === 'undefined') return '/';
  const el = document.querySelector('meta[name="uipath:app-base"]');
  return el?.getAttribute('content') || '/';
}

// ── the folder the HOST put this app in ──────────────────────────────────────
/**
 * The Orchestrator folder this app is running in, as the host reports it.
 *
 * An Action Center task carries its own folder — `getTask()` returns `folderId` as a
 * NUMBER, which is exactly what the folder-scoped SDK calls want — so an action app
 * never has to be told which folder it is in, and `uipath.json` accordingly has no
 * folder field. `action.ts` sets this the moment the task arrives; the data layer
 * prefers it over anything configured.
 *
 * A plain holder rather than an import, for the same reason as the registry below:
 * `data.ts` must not depend on the optional action module.
 */
let hostFolderId: number | undefined;
export function setHostFolderId(id: unknown): void {
  hostFolderId = typeof id === 'number' && Number.isFinite(id) ? id : undefined;
}
export function getHostFolderId(): number | undefined {
  return hostFolderId;
}

// ── cell-text translation, late-bound ────────────────────────────────────────
/**
 * How a component asks "what does this stored value DISPLAY as" — a choice ordinal's
 * label, a relationship's named field. A REGISTRY rather than an import, because the
 * only resolver lives in the DATA layer and data-free apps do not carry one: a hard
 * import from a shared component would drag the SDK into every app with a dropdown.
 * `data.ts` registers itself here when it is part of the app; when it is not, values
 * display raw — which is also all they can be without a schema to translate through.
 */
/**
 * A record's FILE field, as Data Fabric returns it: `{ Id, Name, Path, Type, Size, EntityId,
 * RecordId, FieldId }` with Path `<entity>/<record id>/<field>`. Apps' own loader
 * (`EntityAttachmentAppsFile`) keys on `Path`; so does this.
 */
export interface EntityAttachment {
  Path: string;
  Name?: string;
  Type?: string;
  EntityId?: string;
  RecordId?: string;
}

export function isEntityAttachment(v: unknown): v is EntityAttachment {
  return !!v && typeof v === 'object' && typeof (v as EntityAttachment).Path === 'string'
    && /^[^/]+[/][^/]+[/][^/]+$/.test((v as EntityAttachment).Path);
}

/**
 * Filled in by the data layer when the app has one: how to fetch an entity attachment's
 * bytes, and where an Orchestrator job attachment can be read from.
 */
export const attachmentResolvers: {
  download?: (att: EntityAttachment) => Promise<Blob>;
  jobAttachment?: (id: string) => Promise<string>;
} = {};

/**
 * `New AppsFile(id, fullName, mimeType, {"__type": "JobAttachment"})` — an uploaded job
 * attachment, named by its id. The bytes are fetched only when the file is opened.
 */
export function jobAttachmentFile(id: unknown, fullName: unknown, mimeType: unknown): AppsFile {
  const name = fullName === null || fullName === undefined ? '' : String(fullName);
  return {
    Id: id === null || id === undefined ? undefined : String(id),
    Name: name,
    FullName: name,
    MimeType: mimeType === null || mimeType === undefined ? undefined : String(mimeType),
    Metadata: { __type: 'JobAttachment' },
  };
}

/** A job attachment known only by its id — nothing local to open it from yet. */
export function isJobAttachment(v: unknown): v is AppsFile & { Id: string } {
  if (!v || typeof v !== 'object') return false;
  const f = v as AppsFile;
  return f.Metadata?.__type === 'JobAttachment' && typeof f.Id === 'string' && f.Id !== ''
    && !f.URL && !f.blob && !f.dataUrl;
}

export const cellTextResolvers: {
  entity?: (entity: string, field: string, value: unknown) => string | undefined;
} = {};

// ── entity data versions ─────────────────────────────────────────────────────
/**
 * Subscribe to "this entity's data changed". A data source over an entity lists this
 * in its effect dependencies, so any create/update/delete against the entity re-runs
 * its Fetch — the re-evaluation Apps performs itself after entity rules. Without it a
 * successful write changed the server and nothing on screen.
 */
export function useEntityVersion(entity: string): number {
  return useAppSelector((s) => s.entityVersions[entity] ?? 0);
}

/** The write side: the data layer bumps this after every successful entity write. */
export function bumpEntityVersion(entity: string): void {
  store.dispatch(bumpEntityVersionAction(entity));
}

// ── app variables ────────────────────────────────────────────────────────────
export function useAppVar<T = unknown>(name: string): T | undefined {
  return useAppSelector((s) => s.appVars[name]) as T | undefined;
}

export function getAppVar<T = unknown>(name: string): T | undefined {
  return store.getState().appVars[name] as T | undefined;
}

export function setAppVar(name: string, value: unknown): void {
  store.dispatch(setAppVarAction({ name, value }));
}

/** Publish a completed job's output arguments; see `AppState.processOutputs`. */
export function setProcessOutput(
  process: string, output: Record<string, unknown>, entryPoint?: string,
): void {
  const namespaced = entryPoint
    ? Object.fromEntries(Object.entries(output).map(([k, v]) => [`${entryPoint}/${k}`, v]))
    : output;
  store.dispatch(setProcessOutputAction({ process, output: namespaced }));
}

/** One output argument of a process's last run — `Processes.<name>.<out_arg>`. */
export function processOutput<T = unknown>(process: string, argument: string): T | undefined {
  return store.getState().processOutputs[process]?.[argument] as T | undefined;
}

/** Replace the ROWS of a list-source app variable — `ListSource_X.data = rows`. */
export function setListData(name: string, rows: unknown): void {
  const current = store.getState().appVars[name];
  const known = current && typeof current === 'object' && !Array.isArray(current)
    ? (current as { totalRecords?: unknown }).totalRecords
    : undefined;
  const list = Array.isArray(rows) ? rows : [];
  setAppVar(name, {
    data: list,
    totalRecords: typeof known === 'number' ? known : list.length,
  });
}

/** Reset every control on a page to its authored default — Apps' `Reset(SomePage)`. */
export function resetPage(page: string): void {
  const controls = store.getState().controls;
  for (const key of Object.keys(controls)) {
    const [owner, control] = key.split('/');
    if (owner !== page || !control) continue;
    for (const prop of Object.keys(controls[key] ?? {})) {
      store.dispatch(resetControlPropAction({ page, control, prop }));
    }
  }
}

/** One control back to its authored defaults — every property it has, touched state included. */
export function resetControl(page: string, control: string): void {
  const name = resolveRowName(page, control);
  const props = store.getState().controls[controlKey(page, name)] ?? {};
  for (const prop of Object.keys(props)) {
    store.dispatch(resetControlPropAction({ page, control: name, prop }));
  }
}

/** The key a rule outcome is stored under. */
export const ruleKey = (page: string, control: string, rule: string) =>
  `${page}/${control}/${rule}`;

/** A rule's outcome, read inside a handler. `undefined` until the rule has run. */
export function ruleOutcome<T = unknown>(
  page: string, control: string, rule: string,
): T | undefined {
  return store.getState().ruleOutcomes[ruleKey(page, control, rule)] as T | undefined;
}

/** The reactive form, for a rule outcome read during render. */
export function useRuleOutcome<T = unknown>(
  page: string, control: string, rule: string,
): T | undefined {
  return useAppSelector((s) => s.ruleOutcomes[ruleKey(page, control, rule)]) as T | undefined;
}

/** The reactive form, for a process output read during render. */
export function useProcessOutput<T = unknown>(
  process: string, argument: string,
): T | undefined {
  return useAppSelector((s) => s.processOutputs[process]?.[argument]) as T | undefined;
}

export function resetAppVar(name: string): void {
  store.dispatch(resetAppVarAction(name));
}

// ── control properties ───────────────────────────────────────────────────────
/*
 * Inside a list row, a template control is that ROW's instance (see RowScope in the
 * store). The hook forms learn it from context; the imperative forms, which run in
 * handlers with no context, resolve a template control to the selected row's instance.
 */
/**
 * A CONTROL'S ROWS ARE ITS `DataSource`, wherever they are kept.
 *
 * Apps exposes the rows a control is bound to as `<Control>.DataSource`, and authored
 * expressions read them that way - the "which option is selected" expression of every
 * dropdown, multi-select and radio group is
 * `Control.DataSource.Where(x => x.NumberId = Record.Field).First()`, and a caption
 * reads `List.DataSource.totalRecords`.
 *
 * Here the rows live in their own slice, published by the source loader, and nothing ever
 * wrote a `DataSource` property. So that read was always undefined, the Where ran over
 * an empty list, and no list control ever showed the value the record held: an Edit popup
 * opened with its dropdowns, its radio group and its multi-select all blank, and saving
 * then wrote those blanks back over good data.
 *
 * Resolved on READ rather than by copying the rows into a second place: one source of
 * truth, no effect to keep them in step, and nothing to go stale. What is read is the
 * source ENTRY itself - `{ data, totalRecords, ... }` - and always that: the emitted
 * expressions go through `listData` / `listCount`, which take exactly this shape, and
 * the entry is a stable reference, so a selector returning it does not re-render on
 * unrelated changes. It used to be the bare rows before the fetch and a copied
 * `{ data, totalRecords }` object after it (the loader wrote that copy into the controls
 * slice for the caption), so the same property changed shape mid-life (PR #170 review).
 */
const SOURCE_PROP = 'DataSource';

export function useControlProp<T = unknown>(page: string, control: string, prop: string): T | undefined {
  const name = useRowScopedName(page, control);
  return useAppSelector((s) => {
    const own = s.controls[controlKey(page, name)]?.[prop];
    if (own !== undefined || prop !== SOURCE_PROP) return own;
    return s.sources[controlKey(page, name)];
  }) as T | undefined;
}

/**
 * Every property a control has been given at runtime.
 *
 * One selector for the whole bag rather than one per property: a component resolves all
 * of its overridable props together, and a selector per prop would subscribe it many
 * times over for the same slice of state.
 */
export function useControlProps(
  page: string, control: string,
): Record<string, unknown> | undefined {
  return useAppSelector((s) => s.controls[controlKey(page, control)]);
}

export function getControlProp<T = unknown>(page: string, control: string, prop: string): T | undefined {
  const name = resolveRowName(page, control);
  const state = store.getState();
  const own = state.controls[controlKey(page, name)]?.[prop];
  if (own !== undefined || prop !== SOURCE_PROP) return own as T | undefined;
  return state.sources[controlKey(page, name)] as T | undefined;
}

export function setControlProp(page: string, control: string, prop: string, value: unknown): void {
  store.dispatch(setControlPropAction({ page, control: resolveRowName(page, control), prop, value }));
}

/**
 * Whether the user has LEFT a field — a validation message shows only after that. A store
 * prop rather than component state so a rule can clear it: Apps' Reset Value makes the
 * control untouched again, and so hides its message (see `useFieldValidity`).
 */
export const TOUCHED_PROP = 'Touched';

export function resetControlProp(page: string, control: string, prop: string): void {
  const name = resolveRowName(page, control);
  store.dispatch(resetControlPropAction({ page, control: name, prop }));
  // Resetting a field's VALUE resets the field, touched state included, as Apps' reset does.
  if (prop === 'Value') store.dispatch(resetControlPropAction({ page, control: name, prop: TOUCHED_PROP }));
}

/**
 * Whether every source loader on `page` has finished. Apps keeps its loading curtain up
 * until the page's controls have initialised — their data sources included — and this is
 * that answer for the converted page: no source of the page's controls is still `loading`.
 */
export function usePageSourcesSettled(page: string): boolean {
  const prefix = page + '/';
  return useAppSelector((s) => !Object.entries(s.sources)
    .some(([key, source]) => key.startsWith(prefix) && source?.loading === true));
}

/*
 * The UNSCOPED forms, for a slot that is not a control on a page.
 *
 * Row scoping must not reach a slot no row owns. `lib/action.ts` keeps the host task's
 * properties under a reserved pseudo-control, and reading one from inside a list row
 * template scoped its name to that row — naming a slot nobody ever wrote, so every
 * action property read as unset there. A real app's per-row question list rendered
 * completely blank because of it, with no error on screen. A row owns the controls its
 * TEMPLATE declares; it does not own the task.
 */
export function useUnscopedProp<T = unknown>(page: string, control: string, prop: string): T | undefined {
  return useAppSelector((s) => s.controls[controlKey(page, control)]?.[prop]) as T | undefined;
}

export function getUnscopedProp<T = unknown>(page: string, control: string, prop: string): T | undefined {
  return store.getState().controls[controlKey(page, control)]?.[prop] as T | undefined;
}

export function setUnscopedProp(page: string, control: string, prop: string, value: unknown): void {
  store.dispatch(setControlPropAction({ page, control, prop, value }));
}

// ── session ──────────────────────────────────────────────────────────────────
/** A property of the signed-in user. */
export interface CurrentUserInfo {
  Groups?: string[];
  FirstName?: string;
  LastName?: string;
  DisplayName?: string;
  Email?: string;
  /** The tenant the app is signed in to — what a workflow trigger's job info reports. */
  TenantName?: string;
}

let currentUserInfo: CurrentUserInfo = {};

/**
 * Called once after authentication, from the SDK's token (see `userFromToken` in
 * `lib/sdk`). Apps' `UserContext.User.CurrentUser` exposes DisplayName, FirstName,
 * LastName and Email; the same four are filled here.
 */
export function setCurrentUser(info: CurrentUserInfo): void {
  currentUserInfo = info;
}

export function currentUser<T = unknown>(prop: string): T | undefined {
  return (currentUserInfo as Record<string, unknown>)[prop] as T | undefined;
}

/** Run an ASYNC read in render position. */
export function useAsyncRead<T = unknown>(
  key: string, load: () => Promise<T>, deps: readonly unknown[] = [],
): T | undefined {
  const [value, setValue] = useState<T | undefined>(undefined);
  const signature = `${key}|${JSON.stringify(deps)}`;

  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    let live = true;
    loadRef.current().then(
      (result: T) => { if (live) setValue(result); },
      (err: unknown) => {
        if (live) setValue(undefined);
        console.error(`useAsyncRead(${key}) failed`, err);
      },
    );
    return () => { live = false; };
  }, [signature, key]);

  return value;
}

// ── assets ───────────────────────────────────────────────────────────────────
/** Resolve a bundled asset path against the deploy base. */
export function assetUrl(title: string): string {
  const base = (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '');
  const entry = APP_MEDIA[title];
  if (!entry) {
    console.error(`[uiapp-convert] no bundled media named "${title}". `
      + 'Known names: ' + Object.keys(APP_MEDIA).join(', '));
    return `${base}/assets/${title}`;
  }
  return `${base}/assets/${entry.file}`;
}

// ── records ──────────────────────────────────────────────────────────────────
/**
 * The KEY a row actually uses for a field, or undefined when it has none.
 *
 * Three spellings meet here and none of them agrees: the author's (VB is
 * case-insensitive, so `isActive` is a fine way to write `IsActive`), the entity
 * schema's (`IsActive`), and the wire's — Data Fabric records come back PascalCase,
 * choice-set rows camelCase (`displayName`), and a DataTable however the workflow named
 * its columns. Apps resolves through its property mapping and never compares the
 * strings; the generated code has only the strings. So: the exact key first, then the
 * camelCase twin, then a case-insensitive match. A blank grid column and an empty
 * dropdown were each one of these mismatches.
 */
export function fieldKey(row: unknown, field: string): string | undefined {
  if (row === null || row === undefined || typeof row !== 'object') return undefined;
  const r = row as Record<string, unknown>;
  // A browser File is an AppsFile too: its members live on the prototype under other names.
  if (typeof Blob !== 'undefined' && row instanceof Blob) {
    const aliases: Record<string, string> = { filesize: 'size', name: 'name', mimetype: 'type' };
    const k = aliases[field.toLowerCase()];
    if (k) return k;
  }
  // A PLAIN record's own keys only — its field `Constructor` is not the `constructor` every
  // object inherits. Anything else (an Error, a DOMException, a File, a class instance)
  // keeps its members on the prototype, where `message` or `name` really is.
  const proto = Object.getPrototypeOf(r);
  const plain = proto === Object.prototype || proto === null;
  const has = (k: string) => (plain ? Object.hasOwn(r, k) : k in r);
  if (has(field)) return field;
  const camel = field.charAt(0).toLowerCase() + field.slice(1);
  if (has(camel)) return camel;
  const lower = field.toLowerCase();
  return Object.keys(r).find((k) => k.toLowerCase() === lower);
}

/** A field's value through `fieldKey` — the tolerant read every component uses. */
export function fieldOf<T = unknown>(row: unknown, field: string): T | undefined {
  /*
   * A browser File carries only its name, and the AppsFile members built from it are
   * DERIVED, as they are for a file the runtime builds itself: `Extension` keeps its dot
   * and is '' with none. Read through the name alias, an uploaded `report.pdf` had the
   * Extension `report.pdf`. A value a workflow WROTE onto the file wins.
   */
  if (typeof Blob !== 'undefined' && row instanceof Blob && !Object.hasOwn(row, field)) {
    const name = String((row as { name?: unknown }).name ?? '');
    const dot = name.lastIndexOf('.');
    switch (field.toLowerCase()) {
      case 'extension': return (dot > 0 ? name.slice(dot) : '') as T;
      case 'namewithoutextension': return (dot > 0 ? name.slice(0, dot) : name) as T;
      case 'fullname': return name as T;
      default: break;
    }
  }
  const key = fieldKey(row, field);
  return key === undefined ? undefined : (row as Record<string, unknown>)[key] as T;
}

/** Read a field from a Data Fabric record, or a column from a DataTable row. */
export function recordField<T = unknown>(row: unknown, field: string | number): T | undefined {
  if (row === null || row === undefined || typeof row !== 'object') return undefined;
  if (typeof field === 'number') return Object.values(row as Record<string, unknown>)[field] as T | undefined;
  return fieldOf<T>(row, field);
}

/**
 * Write a field of a record held in a workflow local — the write side of `recordField`.
 *
 * The key is resolved as a read resolves it (the exact name, the camelCase twin, then a
 * case-insensitive match), so the value lands where the next read looks. Assigned by the
 * authored name, a record fetched as `appID` gained a SECOND key `AppID`, and the update
 * that followed sent both. A record that is not set is an error, as it is in VB.
 */
export function setRecordField(row: unknown, field: unknown, value: unknown): void {
  if (row === null || row === undefined || typeof row !== 'object') {
    throw new TypeError(`cannot set "${field}": the record it belongs to is not set`);
  }
  // Through `fieldKey` itself, so the write and the next read cannot resolve apart — except a
  // file's derived members (Extension and the rest), which fieldOf computes from its name and
  // a write must not overwrite the name for.
  // A column held in a variable can be Nothing, which VB rejects too.
  if (field === null || field === undefined) {
    throw new TypeError('cannot set a field: its name is not set');
  }
  // A column POSITION (`dr(0) = v`) is the key a positional read finds, as recordField reads
  // it — and one past the last column is an error, as it is in VB.
  if (typeof field === 'number') {
    const key = Object.keys(row)[field];
    if (key === undefined) throw new RangeError(`there is no column ${field} to set`);
    Object.defineProperty(row, key, { value, writable: true, enumerable: true, configurable: true });
    return;
  }
  const name = String(field);
  const derived = typeof Blob !== 'undefined' && row instanceof Blob
    && ['extension', 'namewithoutextension', 'fullname'].includes(name.toLowerCase());
  const key = derived ? name : fieldKey(row, name) ?? name;
  // Defined, not assigned: a File's name and size are getters only (assigning threw), and a
  // key of `__proto__` is then a field like any other rather than the record's prototype.
  Object.defineProperty(row, key, { value, writable: true, enumerable: true, configurable: true });
}

/**
 * Write one ELEMENT of a collection held in a workflow local — `xs(0) = v`, `d("k") = v`.
 *
 * A dictionary is a `Map` when `ToDictionary` built it and a plain object when a
 * `From {…}` initializer did, so both are written the way they are read. A list is an
 * array. A collection that is not set is an error, as it is in VB — the local is declared
 * as possibly Nothing, so a bare `xs[0] = v` did not even compile.
 */
export function setItem(collection: unknown, key: unknown, value: unknown): void {
  if (collection === null || collection === undefined || typeof collection !== 'object') {
    throw new TypeError(`cannot set item ${String(key)}: the collection it belongs to is not set`);
  }
  if (collection instanceof Map) collection.set(key, value);
  else if (Array.isArray(collection)) {
    // A list or array is written in place; past its end is an error in VB, not growth.
    const at = Number(key);
    if (!(Number.isInteger(at) && at >= 0 && at < collection.length)) {
      throw new RangeError(`index ${String(key)} is out of range for a list of ${collection.length}`);
    }
    collection[at] = value;
  }
  // Defined, not assigned, so a key of `__proto__` is an entry rather than the prototype.
  else Object.defineProperty(collection, String(key), { value, writable: true, enumerable: true, configurable: true });
}

// ── files ────────────────────────────────────────────────────────────────────
/** The shape a file travels in. */
export interface AppsFile {
  Name?: string;
  FullName?: string;
  URL?: string;
  Extension?: string;
  NameWithoutExtension?: string;
  FileSize?: number;
  MimeType?: string;
  Metadata?: { __type?: string };
  /*
   * The rest of the platform's own AppsFile surface. Optional like the others: a file
   * that came from Orchestrator carries them, one built from an inline literal does
   * not — which is the same thing .NET sees, where they hold their defaults.
   *
   * Declared so the pair matches the scaffold. A member VB can NAME but the runtime
   * shape has no field for reads undefined with nothing to report it, which is worse
   * than the BC30456 it replaced.
   */
  Id?: string;
  IsFolder?: boolean;
  IconUri?: string;
  CreationDate?: string;
  LastModifiedDate?: string;
  name?: string;
  mimeType?: string;
  /** Present for an inline file literal. */
  dataUrl?: string;
  blob?: Blob;
}

/** Build the file shape the uploader and viewer consume. */
export function appsFile(source: unknown): AppsFile {
  const src = source === undefined || source === null ? '' : String(source);
  const match = /^data:([^;,]+)(;base64)?,/.exec(src);
  if (!match) return { name: src, mimeType: 'application/octet-stream' };
  const mimeType = match[1]!;
  const ext = mimeType.split('/')[1]?.split('+')[0] ?? 'bin';
  return { name: `inline.${ext}`, mimeType, dataUrl: src };
}

/*
 * CHANGE-RULE DISPATCH — where an authored `change` rule fires from.
 *
 * Apps fires it from `afterValueSet()`: whenever a control's value is SET, by any path —
 * the user typing, an expression resolving, another rule's set-value. So it cannot hang
 * off a DOM handler; if B is bound to A and A changes, B's rule must fire and no DOM
 * event on B ever happens.
 *
 * The guards are Apps' own (`default-control-model.ts`): not armed until the page's
 * `load` rules have run, capped at `MaxRecursionLevel`, and deferred so a rule writing
 * back re-enters after the update rather than during it. Firing on a control's INITIAL
 * value is prevented per-control, by seeding the previous value on mount.
 */
/** Apps' `MaxRecursionLevel`, per control — `_isSettingValue` lives on the model. */
const MAX_CHANGE_FIRES = 5;
let changeRulesArmed = false;
const changeFires = new Map<string, number>();

/** Arm the trigger once the current render pass's `load` rules have run. */
export function armChangeRules(): void {
  if (changeRulesArmed) return;
  setTimeout(() => { changeRulesArmed = true; });
}

/**
 * Run an authored `change` rule for one control, under Apps' guards.
 *
 * The budget is per control and RESETS. A depth counter would bound nothing here: each
 * dispatch is deferred and unwinds before the next is scheduled, so a cascade never
 * nests. What needs bounding is a control bound to an app variable that lists it as a
 * dependent, which re-fires the same control with nothing in between. The reset keeps
 * that from becoming a lifetime cap — six keystrokes are six changes, not a cycle.
 */
export function fireChangeRule(key: string, run: () => void): void {
  if (!changeRulesArmed) return;
  const spent = (changeFires.get(key) ?? 0) + 1;
  if (spent > MAX_CHANGE_FIRES) return;
  changeFires.set(key, spent);
  setTimeout(() => {
    // A change rule that failed has already shown its message and recorded its outcome;
    // its rethrow ends the chain and must not surface again as an unhandled rejection.
    Promise.resolve().then(run).catch((err: unknown) => {
      // eslint-disable-next-line no-console
      console.debug('[uiapp-convert] a change rule stopped after reporting its error', err);
    }).finally(() => {
      // Settled if nothing re-fired this control while the rule ran.
      setTimeout(() => {
        if (changeFires.get(key) === spent) changeFires.delete(key);
      });
    });
  });
}


/** Validate one control against its AUTHORED rules and record the answer. */
export interface ValidationRules {
  required?: unknown;
  requiredMessage?: unknown;
  /** Apps' input kind — Text, Number, Email, Date or Boolean — which decides WHICH checks run on a filled value. */
  type?: unknown;
  minLength?: unknown;
  maxLength?: unknown;
  minValue?: unknown;
  maxValue?: unknown;
  minDate?: unknown;
  maxDate?: unknown;
  pattern?: unknown;
  patternMessage?: unknown;
  /**
   * Domains the value may or may not come from. Authored on 195 controls each — the
   * most-used rules in the set — and not only on email inputs.
   */
  allowDomain?: unknown;
  blockDomain?: unknown;
  /** Date pickers: reject a Saturday/Sunday, or reject Monday to Friday. */
  disableWeekends?: unknown;
  disableWeekdays?: unknown;
}

export function validateControl(
  page: string, control: string, value: unknown, rules?: ValidationRules,
): boolean {
  const message = rules ? firstFailure(rules, value) : undefined;
  store.dispatch(setControlPropAction({
    page, control, prop: 'IsValid', value: message === undefined,
  }));
  store.dispatch(setControlPropAction({
    page, control, prop: 'ValidationMessage', value: message ?? '',
  }));
  return message === undefined;
}

/**
 * The first rule the value breaks, worded as Apps words it.
 *
 * A transcription of Apps' `ModelValidationService.checkInputValidation` and the
 * constants in `configs/forms/constants`, measured against the runtime:
 *
 *   - A NON-EMPTY value is checked against its KIND only — Text (pattern, else lengths),
 *     Number (a number, then range), Email (Apps' own address regex, then the allowed and
 *     blocked domains), Date (range at day precision). A kind with no checks, or no kind
 *     at all (a dropdown, a file, a radio group), is valid whenever it is filled.
 *   - An EMPTY value is checked for `required` only. A Boolean is "empty" when false.
 *   - The message shown is the control's `requiredErrorMessage`: an authored one that
 *     is not one of the runtime's own wordings stays for EVERY failure; otherwise the
 *     runtime writes the failure's wording into it.
 *
 * Earlier wordings here were inferred ("Must be at least 3 characters",
 * "example.com is not an allowed domain"); a designer comparing the two apps saw
 * "Allowed email domains - uipath.com" on one and something else on the other.
 * Domain rules applied to plain text fields and weekend rules on dates were checks Apps
 * does not make at all.
 */
const APPS_REQUIRED = 'Required field';
const APPS_NUMBER_INVALID = 'Invalid input. Number expected.';
const APPS_NUMBER_BETWEEN = 'Value should be between';
const APPS_NUMBER_GREATER = 'Value should be greater than or equal to';
const APPS_NUMBER_LESS = 'Value should be less than or equal to';
const APPS_EMAIL_INVALID = 'Invalid email';
const APPS_EMAIL_ALLOWED = 'Allowed email domains -';
const APPS_EMAIL_BLOCKED = 'domains are not allowed';
const APPS_TEXT_REGEX = "Invalid input. Entered value doesn't conform the pattern";
const APPS_TEXT_BETWEEN = 'Field length should be between';
const APPS_TEXT_GREATER = 'Minimum length is';
const APPS_TEXT_LESS = 'Maximum length is';
const APPS_DATE_BETWEEN = 'Date should be between';
const APPS_DATE_GREATER = 'Date should be equal to or after';
const APPS_DATE_LESS = 'Date should be equal to or before';

/** Apps' `isValidEmail`, verbatim. */
const APPS_EMAIL = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?=\.?[a-zA-Z]{1,}$)/;

/** Apps' `shouldCustomErrorMessageBeSet`: the authored message is blank or one of the runtime's own. */
function isRuntimeWording(m: string): boolean {
  return m === '' || m === APPS_REQUIRED || m === APPS_NUMBER_INVALID || m === APPS_EMAIL_INVALID || m === APPS_TEXT_REGEX
    || [APPS_NUMBER_GREATER, APPS_NUMBER_LESS, APPS_NUMBER_BETWEEN, APPS_EMAIL_ALLOWED, APPS_TEXT_BETWEEN, APPS_TEXT_GREATER,
      APPS_TEXT_LESS, APPS_DATE_BETWEEN, APPS_DATE_GREATER, APPS_DATE_LESS].some((w) => m.startsWith(w))
    || m.endsWith(APPS_EMAIL_BLOCKED);
}

/** Apps' `stringToRegex`: a rule written `/body/flags`; anything else is an empty pattern, which matches everything. */
function appsRegex(rule: string): RegExp {
  try {
    const body = /[/](.+)[/].*/.exec(rule), flags = /[/].+[/](.*)/.exec(rule);
    return new RegExp(body![1]!, flags![1]!);
  } catch {
    return new RegExp('', '');
  }
}

/** Apps' `isNullOrEmpty`: null, undefined, or a value whose text is empty (so an empty list counts). */
const appsEmpty = (v: unknown): boolean => v === null || v === undefined || String(v) === '';
/** A day's midnight, the precision Apps compares dates at (`getNumberOfMSFromEpoch`). */
const appsDay = (v: unknown): number => new Date(new Date(Date.parse(String(v))).toDateString()).getTime();
/** Apps' `_formatToLocal`: the authored bound, as a local calendar date in the viewer's locale. */
function appsLocalDate(s: string): string {
  const dayOnly = /^(\d{4}-\d{2}-\d{2})T\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.exec(s);
  const iso = new Date(dayOnly ? dayOnly[1]! : s);
  const local = new Date(iso.getTime() + iso.getTimezoneOffset() * 60000);
  return new Date(new Date(Date.parse(String(local))).toDateString())
    .toLocaleDateString(typeof navigator === 'undefined' ? undefined : navigator.language);
}

function firstFailure(rules: ValidationRules, value: unknown): string | undefined {
  const text0 = (v: unknown): string | undefined =>
    (v === null || v === undefined || v === '' ? undefined : String(v));
  const kind = text0(rules.type);
  const failure = ((): string | undefined => {
    if (!appsEmpty(value) && kind !== 'Boolean') {
      const text = String(value);
      switch (kind) {
        case 'Number': {
          if (Number.isNaN(Number(value))) return APPS_NUMBER_INVALID;
          const n = Number(value);
          const min = parseFloat(String(rules.minValue ?? '')), max = parseFloat(String(rules.maxValue ?? ''));
          const hasMin = !Number.isNaN(min), hasMax = !Number.isNaN(max);
          if (hasMin && hasMax) return n >= min && n <= max ? undefined : `${APPS_NUMBER_BETWEEN} ${min} and ${max}`;
          if (hasMin) return n < min ? `${APPS_NUMBER_GREATER} ${String(rules.minValue)}` : undefined;
          if (hasMax) return n > max ? `${APPS_NUMBER_LESS} ${max}` : undefined;
          return undefined;
        }
        case 'Email': {
          if (!APPS_EMAIL.test(text)) return APPS_EMAIL_INVALID;
          const list = (v: unknown): string[] => (Array.isArray(v) ? v : [v]).filter((d) => d !== null && d !== undefined && d !== '').map(String);
          const allowed = list(rules.allowDomain), blocked = list(rules.blockDomain);
          // Apps' own comparison: the whole domain, so a subdomain is NOT its parent.
          const domain = '@@' + text.split('@')[1]!.toLowerCase();
          if (allowed.length && !allowed.some((d) => domain.endsWith('@' + d.toLowerCase()))) {
            return `${APPS_EMAIL_ALLOWED} ${String(rules.allowDomain)}`;
          }
          if (blocked.some((d) => domain.endsWith('@' + d.toLowerCase()))) {
            return `Emails from ${String(rules.blockDomain)} ${APPS_EMAIL_BLOCKED}`;
          }
          return undefined;
        }
        case 'Text': {
          const pattern = text0(rules.pattern), min = text0(rules.minLength), max = text0(rules.maxLength);
          if (pattern !== undefined) {
            // The designer's "pattern error message" property is not read by Apps' runtime; the wording is fixed.
            return text.match(appsRegex(pattern)) === null ? APPS_TEXT_REGEX : undefined;
          }
          if (min !== undefined && max !== undefined) {
            return text.length >= Number(min) && text.length <= Number(max) ? undefined : `${APPS_TEXT_BETWEEN} ${min} and ${max} characters`;
          }
          if (min !== undefined) return text.length < Number(min) ? `${APPS_TEXT_GREATER} ${min} characters` : undefined;
          if (max !== undefined) return text.length > Number(max) ? `${APPS_TEXT_LESS} ${max} characters` : undefined;
          return undefined;
        }
        case 'Date': {
          const min = text0(rules.minDate), max = text0(rules.maxDate);
          const day = appsDay(value instanceof Date ? value.toISOString() : value);
          if (min !== undefined && max !== undefined) {
            return day >= appsDay(min) && day <= appsDay(max) ? undefined : `${APPS_DATE_BETWEEN} ${appsLocalDate(min)} and ${appsLocalDate(max)}`;
          }
          if (min !== undefined) return day < appsDay(min) ? `${APPS_DATE_GREATER} ${appsLocalDate(min)}` : undefined;
          if (max !== undefined) return day > appsDay(max) ? `${APPS_DATE_LESS} ${appsLocalDate(max)}` : undefined;
          return undefined;
        }
        default: return undefined;
      }
    }
    if (rules.required === true && (appsEmpty(value) || (value === false && kind === 'Boolean'))) return APPS_REQUIRED;
    return undefined;
  })();
  if (failure === undefined) return undefined;
  // An authored message that is the designer's own words stands for every failure.
  const authored = text0(rules.requiredMessage);
  return authored !== undefined && !isRuntimeWording(authored) ? authored : failure;
}

/** Validate a control from its AUTHORED rules, which are expressions. */
export function useControlValidation(
  page: string, control: string, value: unknown, rules: ValidationRules,
): void {
  const signature = JSON.stringify(rules);
  // Inside a list row, the validity belongs to that row's instance of the control.
  const name = useRowScopedName(page, control);
  useEffect(() => {
    validateControl(page, name, value, JSON.parse(signature) as ValidationRules);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, name, value, signature]);
}

/**
 * A CONTAINER's `IsValid`: every validated control inside it is valid.
 *
 * In Apps a container's IsValid aggregates its descendants, and apps lean on it —
 * the corpus disables Submit buttons on `Container.IsValid`. Here nothing wrote it:
 * a container is not an input, so it never got a `useControlValidation`, its
 * IsValid stayed undefined, and a button disabled on `Not(Container.IsValid)`
 * was disabled FOREVER with no clue why.
 *
 * `!== false` and not `=== true`, because a control without rules is never
 * validated at all — undefined means "nothing to check", not "broken".
 */
export function useContainerValidity(
  page: string, control: string, children: readonly string[],
): void {
  const valid = useAppSelector((s) =>
    children.every((c) => s.controls[controlKey(page, c)]?.IsValid !== false));
  useEffect(() => {
    store.dispatch(setControlPropAction({ page, control, prop: 'IsValid', value: valid }));
  }, [page, control, valid]);
}


/** One segment of a workflow's field path — `Field("Items").Field("Description", 1)` is two. */
export interface ValidationFieldPath { fieldName: unknown; index: unknown }

/** What a mounted Validation Station can be told to do. */
export interface ValidationStationCommands {
  /** Write one property of a field — Value, Confidence, Confirm, KeepReference, DeleteValue or SetFocus. */
  setField(path: readonly ValidationFieldPath[], property: string, value: unknown): Promise<void>;
  /** Select and focus a top-level field by its taxonomy name. */
  focusField(fieldName: unknown): Promise<void>;
  /** The station's validate-and-save. Rejects when the station reports failure. */
  save(): Promise<void>;
}

const stations = new Map<string, ValidationStationCommands>();

/** Called by a mounted station; the returned function unregisters it on unmount. */
export function registerValidationStation(variable: string, commands: ValidationStationCommands): () => void {
  stations.set(variable, commands);
  return () => { if (stations.get(variable) === commands) stations.delete(variable); };
}

function stationFor(variable: string): ValidationStationCommands {
  const found = stations.get(variable);
  if (!found) {
    throw new Error(`the Validation Station behind "${variable}" is not on the current page, so it cannot be driven`);
  }
  return found;
}

/** `Var.Field("A").Field("C", 1).<Property> = value` — the assignment emitter's write. */
export function setValidationField(
  variable: string, path: readonly ValidationFieldPath[], property: string, value: unknown,
): Promise<void> {
  return stationFor(variable).setField(path, property, value);
}

/** `DuValidationStationSetFieldFocus`. */
export function validationFocusField(variable: string, fieldName: unknown): Promise<void> {
  return stationFor(variable).focusField(fieldName);
}

/** `SaveDuValidationStation`. */
export function validationSave(variable: string): Promise<void> {
  return stationFor(variable).save();
}
