import { telemetryClient, track } from '@uipath/uipath-typescript/core'

/**
 * Workaround for a known incompatibility between
 * `@uipath/ui-widgets-datatable` and the SDK's telemetry surface.
 *
 * The widget calls `telemetryClient.track(...)`, but the SDK currently
 * exports `track` only as a top-level function — the `telemetryClient`
 * object itself just exposes `initialize()`. Without this polyfill the
 * widget throws `TypeError: telemetryClient.track is not a function` on
 * every telemetry call.
 *
 * TODO: this should be fixed upstream in the widget (or the SDK should add
 * `track` to its `telemetryClient`). When that lands, delete this file
 * and the `import './lib/widgetCompat'` in `main.tsx`.
 */
const t = telemetryClient as Record<string, unknown>
if (typeof t.track !== 'function') {
  t.track = typeof track === 'function' ? track : () => undefined
}
