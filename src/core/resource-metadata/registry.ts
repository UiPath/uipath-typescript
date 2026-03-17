import type { ResourceMetadataEntry } from './types';

const REGISTRY_KEY = Symbol.for('@uipath/resource-metadata-registry');

function getGlobalRegistry(): Map<string, ResourceMetadataEntry> {
  const g = globalThis as Record<string | symbol, unknown>;
  if (!g[REGISTRY_KEY]) {
    g[REGISTRY_KEY] = new Map<string, ResourceMetadataEntry>();
  }
  return g[REGISTRY_KEY] as Map<string, ResourceMetadataEntry>;
}

/**
 * Global registry of resource metadata from @ResourceReference decorators.
 * Exported so tooling (e.g. CLI scanner) can read which SDK methods reference which resources.
 */
export const ResourceMetadataRegistry: Map<string, ResourceMetadataEntry> = getGlobalRegistry();
