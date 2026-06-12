/**
 * Coded Action Apps telemetry bootstrap.
 *
 * Constructs the CodedActionApp package's own `TelemetryClient` and exposes a
 * bound `track` / `trackEvent` plus a `telemetryClient` handle whose
 * `initialize(context)` wraps the underlying client with the CodedActionApp SDK identity
 * baked in.
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
    TS_SDK_CLOUD_ROLE_NAME,
} from './constants';

/** Keyed by `CLOUD_ROLE_NAME` so all CodedActionApp SDK module loads share a single `TelemetryClient`. Each SDK uses
 * a unique key so that multiple SDKs can publish telemetry independently.
*/
const codedActionAppTelemetryClient = getOrCreateClient(CLOUD_ROLE_NAME);

export const track = createTrack(codedActionAppTelemetryClient);
export const trackEvent = createTrackEvent(codedActionAppTelemetryClient);

export const telemetryClient = {
    initialize(context?: TelemetryContext): void {
        codedActionAppTelemetryClient.initialize({
            sdkVersion: SDK_VERSION,
            serviceName: SDK_SERVICE_NAME,
            cloudRoleName: CLOUD_ROLE_NAME,
            loggerName: SDK_LOGGER_NAME,
            defaultEventName: SDK_RUN_EVENT,
            context,
        });
    },

    /**
     * Sets the authenticated user's id so completeTask event and all ts-sdk api calls
     * carry it as `CloudUserId`.
     */
    setUserId(userId: string): void {
        codedActionAppTelemetryClient.setUserId(userId);
        getOrCreateClient(TS_SDK_CLOUD_ROLE_NAME).setUserId(userId);
    },
};
