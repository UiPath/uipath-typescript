/**
 * Telemetry type definitions for the Coded Action Apps SDK.
 */

export interface TelemetryAttributes {
    [key: string]: string | number | boolean;
}

export interface TelemetryConfig {
    baseUrl?: string;
    orgName?: string;
    tenantName?: string;
    clientId?: string;
}

export interface TrackOptions {
    condition?: boolean | ((...args: unknown[]) => boolean);
    attributes?: TelemetryAttributes;
}
