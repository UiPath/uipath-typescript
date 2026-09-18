/**
 * Base path constants for different services
 */

export const ORCHESTRATOR_BASE = 'orchestrator_';
export const PIMS_BASE = 'pims_';
export const DATAFABRIC_BASE = 'datafabric_';
export const IDENTITY_BASE = 'identity_';
/**
 * Identity API base for requests routed through {@link ApiClient}.
 *
 * The Identity API is routed at the **organization** level — its URLs do not include a
 * tenant segment (unlike most UiPath services). Compare {@link IDENTITY_BASE}, which is
 * used for the `connect/*` OAuth endpoints called directly against `baseUrl`.
 *
 * The `../` prefix relies on `URL` path normalization to collapse the tenant segment
 * that {@link ApiClient} unconditionally inserts (`{orgName}/{tenantName}/{path}`). Concretely,
 * `{orgName}/{tenantName}/../identity_/api/Setting` resolves to `{orgName}/identity_/api/Setting`.
 *
 * Do NOT remove the leading `../`.
 */
export const IDENTITY_API_BASE = `../${IDENTITY_BASE}`;
/**
 * Authorization service (platform roles) base. Routed at the **organization**
 * level — its URLs do not include a tenant segment (unlike most UiPath services).
 *
 * The `../` prefix relies on `URL` path normalization to collapse the tenant segment
 * that {@link ApiClient} unconditionally inserts (`{orgName}/{tenantName}/{path}`). Concretely,
 * `{orgName}/{tenantName}/../pap_/api/roles` resolves to `{orgName}/pap_/api/roles`.
 *
 * Do NOT remove the leading `../`.
 */
export const AUTHORIZATION_BASE = '../pap_';
export const AUTOPILOT_BASE = 'autopilotforeveryone_';
export const LLMOPS_BASE = 'llmopstenant_';
export const INSIGHTS_RTM_BASE = 'insightsrtm_';
/**
 * Notification service base. The notification service is routed at the **organization**
 * level — its URLs do not include a tenant segment (unlike most UiPath services).
 *
 * The `../` prefix relies on `URL` path normalization to collapse the tenant segment
 * that {@link ApiClient} unconditionally inserts (`{orgName}/{tenantName}/{path}`). Concretely,
 * `{orgName}/{tenantName}/../notificationservice_/...` resolves to `{orgName}/notificationservice_/...`.
 *
 * Do NOT remove the leading `../`. See real-API curl confirmation in the PR description.
 */
export const NOTIFICATION_BASE = '../notificationservice_';
