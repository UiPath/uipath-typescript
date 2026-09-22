/**
 * Pure helpers for reading connector metadata.
 *
 * The Elements API returns deeply nested, connector-dependent shapes — the SDK
 * types the well-known fields and leaves the extension points open
 * (`ElementField` is `Record<string, unknown>`) so a connector shipping a new
 * metadata field can't break typing. Everything below therefore narrows
 * `unknown` explicitly rather than casting, which is also why this module is
 * React-free: it's the part of the app worth reasoning about on its own.
 */
import {
  ConnectionState,
  type ElementActivity,
  type ElementMethodDefinition,
  type ElementObjectMetadataResponse,
  type ExecuteMethod,
} from '@uipath/uipath-typescript/connections'

export const HTTP_METHODS: ExecuteMethod[] = [
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
]

/** Verbs that carry a request body. */
export function hasRequestBody(verb: ExecuteMethod): boolean {
  return verb === 'POST' || verb === 'PUT' || verb === 'PATCH'
}

// --- narrowing helpers for the open-ended metadata records ----------------

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

// -------------------------------------------------------------------------

/**
 * Resolve the HTTP verb and parameter schema backing a curated activity.
 *
 * An activity points at an object plus (usually) a method name. Connectors are
 * inconsistent about which of those they populate, so we try the explicit
 * `methodName`, then match on `operation`, then fall back to the object's first
 * declared method — and finally to GET, so the UI always has something to show.
 */
export function resolveMethod(
  meta: ElementObjectMetadataResponse | null,
  activity: ElementActivity | null,
): { verb: ExecuteMethod; def?: ElementMethodDefinition } {
  const methods = meta?.metadata?.method ?? {}
  let def: ElementMethodDefinition | undefined

  if (activity?.methodName && methods[activity.methodName]) {
    def = methods[activity.methodName]
  } else if (activity?.operation) {
    def = Object.values(methods).find(
      (m) => m.operation?.toLowerCase() === activity.operation?.toLowerCase(),
    )
  }
  if (!def) {
    def = Object.values(methods)[0]
  }

  const raw = (def?.method || activity?.methodName || 'GET').toUpperCase()
  const verb = (
    HTTP_METHODS.includes(raw as ExecuteMethod) ? raw : 'GET'
  ) as ExecuteMethod
  return { verb, def }
}

/** Coerce a string form value to the parameter's declared primitive type. */
export function coerce(value: string, dataType?: string): unknown {
  const dt = (dataType ?? 'string').toLowerCase()
  if (dt === 'integer' || dt === 'number' || dt === 'long' || dt === 'double') {
    const n = Number(value)
    return Number.isNaN(n) ? value : n
  }
  if (dt === 'boolean') return value === 'true'
  return value
}

/** A single writable body field derived from object metadata `fields`. */
export interface BodyField {
  name: string
  displayName: string
  dataType?: string
  description?: string
  required: boolean
}

/**
 * Build the request-body form from an object's field schema.
 *
 * For a write verb (POST/PATCH/PUT) we keep a field when its per-verb method
 * block opts it into the request and it is not hidden from the UX:
 *   fields[].method[VERB].request === true && fields[].design.isHidden !== true
 * A field is required when fields[].method[VERB].required === true.
 */
export function bodyFieldsFor(
  meta: ElementObjectMetadataResponse | null,
  verb: ExecuteMethod,
): BodyField[] {
  if (!meta?.fields) return []
  // `fields` is keyed by field name: fields[fieldName].method[VERB] / .design.
  return Object.entries(meta.fields)
    .map(([key, value]) => {
      const field = asRecord(value)
      const methods = asRecord(field?.method)
      // The verb may not have its own block (e.g. PUT often reuses POST).
      const block = asRecord(
        methods?.[verb] ?? (verb === 'PUT' ? methods?.POST : undefined),
      )
      return { key, field, block }
    })
    .filter(
      ({ field, block }) =>
        block?.request === true && asRecord(field?.design)?.isHidden !== true,
    )
    .map(({ key, field, block }) => {
      const name = asString(field?.name) ?? key
      return {
        name,
        displayName: asString(field?.displayName) ?? name,
        dataType: asString(field?.dataType) ?? asString(field?.type),
        description: asString(field?.description),
        required: block?.required === true,
      }
    })
}

/** Map a connection lifecycle state to a status dot color. */
export function stateColor(state?: ConnectionState): string {
  switch (state) {
    case ConnectionState.Enabled:
      return 'var(--teal-600)'
    case ConnectionState.Expired:
      return 'var(--pumpkin-600)'
    case ConnectionState.Disabled:
    case ConnectionState.Failed:
      return '#c62828'
    default:
      return 'var(--text-secondary)'
  }
}
