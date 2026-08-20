import { pageOverrides } from './page-overrides';
import type { ResourceOverride, ResourceOverrides } from './overrides.types';

const RESOURCE_OVERWRITES_KEY = Symbol.for('uipath.resourceOverwrites.v1');

/**
 * Reads the override table from the ambient channel — a host-installed accessor on
 * `globalThis[RESOURCE_OVERWRITES_KEY]` when one is present, otherwise the page's
 * `<script id="uipath-overrides">`. Asked per lookup, so a host that answers each caller from its
 * own state (per-request table, per-tenant table) shows through. Errors degrade to no overrides.
 */
function readOverrides(): ResourceOverrides | undefined {
  const slot = (globalThis as Record<symbol, unknown>)[RESOURCE_OVERWRITES_KEY];
  const source =
    typeof slot === 'function' ? (slot as () => ResourceOverrides | undefined) : pageOverrides;
  try {
    return source();
  } catch {
    return undefined;
  }
}

export function resolveOverride(
  resourceType: string,
  name: string,
  folderPath?: string,
): ResourceOverride | undefined {
  const table = readOverrides();
  if (!table) return undefined;

  // Publisher writes lowercase prefixes (Orchestrator's `ResourceTypeRaw`); SDK labels are
  // PascalCase — normalize once here so callers pass the SDK's label verbatim.
  const bindingType = resourceType.toLowerCase();

  // Scoped `type.name.folderPath` first, unscoped `type.name` as fallback — solution-inline
  // bindings the admin scoped without a folder still match when the caller names one.
  const scopedKey = folderPath ? `${bindingType}.${name}.${folderPath}` : undefined;
  const unscopedKey = `${bindingType}.${name}`;
  const entry = (scopedKey && table[scopedKey]) ?? table[unscopedKey];
  if (!entry) return undefined;

  return {
    name: entry.name,
    folderPath: entry.folderPath,
  };
}
