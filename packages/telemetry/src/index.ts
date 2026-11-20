/**
 * `@uipath/core-telemetry`
 *
 * Shared telemetry package for consumption by multiple typescript packages.
 * Emits Application Insights custom events through
 * OpenTelemetry's `BatchLogRecordProcessor` + `LoggerProvider` pipeline.
 *
 * Each consumer constructs its own `TelemetryClient` and creates its own
 * `track` / `trackEvent` via `createTrack(client)` and
 * `createTrackEvent(client)`.
 */

export { TelemetryClient } from './client';
export { getOrCreateClient } from './registry';
export {
    APPS_TELEMETRY_DISABLED_ENV,
    TELEMETRY_DISABLED_ENV,
    isTelemetryDisabled,
} from './opt-out';
export { createTrack, createTrackEvent } from './track';
export type { Track } from './track';
export * from './types';
