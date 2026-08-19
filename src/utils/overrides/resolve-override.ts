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

  // Scoped key (`type.name.folderPath`) first, unscoped (`type.name`) as fallback. The caller may
  // name a design-time folder, but the admin's override is stored under the design-time key
  // exactly as the publisher wrote it — sometimes 3-segment (coded apps emit the folder), sometimes
  // 2-segment (solution-inline bindings the admin scoped without a folder). The fallback lets a
  // caller who names a folder still hit an override that was published without one.
  const scopedKey = folderPath ? `${bindingType}.${name}.${folderPath}` : undefined;
  const unscopedKey = `${bindingType}.${name}`;
  const entry = (scopedKey && table[scopedKey]) ?? table[unscopedKey];
  if (!entry) return undefined;

  return {
    name: entry.name,
    folderPath: entry.folderPath,
  };
}
