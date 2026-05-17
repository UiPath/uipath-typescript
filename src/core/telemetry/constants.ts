/**
 * SDK Telemetry constants.
 *
 * Only the SDK's identity (version, service name, role name, …) lives
 * here. The Application Insights connection string is injected into
 * `@uipath/common` itself at publish time, and the generic attribute
 * keys (`Version`, `Service`, `CloudOrganizationName`, …) are owned by
 * `@uipath/common` and consumed there — they are not part of the
 * SDK's public API.
 */

/** SDK version placeholder — patched by the SDK publish workflow. */
export const SDK_VERSION = '$SDK_VERSION';

export const CLOUD_ROLE_NAME = 'uipath-ts-sdk';
export const SDK_SERVICE_NAME = 'UiPath.TypeScript.Sdk';
export const SDK_LOGGER_NAME = 'uipath-ts-sdk-telemetry';

export const SDK_RUN_EVENT = 'Sdk.Run';
