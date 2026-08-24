/**
 * Telemetry type definitions
 */

/**
 * Attributes attached to a telemetry event.
 */
export interface TelemetryAttributes {
    [key: string]: string | number | boolean;
}

/**
 * Per-tenant context applied to every emitted event.
 */
export interface TelemetryContext {
    baseUrl?: string;
    orgName?: string;
    tenantName?: string;
    orgId?: string;
    tenantId?: string;
    clientId?: string;
    redirectUri?: string;
}

/**
 * Identity values supplied by the consumer SDK
 * when initializing the singleton client. These describe the producer
 * of the telemetry, not the user/tenant context.
 */
export interface TelemetryClientInitOptions {
    /** SDK / app version reported as `Version` and `ai.cloud.roleInstance`. */
    sdkVersion: string;
    /** Logical service name reported as `ApplicationName`. */
    serviceName: string;
    /** Cloud role name reported as `ai.cloud.role`. */
    cloudRoleName: string;
    /** Logger name used to scope log records. */
    loggerName: string;
    /** Default event display name used when none is supplied to `track`. */
    defaultEventName: string;
    /**
     * Application Insights connection string. Omit it to use the shared one
     * patched into this package at publish time, which is what every consumer
     * did before this option existed. Supply one to send a consumer's events to
     * its own resource instead.
     *
     * An empty string disables telemetry rather than falling back, so a
     * consumer whose own value is unset emits nothing instead of silently
     * reporting to the shared resource.
     */
    connectionString?: string;
    /** Optional per-tenant context applied to every event. */
    context?: TelemetryContext;
}

/**
 * Options accepted by the `@track` decorator and `track(...)` function form.
 */
export interface TrackOptions {
    /**
     * Either a static boolean or a callback receiving the wrapped function's
     * arguments. When `false` (or returns `false`), the call is not tracked.
     */
    condition?: boolean | ((this: unknown, ...args: unknown[]) => boolean);
    /** Extra attributes merged into the emitted event's attributes. */
    attributes?: TelemetryAttributes;
}
