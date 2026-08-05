// Builds a display schema for an Action Center task from its SDK properties.
//
// A task's `formLayout` (the form schema) is typed as an opaque
// Record<string,unknown> by the SDK and its exact shape varies by task kind
// (Quick Form vs low-code App). We extract field descriptors tolerantly and
// pull values from `data`. Coded action apps expose no declarative schema, so
// they fall back to the iframe (handled in the component).
import type { ActionTask } from '@/lib/types';
import { humanize } from '@/lib/format';

export interface TaskField {
  key: string;
  label: string;
  value: unknown;
  /** Widget/field type hint from the layout, if any (e.g. "textfield", "select"). */
  type?: string;
}

/** Friendly label for a TaskType enum value. */
export function taskTypeLabel(type: string | undefined): string {
  switch (type) {
    case 'FormTask':
      return 'Quick Form';
    case 'AppTask':
      return 'Action App';
    case 'ExternalTask':
      return 'External';
    case 'DocumentValidationTask':
      return 'Document validation';
    case 'DocumentClassificationTask':
      return 'Document classification';
    case 'DataLabelingTask':
      return 'Data labeling';
    default:
      return type ? humanize(type) : 'Task';
  }
}

const KEY_PROPS = ['key', 'name', 'id', 'field', 'dataPath'];
const LABEL_PROPS = ['label', 'title', 'text', 'displayName', 'header'];
const TYPE_PROPS = ['type', 'widget', 'component', 'controlType', 'fieldType'];

function firstString(o: Record<string, unknown>, props: string[]): string | undefined {
  for (const p of props) {
    const v = o[p];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return undefined;
}

/**
 * Walk a form-layout object collecting field descriptors keyed by their data key.
 * Tolerant of unknown shapes: any object exposing a key-like prop plus a
 * label/type is treated as a field; recurses into nested containers/arrays.
 */
function collectLayoutFields(node: unknown, out: Map<string, { label?: string; type?: string }>, depth = 0): void {
  if (!node || typeof node !== 'object' || depth > 8) return;
  if (Array.isArray(node)) {
    for (const n of node) collectLayoutFields(n, out, depth + 1);
    return;
  }
  const o = node as Record<string, unknown>;
  const key = firstString(o, KEY_PROPS);
  const label = firstString(o, LABEL_PROPS);
  const type = firstString(o, TYPE_PROPS);
  // Treat as a field only when it carries a key AND some field-ish metadata.
  if (key && (label || type) && !out.has(key)) {
    out.set(key, { label, type });
  }
  for (const v of Object.values(o)) {
    if (v && typeof v === 'object') collectLayoutFields(v, out, depth + 1);
  }
}

/**
 * Derive an ordered field list for a task: prefer the actual `data` values
 * (enriched with labels/types from `formLayout`); if there are no values, fall
 * back to the layout's declared fields so the form structure still shows.
 */
export function buildTaskFields(task: ActionTask): TaskField[] {
  const data = task.data && typeof task.data === 'object' ? (task.data as Record<string, unknown>) : {};
  const meta = new Map<string, { label?: string; type?: string }>();
  if (task.formLayout) collectLayoutFields(task.formLayout, meta);

  const dataKeys = Object.keys(data);
  if (dataKeys.length > 0) {
    return dataKeys.map((key) => ({
      key,
      label: meta.get(key)?.label || humanize(key),
      value: data[key],
      type: meta.get(key)?.type,
    }));
  }

  // No values — surface the declared schema fields (value undefined).
  return [...meta.entries()].map(([key, m]) => ({
    key,
    label: m.label || humanize(key),
    value: undefined,
    type: m.type,
  }));
}
