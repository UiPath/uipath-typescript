// Schema-driven rendering of Action Center tasks.
//
// Action Center can describe a task's form declaratively. This module fetches
// that description, normalizes it into one `TaskFormModel` regardless of where
// it came from, and pairs it with the task's current data so `TaskForm` can
// render inputs read-only, inOuts/outputs editable, and outcomes as buttons.
//
// Two sources exist today:
//
//   App tasks (coded and low-code action apps)
//     GET orchestrator_/tasks/AppTasks/GetAppTaskByKey  ->  `taskSchema`
//     The schema is the app's `action-schema.json` after Action Center has
//     parsed it into typed properties: each field carries a .NET type name
//     (`String`, `Int32`, `Decimal`, `DateTime`, `DataTable`, `File`, ...),
//     an `isList` flag, and nested `properties` for objects. Low-code apps use
//     the same shape, which is why the mapping below speaks .NET types.
//
//   Quick Form tasks (Maestro / Flow "Quick Form" HITL nodes, type `QuickFormTask`)
//     GET orchestrator_/tasks/TaskSchemas/GetByKey?key=<task.taskSchemaKey>
//     The schema is the node's `fields[]` (JSON types: string, number,
//     boolean, date, file; a `direction` of input / inOut / output) plus
//     `outcomes[]`. Values come from `Tasks.getDataById`.
//
// Neither endpoint is wrapped by @uipath/uipath-typescript yet, so this file
// calls them with the SDK's own access token (the same pattern the SDK team
// recommends until the methods land). Everything else goes through the SDK.
import type { UiPath } from '@uipath/uipath-typescript/core'
import { Tasks, TaskType } from '@uipath/uipath-typescript/tasks'
import type { TaskCompleteOptions, TaskGetResponse } from '@uipath/uipath-typescript/tasks'

/** Task type Action Center uses for Quick Forms. Not in the SDK's `TaskType` enum yet. */
export const QUICK_FORM_TASK_TYPE = 'QuickFormTask'

export function isQuickFormTask(task: Pick<TaskGetResponse, 'type'>): boolean {
  return String(task.type) === QUICK_FORM_TASK_TYPE
}

/** `taskSchemaKey` is returned by the API for Quick Form tasks but not yet typed by the SDK. */
export type TaskWithSchemaKey = TaskGetResponse & { taskSchemaKey?: string | null }

// ---------------------------------------------------------------------------
// Normalized model
// ---------------------------------------------------------------------------

export type FieldKind =
  | 'string'
  | 'integer'
  | 'number'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'file'
  | 'object'
  | 'array'
  | 'table'
  | 'json'

export type FieldSection = 'inputs' | 'inOuts' | 'outputs'

export interface TaskFormField {
  /** Key in the task's `data` payload. */
  key: string
  label: string
  kind: FieldKind
  section: FieldSection
  required: boolean
  /** The type exactly as the server declared it (".NET" name or JSON type) — shown as a hint. */
  rawType?: string
  /** Nested fields for `object` kinds. */
  children?: TaskFormField[]
  /** Element kind for `array` kinds. */
  itemKind?: FieldKind
}

export interface TaskFormOutcome {
  /** The `action` string to complete the task with. */
  key: string
  label: string
  primary: boolean
}

export interface TaskFormModel {
  source: 'app-task' | 'quick-form'
  /** App tasks only: `Coded` or `Custom` (low-code), as reported by Action Center. */
  appType?: string
  fields: TaskFormField[]
  outcomes: TaskFormOutcome[]
  /** The schema exactly as the server returned it, for the "raw schema" view. */
  raw: unknown
}

/** Everything `TaskForm` needs for one task, plus why a schema might be missing. */
export interface TaskFormBundle {
  model: TaskFormModel | null
  data: Record<string, unknown>
  /** Set when `model` is null. */
  reason?: 'no-schema' | 'empty-schema' | 'unsupported-type' | 'error'
  error?: string
}

// ---------------------------------------------------------------------------
// Raw endpoint calls (SDK gap)
// ---------------------------------------------------------------------------

async function orchestratorGet<T>(
  sdk: UiPath,
  path: string,
  params: Record<string, string>,
  folderId: number,
): Promise<T> {
  const token = sdk.getToken()
  if (!token) throw new Error('Not authenticated')
  const { baseUrl, orgName, tenantName } = sdk.config
  const url = new URL(`${baseUrl}/${orgName}/${tenantName}/orchestrator_/${path}`)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'X-UIPATH-OrganizationUnitId': String(folderId),
    },
  })
  if (!res.ok) {
    let detail = ''
    try {
      const body = (await res.json()) as { message?: string; Message?: string }
      detail = body.message ?? body.Message ?? ''
    } catch {
      // non-JSON error body
    }
    throw new Error(`${path} failed: ${res.status}${detail ? ` — ${detail}` : ''}`)
  }
  return (await res.json()) as T
}

/** Case-insensitive property read: the AppTasks endpoints return PascalCase. */
function prop<T = unknown>(obj: unknown, name: string): T | undefined {
  if (!obj || typeof obj !== 'object') return undefined
  const o = obj as Record<string, unknown>
  if (name in o) return o[name] as T
  const lower = name.toLowerCase()
  const hit = Object.keys(o).find((k) => k.toLowerCase() === lower)
  return hit ? (o[hit] as T) : undefined
}

// ---------------------------------------------------------------------------
// App task schema (ParsedActionSchemaProperties)
// ---------------------------------------------------------------------------

/** One property as Action Center parses it out of `action-schema.json`. */
interface ParsedActionProperty {
  key?: string
  name?: string
  /** .NET type name, e.g. `String`, `Int32`, `NullableDecimal`, `DateTime`, `DataTable`, `File`, `Object`. */
  type?: string
  isList?: boolean
  required?: boolean
  customType?: string
  properties?: ParsedActionProperty[]
  collectionDataType?: string
}

/** Map a .NET type name to a form widget kind. `Nullable*` variants collapse onto their base type. */
function dotNetKind(type: string | undefined, hasChildren: boolean): FieldKind {
  const base = (type ?? '').replace(/^Nullable/, '')
  switch (base) {
    case 'String':
    case 'Guid':
      return 'string'
    case 'Boolean':
      return 'boolean'
    case 'Int16':
    case 'Int32':
    case 'Int64':
    case 'UInt16':
    case 'Uint16':
    case 'UInt32':
    case 'Uint32':
    case 'UInt64':
    case 'Uint64':
      return 'integer'
    case 'Double':
    case 'Single':
    case 'Decimal':
      return 'number'
    case 'DateTime':
    case 'DateTimeOffset':
      return 'datetime'
    case 'DateOnly':
      return 'date'
    case 'File':
      return 'file'
    case 'DataTable':
      return 'table'
    case 'Object':
      return hasChildren ? 'object' : 'json'
    default:
      return hasChildren ? 'object' : 'json'
  }
}

function appProperty(p: unknown, section: FieldSection): TaskFormField | null {
  // `name` is the property name the automation reads and writes — it is the key
  // inside the task's `data`. `key` is a UUID the Apps designer generates per
  // property, so it must never be used to look up a value.
  const key = prop<string>(p, 'name')
  if (!key) return null
  const children = (prop<unknown[]>(p, 'properties') ?? [])
    .map((c) => appProperty(c, section))
    .filter((c): c is TaskFormField => c !== null)
  const rawType = prop<string>(p, 'type')
  const isList = Boolean(prop<boolean>(p, 'isList')) || Boolean(prop<string>(p, 'collectionDataType'))
  const baseKind = dotNetKind(rawType, children.length > 0)
  const field: TaskFormField = {
    key,
    label: humanizeKey(key),
    kind: isList && baseKind !== 'table' ? 'array' : baseKind,
    section,
    required: Boolean(prop<boolean>(p, 'required')),
    rawType: rawType ? `${rawType}${isList ? '[]' : ''}` : undefined,
  }
  if (children.length > 0) field.children = children
  if (field.kind === 'array') field.itemKind = baseKind
  return field
}

function appOutcome(p: unknown, index: number): TaskFormOutcome | null {
  // Completion takes the outcome's `name` (e.g. "Approve") as the action string —
  // the same value a coded action app passes to `completeTask()`. `key` is a UUID.
  const name = prop<string>(p, 'name')
  if (!name) return null
  return { key: name, label: name, primary: index === 0 }
}

/** Normalize a `taskSchema` object from GetAppTaskByKey. Returns null when the server sent none. */
export function normalizeAppTaskSchema(taskSchema: unknown, appType?: string): TaskFormModel | null {
  if (!taskSchema || typeof taskSchema !== 'object') return null
  const section = (name: FieldSection) =>
    (prop<ParsedActionProperty[]>(taskSchema, name) ?? [])
      .map((p) => appProperty(p, name))
      .filter((f): f is TaskFormField => f !== null)
  const fields = [...section('inputs'), ...section('inOuts'), ...section('outputs')]
  const outcomes = (prop<ParsedActionProperty[]>(taskSchema, 'outcomes') ?? [])
    .map(appOutcome)
    .filter((o): o is TaskFormOutcome => o !== null)
  if (fields.length === 0 && outcomes.length === 0) return null
  return { source: 'app-task', appType, fields, outcomes, raw: taskSchema }
}

export interface AppTaskByKey {
  model: TaskFormModel | null
  /** True when the server sent a schema object that declares no fields and no outcomes. */
  emptySchema: boolean
  data: Record<string, unknown> | null
  appType?: string
}

/**
 * GET tasks/AppTasks/GetAppTaskByKey — the only endpoint that includes the
 * parsed action schema today. Action Center fetches the schema from the Apps
 * service with the caller's token, so the token must also carry an Apps scope
 * (`Apps.Read`), otherwise the schema comes back empty or the call fails.
 */
export async function fetchAppTaskByKey(sdk: UiPath, taskKey: string, folderId: number): Promise<AppTaskByKey> {
  const body = await orchestratorGet<unknown>(sdk, 'tasks/AppTasks/GetAppTaskByKey', { taskKey }, folderId)
  const appType = prop<string>(prop(body, 'appTasksMetadata'), 'appType')
  const taskSchema = prop(body, 'taskSchema')
  const model = normalizeAppTaskSchema(taskSchema, appType)
  return {
    model,
    emptySchema: !model && !!taskSchema && typeof taskSchema === 'object',
    data: (prop<Record<string, unknown>>(body, 'data') ?? null) as Record<string, unknown> | null,
    appType,
  }
}

// ---------------------------------------------------------------------------
// Quick Form schema (TaskSchemas/GetByKey)
// ---------------------------------------------------------------------------

interface QuickFormFieldDef {
  id?: string
  label?: string
  type?: string
  direction?: string
  required?: boolean
}

interface QuickFormOutcomeDef {
  id?: string
  name?: string
  isPrimary?: boolean
}

function quickFormKind(type: string | undefined): FieldKind {
  switch ((type ?? '').toLowerCase()) {
    case 'number':
    case 'integer':
      return 'number'
    case 'boolean':
      return 'boolean'
    case 'date':
      return 'date'
    case 'file':
      return 'file'
    case 'object':
      return 'json'
    case 'array':
      return 'array'
    default:
      return 'string'
  }
}

function quickFormSection(direction: string | undefined): FieldSection {
  switch ((direction ?? '').toLowerCase()) {
    case 'output':
      return 'outputs'
    case 'inout':
      return 'inOuts'
    default:
      return 'inputs'
  }
}

/** Normalize a Quick Form schema (`{ fields[], outcomes[] }`). Returns null when it has neither. */
export function normalizeQuickFormSchema(schema: unknown): TaskFormModel | null {
  if (!schema || typeof schema !== 'object') return null
  const fields = (prop<QuickFormFieldDef[]>(schema, 'fields') ?? [])
    .filter((f) => f && (f.id || f.label))
    .map<TaskFormField>((f) => {
      const key = f.id ?? f.label ?? ''
      const kind = quickFormKind(f.type)
      return {
        key,
        label: f.label || humanizeKey(key),
        kind,
        section: quickFormSection(f.direction),
        required: Boolean(f.required),
        rawType: f.type,
        ...(kind === 'array' ? { itemKind: 'json' as FieldKind } : {}),
      }
    })
  // The outcome's `name` is the action string Action Center expects. A Quick Form
  // outcome may also carry `action: 'Continue' | 'End'`, but that is the Flow's
  // branching instruction, not the task action.
  const outcomes = (prop<QuickFormOutcomeDef[]>(schema, 'outcomes') ?? [])
    .filter((o) => o && (o.name || o.id))
    .map<TaskFormOutcome>((o, i) => ({
      key: o.name ?? o.id ?? '',
      label: o.name ?? o.id ?? '',
      primary: o.isPrimary ?? i === 0,
    }))
  if (fields.length === 0 && outcomes.length === 0) return null
  return { source: 'quick-form', fields, outcomes, raw: schema }
}

/** GET tasks/TaskSchemas/GetByKey — the schema a Quick Form task points at via `taskSchemaKey`. */
export async function fetchQuickFormSchema(sdk: UiPath, schemaKey: string, folderId: number): Promise<TaskFormModel | null> {
  const dto = await orchestratorGet<unknown>(sdk, 'tasks/TaskSchemas/GetByKey', { key: schemaKey }, folderId)
  return normalizeQuickFormSchema(prop(dto, 'schema'))
}

// ---------------------------------------------------------------------------
// Orchestration: schema + data for one task
// ---------------------------------------------------------------------------

/**
 * Resolve the form model and current values for a task. Never throws: when a
 * schema cannot be produced the bundle carries the task's `data` and a reason,
 * so the UI can fall back to a plain key/value view.
 */
export async function loadTaskForm(sdk: UiPath, task: TaskGetResponse): Promise<TaskFormBundle> {
  const fallbackData = (task.data && typeof task.data === 'object' ? task.data : {}) as Record<string, unknown>
  try {
    if (task.type === TaskType.App) {
      const res = await fetchAppTaskByKey(sdk, task.key, task.folderId)
      return {
        model: res.model,
        data: res.data ?? fallbackData,
        ...(res.model ? {} : { reason: res.emptySchema ? ('empty-schema' as const) : ('no-schema' as const) }),
      }
    }

    if (isQuickFormTask(task)) {
      const tasks = new Tasks(sdk)
      const dataRes = (await tasks.getDataById(task.id, { folderId: task.folderId })) as TaskWithSchemaKey & {
        data: Record<string, unknown> | null
      }
      const schemaKey = dataRes.taskSchemaKey ?? (task as TaskWithSchemaKey).taskSchemaKey
      const model = schemaKey ? await fetchQuickFormSchema(sdk, schemaKey, task.folderId) : null
      return {
        model,
        data: dataRes.data ?? fallbackData,
        ...(model ? {} : { reason: 'no-schema' as const }),
      }
    }

    return { model: null, data: fallbackData, reason: 'unsupported-type' }
  } catch (err) {
    return {
      model: null,
      data: fallbackData,
      reason: 'error',
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

// ---------------------------------------------------------------------------
// Completing / saving
// ---------------------------------------------------------------------------

/**
 * Build `complete()` options for a schema-driven submission. `TaskCompleteOptions`
 * is a discriminated union on `type`, so each branch spells its type literally.
 * Quick Form tasks complete through the generic task endpoint — the same route
 * the SDK uses for `TaskType.External` — because the enum has no member for them yet.
 */
export function buildCompletion(task: Pick<TaskGetResponse, 'type'>, action: string, data: Record<string, unknown>): TaskCompleteOptions {
  switch (task.type) {
    case TaskType.App:
      return { type: TaskType.App, action, data }
    case TaskType.Form:
      return { type: TaskType.Form, action, data }
    case TaskType.DocumentValidation:
      return { type: TaskType.DocumentValidation, action, data }
    case TaskType.DocumentClassification:
      return { type: TaskType.DocumentClassification, action, data }
    case TaskType.DataLabeling:
      return { type: TaskType.DataLabeling, action, data }
    case TaskType.External:
    default:
      // ExternalTask and QuickFormTask both use tasks/GenericTasks/CompleteTask.
      return { type: TaskType.External, action, data }
  }
}

/** Persist a draft without completing the task (`Tasks.saveData`, routed by task type). */
export async function saveTaskDraft(sdk: UiPath, task: Pick<TaskGetResponse, 'id' | 'type' | 'folderId'>, data: Record<string, unknown>): Promise<void> {
  const tasks = new Tasks(sdk)
  await tasks.saveData(task.id, data, { folderId: task.folderId, type: task.type })
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** `applicantName` / `applicant_name` → `Applicant Name`. */
export function humanizeKey(key: string): string {
  return key
    .replace(/[-_]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase())
}
