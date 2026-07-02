/**
 * POC: Runtime resource override resolution.
 *
 * Reads the override dict from <script type="application/json" id="uipath-overrides">
 * injected into index.html at deploy time (by syncResourceOverwritesToCdn).
 *
 * The override dict maps binding keys to new resource names/folders:
 *   { "asset.CustomerConfig.Shared/PublicApps": { "name": "ProdConfig", "folderPath": "Production/Live" } }
 *
 * The DEFAULT name from bindings.gen.ts (compiled into the bundle) acts as
 * a LOOKUP KEY. This function resolves it to the overridden value at runtime.
 */

export interface ResourceOverride {
  name: string;
  folderPath: string;
}

type OverrideDict = Record<string, ResourceOverride>;

let cachedOverrides: OverrideDict | null = null;
let loaded = false;

function loadOverrides(): OverrideDict {
  if (loaded) return cachedOverrides ?? {};

  loaded = true;

  if (typeof document === 'undefined') return {};

  const el = document.getElementById('uipath-overrides');
  if (!el) return {};

  try {
    cachedOverrides = JSON.parse(el.textContent ?? '{}');
    console.log('[UiPath SDK] Loaded overrides:', cachedOverrides);
    return cachedOverrides ?? {};
  } catch {
    console.warn('[UiPath SDK] Failed to parse uipath-overrides script tag');
    return {};
  }
}

/**
 * Resolves a resource override at runtime.
 *
 * @param resourceType - e.g. "asset", "entity", "bucket"
 * @param name - the DEFAULT resource name from compiled bindings (e.g. "CustomerConfig")
 * @param folderPath - the DEFAULT folder path (e.g. "Shared/PublicApps")
 * @returns the override if found, or null if no override exists
 */
export function resolveOverride(
  resourceType: string,
  name: string,
  folderPath: string,
): ResourceOverride | null {
  const overrides = loadOverrides();
  const key = `${resourceType}.${name}.${folderPath}`;
  const override = overrides[key] ?? null;

  if (override) {
    console.log(`[UiPath SDK] Override resolved: "${name}" → "${override.name}" (folder: "${override.folderPath}")`);
  }

  return override;
}
