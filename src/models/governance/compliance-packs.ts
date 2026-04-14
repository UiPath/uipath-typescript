/**
 * Pre-built compliance packs for UiPath Automation Ops governance.
 *
 * Each pack contains one policy definition per UiPath product, with settings
 * pre-configured to the recommended values for the given regulatory framework.
 *
 * Usage:
 * ```typescript
 * import { HIPAA, Governance } from '@uipath/uipath-typescript/governance';
 *
 * const governance = new Governance(sdk);
 * await governance.applyPack(HIPAA, { deploy: { target: 'tenant' } });
 * ```
 */

import type { CompliancePack, CompliancePolicyDef } from './governance.types';

import hipaaRaw from './packs/hipaa.json';
import iso42001Raw from './packs/iso42001.json';
import euAiActRaw from './packs/eu-ai-act.json';
import nistAiRmfRaw from './packs/nist-ai-rmf.json';
import soc2Raw from './packs/soc2.json';

/**
 * Extracts the policy definitions from a raw compliance pack JSON.
 *
 * Each setting in the source JSON uses a rich-object format:
 *   `{ type, default, description, value, clause_ref, ... }`
 * This function extracts only the `value` field for each setting.
 * Top-level `_` keys (metadata) are skipped entirely.
 */
function parsePack(
  raw: Record<string, unknown>,
  id: string
): CompliancePack {
  const framework = (raw['_framework'] as { name?: string } | undefined)?.name ?? id;
  const version = (raw['_version'] as string | undefined) ?? '1.0';

  const policies: CompliancePolicyDef[] = [];

  for (const [policyName, policyData] of Object.entries(raw)) {
    if (policyName.startsWith('_')) continue;
    if (!policyData || typeof policyData !== 'object') continue;

    const data = policyData as Record<string, unknown>;
    const product = data['_product'] as string | undefined;
    if (!product) continue;

    const settings: Record<string, unknown> = {};
    for (const [settingKey, settingVal] of Object.entries(data)) {
      if (settingKey.startsWith('_')) continue;
      // Rich-object format: { value, type, default, ... } → extract value
      if (
        settingVal !== null &&
        typeof settingVal === 'object' &&
        !Array.isArray(settingVal) &&
        'value' in (settingVal as object)
      ) {
        settings[settingKey] = (settingVal as { value: unknown }).value;
      } else {
        settings[settingKey] = settingVal;
      }
    }

    policies.push({ name: policyName, product, settings });
  }

  return { id, framework, version, policies };
}

/**
 * HIPAA Security Rule compliance pack (45 CFR Part 164).
 * Covers: AITrustLayer, Studio, Robot, Assistant, IntegrationService.
 */
export const HIPAA: CompliancePack = parsePack(hipaaRaw as Record<string, unknown>, 'HIPAA');

/**
 * ISO/IEC 42001:2023 AI Management System compliance pack.
 * Covers: AITrustLayer, Studio (Development), Robot, Assistant, IntegrationService.
 */
export const ISO42001: CompliancePack = parsePack(iso42001Raw as Record<string, unknown>, 'ISO42001');

/**
 * EU Artificial Intelligence Act (Regulation (EU) 2024/1689) compliance pack.
 * Covers: AITrustLayer, Robot (Orchestrator), Studio.
 */
export const EU_AI_ACT: CompliancePack = parsePack(euAiActRaw as Record<string, unknown>, 'EU_AI_ACT');

/**
 * NIST AI Risk Management Framework 1.0 compliance pack.
 * Covers: AITrustLayer, Robot (Orchestrator), Studio.
 */
export const NIST_AI_RMF: CompliancePack = parsePack(nistAiRmfRaw as Record<string, unknown>, 'NIST_AI_RMF');

/**
 * SOC 2 Trust Service Criteria (AICPA, 2017/2022) compliance pack.
 * Covers: AITrustLayer, Robot (Orchestrator), Studio.
 */
export const SOC2: CompliancePack = parsePack(soc2Raw as Record<string, unknown>, 'SOC2');

/**
 * All available compliance packs, keyed by their `id` field.
 * Useful for dynamic pack selection:
 * ```typescript
 * const pack = COMPLIANCE_PACKS['HIPAA'];
 * await governance.applyPack(pack, { deploy: { target: 'tenant' } });
 * ```
 */
export const COMPLIANCE_PACKS: Record<string, CompliancePack> = {
  HIPAA,
  ISO42001,
  EU_AI_ACT,
  NIST_AI_RMF,
  SOC2,
};
