/**
 * Default policy settings per UiPath product, sourced from the policy reference schema.
 *
 * Used by GovernanceService.applyPack() to populate the `data` field when creating
 * a new policy shell via POST /Policy — sending defaults instead of `null` prevents
 * the API's 500 error caused by an uninitialised settings object.
 *
 * @internal
 */

import referenceRaw from './packs/policy-reference.json';

function extractDefaults(raw: Record<string, unknown>): Record<string, Record<string, unknown>> {
  const templates: Record<string, Record<string, unknown>> = {};

  for (const [product, productData] of Object.entries(raw)) {
    if (product.startsWith('_')) continue;
    if (!productData || typeof productData !== 'object') continue;

    const defaults: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(productData as Record<string, unknown>)) {
      if (key.startsWith('_')) continue;
      if (val !== null && typeof val === 'object' && !Array.isArray(val) && 'default' in val) {
        defaults[key] = (val as { default: unknown }).default;
      }
    }
    templates[product] = defaults;
  }

  // Product name aliases used in compliance packs
  templates['Development'] = templates['Studio'] ?? {};       // ISO 42001 uses 'Development'
  templates['Orchestrator'] = templates['Robot'] ?? {};       // EU AI Act / NIST use 'Orchestrator'

  return templates;
}

/**
 * Default settings template per product.
 * Keyed by UiPath product identifier (e.g. 'AITrustLayer', 'Robot', 'Studio').
 */
export const POLICY_TEMPLATES: Record<string, Record<string, unknown>> =
  extractDefaults(referenceRaw as Record<string, unknown>);
