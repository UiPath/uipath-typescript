/**
 * UiPath TypeScript SDK Telemetry
 *
 * Constructs the SDK's own `TelemetryClient` and binds the SDK-local
 * `track` / `trackEvent` to it. Each consumer of `@uipath/core-telemetry`
 * does this independently, so events carry their own consumer's identity
 * and tenant context.
 */

import {
    createTrack,
    createTrackEvent,
    getOrCreateClient,
} from '@uipath/core-telemetry';
import type { TelemetryContext } from '@uipath/core-telemetry';

import {
    CLOUD_ROLE_NAME,
    SDK_LOGGER_NAME,
    SDK_RUN_EVENT,
    SDK_SERVICE_NAME,
    SDK_VERSION,
} from './constants';

// Keyed by `CLOUD_ROLE_NAME` so every SDK subpath bundle resolves to the
// same `TelemetryClient` instance at runtime. A single `initialize(...)`
// from the `UiPath` constructor therefore wires up `@track` decorators
// across every subpath bundle (`assets`, `feedback`, `tasks`, …).
const sdkClient = getOrCreateClient(CLOUD_ROLE_NAME);

export const track = createTrack(sdkClient);
export const trackEvent = createTrackEvent(sdkClient);

export const telemetryClient = {
    initialize(context?: TelemetryContext): void {
        sdkClient.initialize({
            sdkVersion: SDK_VERSION,
            serviceName: SDK_SERVICE_NAME,
            cloudRoleName: CLOUD_ROLE_NAME,
            loggerName: SDK_LOGGER_NAME,
            defaultEventName: SDK_RUN_EVENT,
            context,
        });
    },
};
