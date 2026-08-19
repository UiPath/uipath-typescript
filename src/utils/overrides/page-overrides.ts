import { isBrowser } from '../platform';
import { UiPathElementIds } from '../runtime/constants';
import type { ChannelSource } from '../ambient/channel';
import type { ResourceOverrides } from './overrides.types';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Narrows a parsed value to the table shape, dropping what it cannot use. Keys are the page's
 *  data and are kept verbatim — lookups match the spelling the page published. */
export function asResourceOverrides(value: unknown): ResourceOverrides | undefined {
  if (!isPlainObject(value)) return undefined;

  const table: ResourceOverrides = {};
  for (const [key, properties] of Object.entries(value)) {
    if (!isPlainObject(properties)) continue;
    const bag: Record<string, string> = {};
    for (const [property, propertyValue] of Object.entries(properties)) {
      if (typeof propertyValue === 'string') bag[property] = propertyValue;
    }
    table[key] = bag;
  }
  return Object.keys(table).length > 0 ? table : undefined;
}

/** Reads the deploy-time table out of the page, or undefined off-browser, absent, or unparseable. */
function readFromDocument(): ResourceOverrides | undefined {
  if (!isBrowser) return undefined;

  const text = document.getElementById(UiPathElementIds.RESOURCE_OVERRIDES)?.textContent;
  if (!text) return undefined;

  try {
    return asResourceOverrides(JSON.parse(text));
  } catch {
    return undefined;
  }
}

let table: ResourceOverrides | undefined;
let loaded = false;

/** The page as a channel source: read from the DOM on first use, then held. */
export const pageOverrides: ChannelSource<ResourceOverrides> = () => {
  if (!loaded) {
    loaded = true;
    table = readFromDocument();
  }
  return table;
};
