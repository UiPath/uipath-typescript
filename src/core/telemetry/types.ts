/**
 * Telemetry type definitions
 */

export interface TelemetryAttributes {
    [key: string]: string | number | boolean;
}

export interface TelemetryConfig {
    baseUrl?: string;
    orgName?: string;
    tenantName?: string;
    clientId?: string;
    redirectUri?: string;
}

export interface TrackOptions {
    condition?: boolean | ((...args: any[]) => boolean);
    attributes?: TelemetryAttributes;
}