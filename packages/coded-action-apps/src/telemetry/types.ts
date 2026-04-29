/**
 * Telemetry type definitions
 */

import { PartialUiPathConfig } from "./ts-sdk-config/ts-sdk-config";

export interface TelemetryAttributes {
    [key: string]: string | number | boolean;
}

export type TelemetryConfig = PartialUiPathConfig;

export interface TrackOptions {
    condition?: boolean | ((...args: unknown[]) => boolean);
    attributes?: TelemetryAttributes;
}
