import { telemetryClient, track } from '@uipath/uipath-typescript/core'

/**
 * One-line compatibility shim between two package versions.
 *
 * `@uipath/ui-widgets-datatable` calls `telemetryClient.track(...)`, but the
 * SDK currently exports `track` only as a top-level function — the
 * `telemetryClient` object itself just has `initialize()`. Without this
 * polyfill the widget throws `TypeError: telemetryClient.track is not a function`
 * on every telemetry call.
 *
 * Safe to delete once a widget release aligns with the SDK's telemetry shape.
 */
const t = telemetryClient as Record<string, unknown>
if (typeof t.track !== 'function') {
  t.track = typeof track === 'function' ? track : () => undefined
}
