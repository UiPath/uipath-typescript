import { ValidationError } from '@/core/errors';

const INDEXED_SEGMENT_RE = /^(.*?)\[(\d+)]$/;
const WILDCARD_SUFFIX = '[*]';
const UNSAFE_SEGMENTS = new Set(['__proto__', 'constructor', 'prototype']);

/** True for a plain object, which is the only body shape whose keys can be paths. */
export const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value) &&
  (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);

/**
 * Builds the nested body a connector expects from a body whose top-level keys are paths.
 *
 * `{ 'fields.summary': 'x' }` becomes `{ fields: { summary: 'x' } }`. A segment can address an
 * array item (`items[2].name`) or every item of an array (`items[*].name`). Keys without a path
 * are copied as they are, and nested values are never rewritten. A body with no path key is
 * returned untouched.
 *
 * @param body - Body with path keys
 * @returns The nested body
 * @internal
 */
export function expandBodyPaths(body: Record<string, unknown>): Record<string, unknown> {
  const entries = Object.entries(body);
  if (!entries.some(([key]) => isPathKey(key))) return body;

  const output: Record<string, unknown> = {};
  for (const [key, value] of entries) {
    if (isPathKey(key)) {
      assignPath(output, key, value);
    } else {
      // Defined, not assigned, so a key such as `__proto__` stays an ordinary field
      Object.defineProperty(output, key, { value, enumerable: true, writable: true, configurable: true });
    }
  }
  return output;
}

const isPathKey = (key: string): boolean => key.includes('.') || key.includes('[');

function assignPath(target: Record<string, unknown>, path: string, value: unknown): void {
  const segments = path.split('.');
  let current = target;

  for (let index = 0; index < segments.length; index++) {
    const segment = segments[index];
    const isLast = index === segments.length - 1;

    const indexed = INDEXED_SEGMENT_RE.exec(segment);
    if (indexed) {
      const items = arrayAt(current, safeKey(indexed[1], path));
      const position = Number(indexed[2]);
      while (items.length <= position) items.push({});
      if (isLast) {
        items[position] = value;
        return;
      }
      current = recordAt(items, position);
      continue;
    }

    if (segment.endsWith(WILDCARD_SUFFIX)) {
      const key = safeKey(segment.slice(0, -WILDCARD_SUFFIX.length), path);
      assignToEveryItem(current, key, segments.slice(index + 1).join('.'), value);
      return;
    }

    const key = safeKey(segment, path);
    if (isLast) {
      current[key] = value;
      return;
    }
    current = recordIn(current, key);
  }
}

/** Rejects a segment that would write to an object's prototype. */
function safeKey(key: string, path: string): string {
  if (UNSAFE_SEGMENTS.has(key)) {
    throw new ValidationError({ message: `body key "${path}" contains a reserved name` });
  }
  return key;
}

function arrayAt(parent: Record<string, unknown>, key: string): unknown[] {
  const existing = parent[key];
  if (Array.isArray(existing)) return existing;
  const created: unknown[] = [];
  parent[key] = created;
  return created;
}

function recordIn(parent: Record<string, unknown>, key: string): Record<string, unknown> {
  const existing = parent[key];
  if (isPlainRecord(existing)) return existing;
  const created: Record<string, unknown> = {};
  parent[key] = created;
  return created;
}

function recordAt(items: unknown[], position: number): Record<string, unknown> {
  const existing = items[position];
  if (isPlainRecord(existing)) return existing;
  const created: Record<string, unknown> = {};
  items[position] = created;
  return created;
}

function assignToEveryItem(
  parent: Record<string, unknown>,
  key: string,
  remainingPath: string,
  value: unknown,
): void {
  // An array value replaces the whole list
  if (Array.isArray(value)) {
    parent[key] = value;
    return;
  }

  const items = arrayAt(parent, key);
  if (items.length === 0) items.push({});

  for (let position = 0; position < items.length; position++) {
    const item = recordAt(items, position);
    if (remainingPath) {
      assignPath(item, remainingPath, value);
    } else if (isPlainRecord(value)) {
      mergeInto(item, value);
    }
  }
}

function mergeInto(current: Record<string, unknown>, incoming: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(incoming)) {
    safeKey(key, key);
    if (isPlainRecord(value)) {
      mergeInto(recordIn(current, key), value);
    } else {
      current[key] = value;
    }
  }
}
