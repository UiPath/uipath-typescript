import { probeChannel } from '../ambient/channel';
import { pageOverrides } from './page-overrides';
import type { ResourceOverride, ResourceOverrides } from './overrides.types';

const RESOURCE_OVERWRITES_KEY = Symbol.for('uipath.resourceOverwrites.v1');

/**
 * The SDK's resource label → the type prefix the publisher spells in its keys (Orchestrator's
 * `ResourceTypeRaw`, taken from the package's bindings file).
 *
 * Matching is case-sensitive, so the publisher's exact literal is written here rather than derived
 * from the label at runtime. A label absent from this map is a resource the publisher does not
 * describe, and is never redirected.
 */
const BINDING_TYPES: Record<string, string> = {
  Asset: 'asset',
  Bucket: 'bucket',
  Process: 'process',
};

/** This SDK's end of the resource-overrides channel: a host's table when one is installed,
 *  otherwise the page's, asked per lookup rather than held. */
const channel = probeChannel<ResourceOverrides>(RESOURCE_OVERWRITES_KEY, pageOverrides);

export function resolveOverride(
  resourceType: string,
  name: string,
  folderPath?: string,
): ResourceOverride | undefined {
  const bindingType = BINDING_TYPES[resourceType];
  if (!bindingType) return undefined;

  const table = channel();
  if (!table) return undefined;

  // The lookup is literal — the key is built from exactly what the call addressed, and a miss is
  // a miss. Naming a folder matches only an entry published for that folder
  // (`asset.CustomerConfig.Shared/PublicApps`, the form coded apps emit); naming none matches only
  // the unscoped entry (`asset.CustomerConfig`, the form Orchestrator emits with the folder in the
  // value). Deliberately no widening from one to the other: an override applies to the identity
  // the caller actually asked for, or not at all.
  const entry = table[[bindingType, name, folderPath].filter(Boolean).join('.')];
  if (!entry) return undefined;

  return {
    name: entry.name,
    folderPath: entry.folderPath,
  };
}
