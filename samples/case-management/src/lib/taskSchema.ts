// Schema-driven rendering of Action Center tasks.
//
// `Tasks.getSchema` describes a task's form: the fields it holds and the
// outcomes it can be completed with. This module turns that description into
// one `TaskFormModel`, whichever kind of task it came from, so `TaskForm` can
// render inputs read-only, inOuts/outputs editable, and outcomes as buttons.
//
// The SDK returns two shapes, told apart by `type`:
//
//   App tasks (coded and low-code action apps)
//     `schema` has `inputs`, `outputs`, `inOuts` and `outcomes`. Each property
//     carries a .NET type name (`String`, `Int32`, `Decimal`, `DateTime`,
//     `DataTable`, `File`, ...), an `isList` flag, and nested `properties`
//     for objects, which is why the mapping below speaks .NET types.
//
//   Quick Form tasks (Maestro / Flow "Quick Form" HITL nodes)
//     `schema` is the body the form was registered with: `fields[]` (JSON
//     types: string, number, boolean, date, file; a `direction` of input /
//     inOut / output) plus `outcomes[]`. The SDK returns it as registered,
//     so it is read defensively here.
//
// Other task types have no schema (`getSchema` resolves to null). Values come
// from `Tasks.getDataById`.
import type { UiPath } from '@uipath/uipath-typescript/core';
import { TaskType } from '@uipath/uipath-typescript/tasks';
import type {
  TaskAppSchema,
  TaskAppSchemaProperty,
  TaskCompleteOptions,
  TaskGetResponse,
} from '@uipath/uipath-typescript/tasks';
import { getTaskData, getTaskSchema, saveTaskData } from '@/lib/sdk';

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
  | 'json';

export type FieldSection = 'inputs' | 'inOuts' | 'outputs';

export interface TaskFormField {
  /** Key in the task's `data` payload. */
  key: string;
  label: string;
  kind: FieldKind;
  section: FieldSection;
  required: boolean;
  /** The type exactly as the server declared it (".NET" name or JSON type) — shown as a hint. */
  rawType?: string;
  /** Nested fields for `object` kinds. */
  children?: TaskFormField[];
  /** Element kind for `array` kinds. */
  itemKind?: FieldKind;
}

export interface TaskFormOutcome {
  /** The `action` string to complete the task with. */
  key: string;
  label: string;
  primary: boolean;
}

export interface TaskFormModel {
  source: 'app-task' | 'quick-form';
  fields: TaskFormField[];
  outcomes: TaskFormOutcome[];
  /** The schema exactly as the SDK returned it, for the "raw schema" view. */
  raw: unknown;
}

/** Everything `TaskForm` needs for one task, plus why a schema might be missing. */
export interface TaskFormBundle {
  model: TaskFormModel | null;
  data: Record<string, unknown>;
  /** Set when `model` is null. */
  reason?: 'no-schema' | 'empty-schema' | 'unsupported-type' | 'error';
  error?: string;
}

// ---------------------------------------------------------------------------
// App task schema
// ---------------------------------------------------------------------------

/** Map a .NET type name to a form widget kind. `Nullable*` variants collapse onto their base type. */
function dotNetKind(type: string, hasChildren: boolean): FieldKind {
  const base = type.replace(/^Nullable/, '');
  switch (base) {
    case 'String':
    case 'Guid':
      return 'string';
    case 'Boolean':
      return 'boolean';
    case 'Int16':
    case 'Int32':
    case 'Int64':
    case 'UInt16':
    case 'Uint16':
    case 'UInt32':
    case 'Uint32':
    case 'UInt64':
    case 'Uint64':
      return 'integer';
    case 'Double':
    case 'Single':
    case 'Decimal':
      return 'number';
    case 'DateTime':
    case 'DateTimeOffset':
      return 'datetime';
    case 'DateOnly':
      return 'date';
    case 'File':
      return 'file';
    case 'DataTable':
      return 'table';
    default:
      return hasChildren ? 'object' : 'json';
  }
}

function appProperty(p: TaskAppSchemaProperty, section: FieldSection): TaskFormField {
  // `name` is the property name the automation reads and writes: it is the key
  // inside the task's `data`. `key` is a UUID the Apps designer generates per
  // property, so it must never be used to look up a value.
  const children = p.properties.map((c) => appProperty(c, section));
  const isList = p.isList || Boolean(p.collectionDataType);
  const baseKind = dotNetKind(p.type, children.length > 0);
  const field: TaskFormField = {
    key: p.name,
    label: humanizeKey(p.name),
    kind: isList && baseKind !== 'table' ? 'array' : baseKind,
    section,
    required: p.required,
    rawType: `${p.type}${isList ? '[]' : ''}`,
  };
  if (children.length > 0) field.children = children;
  if (field.kind === 'array') field.itemKind = baseKind;
  return field;
}

/**
 * Normalize an App task's schema. Returns null when it declares no fields and
 * no outcomes, which is what the SDK returns when the signed-in user cannot
 * read the action app (see the `Apps.Read` note in the README).
 */
export function normalizeAppTaskSchema(schema: TaskAppSchema): TaskFormModel | null {
  const section = (name: FieldSection) => schema[name].map((p) => appProperty(p, name));
  const fields = [...section('inputs'), ...section('inOuts'), ...section('outputs')];
  // Completion takes the outcome's `name` (e.g. "Approve") as the action string,
  // the same value a coded action app passes to `completeTask()`. `key` is a UUID.
  const outcomes = schema.outcomes.map<TaskFormOutcome>((o, index) => ({
    key: o.name,
    label: o.name,
    primary: index === 0,
  }));
  if (fields.length === 0 && outcomes.length === 0) return null;
  return { source: 'app-task', fields, outcomes, raw: schema };
}

// ---------------------------------------------------------------------------
// Quick Form schema
// ---------------------------------------------------------------------------

interface QuickFormFieldDef {
  id?: string;
  label?: string;
  type?: string;
  direction?: string;
  required?: boolean;
}

interface QuickFormOutcomeDef {
  id?: string;
  name?: string;
  isPrimary?: boolean;
}

function quickFormKind(type: string | undefined): FieldKind {
  switch ((type ?? '').toLowerCase()) {
    case 'number':
    case 'integer':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'date':
      return 'date';
    case 'file':
      return 'file';
    case 'object':
      return 'json';
    case 'array':
      return 'array';
    default:
      return 'string';
  }
}

function quickFormSection(direction: string | undefined): FieldSection {
  switch ((direction ?? '').toLowerCase()) {
    case 'output':
      return 'outputs';
    case 'inout':
      return 'inOuts';
    default:
      return 'inputs';
  }
}

/** The entries of a list in an untyped schema body that are objects. */
function listOf<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value.filter((v) => v && typeof v === 'object') as T[]) : [];
}

/** Normalize a Quick Form schema body (`{ fields[], outcomes[] }`). Returns null when it has neither. */
export function normalizeQuickFormSchema(schema: Record<string, unknown>): TaskFormModel | null {
  const fields = listOf<QuickFormFieldDef>(schema.fields)
    .filter((f) => f.id || f.label)
    .map<TaskFormField>((f) => {
      const key = f.id ?? f.label ?? '';
      const kind = quickFormKind(f.type);
      return {
        key,
        label: f.label || humanizeKey(key),
        kind,
        section: quickFormSection(f.direction),
        required: Boolean(f.required),
        rawType: f.type,
        ...(kind === 'array' ? { itemKind: 'json' as FieldKind } : {}),
      };
    });
  // The outcome's `name` is the action string Action Center expects. A Quick Form
  // outcome may also carry `action: 'Continue' | 'End'`, but that is the Flow's
  // branching instruction, not the task action.
  const outcomes = listOf<QuickFormOutcomeDef>(schema.outcomes)
    .filter((o) => o.name || o.id)
    .map<TaskFormOutcome>((o, i) => ({
      key: o.name ?? o.id ?? '',
      label: o.name ?? o.id ?? '',
      primary: o.isPrimary ?? i === 0,
    }));
  if (fields.length === 0 && outcomes.length === 0) return null;
  return { source: 'quick-form', fields, outcomes, raw: schema };
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
  const fallbackData = (task.data && typeof task.data === 'object' ? task.data : {}) as Record<string, unknown>;
  try {
    // The case's task list returns summaries, so the values are read alongside the schema.
    const [result, dataRes] = await Promise.all([
      getTaskSchema(sdk, task.id, task.folderId),
      getTaskData(sdk, task.id, task.folderId),
    ]);
    const data = dataRes.data ?? fallbackData;
    if (!result) {
      const hasSchemas = task.type === TaskType.App || task.type === TaskType.QuickForm;
      return { model: null, data, reason: hasSchemas ? 'no-schema' : 'unsupported-type' };
    }
    if (result.type === TaskType.App) {
      const model = normalizeAppTaskSchema(result.schema);
      return { model, data, ...(model ? {} : { reason: 'empty-schema' as const }) };
    }
    const model = normalizeQuickFormSchema(result.schema);
    return { model, data, ...(model ? {} : { reason: 'no-schema' as const }) };
  } catch (err) {
    return {
      model: null,
      data: fallbackData,
      reason: 'error',
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ---------------------------------------------------------------------------
// Completing / saving
// ---------------------------------------------------------------------------

/**
 * Build `complete()` options for a schema-driven submission. `TaskCompleteOptions`
 * is a discriminated union on `type`, so each branch spells its type literally.
 */
export function buildCompletion(task: Pick<TaskGetResponse, 'type'>, action: string, data: Record<string, unknown>): TaskCompleteOptions {
  switch (task.type) {
    case TaskType.App:
      return { type: TaskType.App, action, data };
    case TaskType.QuickForm:
      return { type: TaskType.QuickForm, action, data };
    case TaskType.Form:
      return { type: TaskType.Form, action, data };
    case TaskType.DocumentValidation:
      return { type: TaskType.DocumentValidation, action, data };
    case TaskType.DocumentClassification:
      return { type: TaskType.DocumentClassification, action, data };
    case TaskType.DataLabeling:
      return { type: TaskType.DataLabeling, action, data };
    case TaskType.External:
    default:
      return { type: TaskType.External, action, data };
  }
}

/** Persist a draft without completing the task (`Tasks.saveData`, routed by task type). */
export async function saveTaskDraft(sdk: UiPath, task: Pick<TaskGetResponse, 'id' | 'type' | 'folderId'>, data: Record<string, unknown>): Promise<void> {
  await saveTaskData(sdk, task, data);
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
    .replace(/^\w/, (c) => c.toUpperCase());
}

/** Human label for a task type. */
export function describeTaskType(type: string | undefined): string {
  switch (type) {
    case TaskType.Form:
      return 'Form';
    case TaskType.QuickForm:
      return 'Quick Form';
    case TaskType.App:
      return 'Action App';
    case TaskType.External:
      return 'External';
    case TaskType.DocumentValidation:
      return 'Document validation';
    case TaskType.DocumentClassification:
      return 'Document classification';
    case TaskType.DataLabeling:
      return 'Data labeling';
    default:
      return type ? humanizeKey(type) : 'Task';
  }
}
