import {
    BatchLogRecordProcessor,
    LoggerProvider,
} from '@opentelemetry/sdk-logs';
import type {
    LogRecordExporter,
    ReadableLogRecord,
} from '@opentelemetry/sdk-logs';

type Logger = ReturnType<LoggerProvider['getLogger']>;

import {
    APP_NAME,
    CLOUD_CLIENT_ID,
    CLOUD_ORGANIZATION_ID,
    CLOUD_REDIRECT_URI,
    CLOUD_TENANT_ID,
    CLOUD_URL,
    CLOUD_USER_ID,
    CONNECTION_STRING,
    SERVICE,
    UNKNOWN,
    VERSION,
} from './constants';
import {
    TelemetryAttributes,
    TelemetryClientInitOptions,
    TelemetryContext,
} from './types';

/** Result-callback parameter type derived from the OpenTelemetry interface. */
type ExportResultCallback = Parameters<LogRecordExporter['export']>[1];

const INSTRUMENTATION_KEY_RE = /InstrumentationKey=([^;]+)/;
const INGESTION_ENDPOINT_RE = /IngestionEndpoint=([^;]+)/;

/**
 * Application Insights ingestion payload shape (subset).
 *
 * Documented at:
 * https://learn.microsoft.com/azure/azure-monitor/app/data-model-event-telemetry
 */
interface ApplicationInsightsEnvelope {
    name: 'Microsoft.ApplicationInsights.Event';
    time: string;
    iKey: string;
    data: {
        baseType: 'EventData';
        baseData: {
            ver: 2;
            name: string;
            properties: Record<string, string>;
        };
    };
    tags: {
        'ai.cloud.role': string;
        'ai.cloud.roleInstance': string;
    };
}

interface ApplicationInsightsTagsConfig {
    cloudRoleName: string;
    cloudRoleInstance: string;
}

/**
 * Sends every emitted log record as an Application Insights custom event.
 * Plugged into OpenTelemetry's `BatchLogRecordProcessor`, which buffers and
 * flushes log records to this exporter on its own schedule.
 */
class ApplicationInsightsEventExporter implements LogRecordExporter {
    private readonly connectionString: string;
    private readonly tags: ApplicationInsightsTagsConfig;

    constructor(connectionString: string, tags: ApplicationInsightsTagsConfig) {
        this.connectionString = connectionString;
        this.tags = tags;
    }

    public export(
        logs: ReadableLogRecord[],
        resultCallback: ExportResultCallback
    ): void {
        try {
            for (const log of logs) {
                this.sendAsCustomEvent(log);
            }
            resultCallback({ code: 0 });
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            console.debug('Failed to export logs to Application Insights:', err);
            resultCallback({ code: 1, error: err });
        }
    }

    public shutdown(): Promise<void> {
        return Promise.resolve();
    }

    private sendAsCustomEvent(logRecord: ReadableLogRecord): void {
        const eventName = String(logRecord.body);

        const payload: ApplicationInsightsEnvelope = {
            name: 'Microsoft.ApplicationInsights.Event',
            time: new Date().toISOString(),
            iKey: this.extractInstrumentationKey(),
            data: {
                baseType: 'EventData',
                baseData: {
                    ver: 2,
                    name: eventName,
                    properties: this.convertAttributesToProperties(logRecord.attributes),
                },
            },
            tags: {
                'ai.cloud.role': this.tags.cloudRoleName,
                'ai.cloud.roleInstance': this.tags.cloudRoleInstance,
            },
        };

        void this.sendToApplicationInsights(payload);
    }

    private extractInstrumentationKey(): string {
        const match = INSTRUMENTATION_KEY_RE.exec(this.connectionString);
        return match ? match[1] : '';
    }

    private convertAttributesToProperties(
        attributes: ReadableLogRecord['attributes']
    ): Record<string, string> {
        const properties: Record<string, string> = {};
        for (const [key, value] of Object.entries(attributes ?? {})) {
            properties[key] = String(value);
        }
        return properties;
    }

    private async sendToApplicationInsights(
        payload: ApplicationInsightsEnvelope
    ): Promise<void> {
        try {
            const ingestionEndpoint = this.extractIngestionEndpoint();
            if (!ingestionEndpoint) {
                console.debug('No ingestion endpoint found in connection string');
                return;
            }

            const url = `${ingestionEndpoint}/v2/track`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                console.debug(
                    `Failed to send event telemetry: ${response.status} ${response.statusText}`
                );
            }
        } catch (error) {
            console.debug('Error sending event telemetry to Application Insights:', error);
        }
    }

    private extractIngestionEndpoint(): string {
        const match = INGESTION_ENDPOINT_RE.exec(this.connectionString);
        return match ? match[1] : '';
    }
}

/**
 * Telemetry client owned by a single consumer (e.g. the SDK or the Coded
 * Action Apps package). Each consumer instantiates its own client so that
 * its identity (`cloudRoleName`, `serviceName`, `sdkVersion`, …) and tenant
 * context flow through to its own `Logger` and exporter pipeline. Two
 * consumers running in the same process emit independent events — they
 * share the Application Insights connection string but nothing else.
 *
 * Records are emitted via `Logger.emit` and batched by
 * `BatchLogRecordProcessor` before being handed to the Application Insights
 * exporter.
 */
export class TelemetryClient {
    private isInitialized = false;
    private options?: TelemetryClientInitOptions;
    private logProvider?: LoggerProvider;
    private logger?: Logger;
    private telemetryContext?: TelemetryContext;
    private cloudUserId?: string;

    public initialize(options: TelemetryClientInitOptions): void {
        if (this.isInitialized) {
            console.debug('Telemetry client has already been initialized');
            return;
        }

        this.isInitialized = true;
        this.options = options;
        this.telemetryContext = options.context;

        try {
            if (!this.isValidConnectionString(CONNECTION_STRING)) {
                return;
            }

            this.setupTelemetryProvider(CONNECTION_STRING);
        } catch (error) {
            console.debug('Failed to initialize telemetry:', error);
        }
    }

    public track(
        eventName: string,
        name?: string,
        extraAttributes: TelemetryAttributes = {}
    ): void {
        try {
            if (!this.logger) {
                return;
            }

            const finalDisplayName = name ?? eventName;
            const attributes = this.getEnrichedAttributes(extraAttributes, eventName);

            this.logger.emit({
                body: finalDisplayName,
                attributes,
                timestamp: Date.now(),
            });
        } catch (error) {
            console.debug('Failed to track telemetry event:', error);
        }
    }

    /**
     * Default event name (e.g. `Sdk.Run`) used when a tracker fires without
     * an explicit display name. Returns `undefined` until `initialize` runs.
     */
    public getDefaultEventName(): string | undefined {
        return this.options?.defaultEventName;
    }

    /**
     * Sets the authenticated user's id, reported as `CloudUserId` on every
     * subsequently emitted event. Empty values are ignored and the
     * previously set user id, if any, is kept.
     */
    public setUserId(userId: string): void {
        if (userId) {
            this.cloudUserId = userId;
        }
    }

    private setupTelemetryProvider(connectionString: string): void {
        // `setupTelemetryProvider` is only called from `initialize` after
        // `this.options` has been assigned, so the non-null assertion is safe.
        const opts = this.options!;

        const exporter = new ApplicationInsightsEventExporter(connectionString, {
            cloudRoleName: opts.cloudRoleName,
            cloudRoleInstance: opts.sdkVersion,
        });
        const processor = new BatchLogRecordProcessor(exporter);

        this.logProvider = new LoggerProvider({
            processors: [processor],
        });

        this.logger = this.logProvider.getLogger(opts.loggerName);
    }

    private isValidConnectionString(connectionString: string): boolean {
        // Build placeholders are emitted as `$CONNECTION_STRING` literally
        // until the publish workflow patches them. Treat any unsubstituted
        // placeholder as "no connection string available".
        return Boolean(connectionString) && !connectionString.startsWith('$');
    }

    private getEnrichedAttributes(
        extraAttributes: TelemetryAttributes,
        eventName: string
    ): TelemetryAttributes {
        const opts = this.options;
        return {
            [APP_NAME]: opts?.serviceName ?? UNKNOWN,
            [VERSION]: opts?.sdkVersion ?? UNKNOWN,
            [SERVICE]: eventName,
            [CLOUD_URL]: this.createCloudUrl(),
            [CLOUD_ORGANIZATION_ID]: this.telemetryContext?.orgId ?? UNKNOWN,
            [CLOUD_TENANT_ID]: this.telemetryContext?.tenantId ?? UNKNOWN,
            [CLOUD_USER_ID]: this.cloudUserId ?? UNKNOWN,
            [CLOUD_REDIRECT_URI]: this.telemetryContext?.redirectUri ?? UNKNOWN,
            [CLOUD_CLIENT_ID]: this.telemetryContext?.clientId ?? UNKNOWN,
            ...extraAttributes,
        };
    }

    private createCloudUrl(): string {
        const baseUrl = this.telemetryContext?.baseUrl;
        const orgId = this.telemetryContext?.orgId;
        const tenantId = this.telemetryContext?.tenantId;

        if (!baseUrl || !orgId || !tenantId) {
            return UNKNOWN;
        }

        return `${baseUrl}/${orgId}/${tenantId}`;
    }
}
