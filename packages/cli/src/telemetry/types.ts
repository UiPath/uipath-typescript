/**
 * Telemetry type definitions
 */

export interface TelemetryAttributes {
    [key: string]: string | number | boolean;
}

export interface TrackOptions {
    condition?: boolean | ((...args: any[]) => boolean);
    attributes?: TelemetryAttributes;
}