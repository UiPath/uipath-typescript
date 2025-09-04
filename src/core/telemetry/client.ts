import { LoggerProvider, BatchLogRecordProcessor, LogRecordExporter } from '@opentelemetry/sdk-logs';

import {
    CONNECTION_STRING,
    CLOUD_TENANT_NAME,
    CLOUD_ORGANIZATION_NAME,
    CLOUD_URL,
    CLOUD_REDIRECT_URI,
    APP_NAME,
    SDK_VERSION,
    VERSION,
    UNKNOWN,
    CLOUD_ROLE_NAME,
    SERVICE,
    SDK_SERVICE_NAME,
    SDK_LOGGER_NAME,
    CLOUD_CLIENT_ID,
    SDK_RUN_EVENT
} from './constants';
import { TelemetryAttributes, TelemetryConfig } from './types';

/**
 * Log exporter that sends ALL logs as Application Insights custom events
 */
class ApplicationInsightsEventExporter implements LogRecordExporter {
    private connectionString: string;

    constructor(connectionString: string) {
        this.connectionString = connectionString;
    }

    export(logs: any[], resultCallback: (result: any) => void): void {
        try {
            logs.forEach(logRecord => {
                this.sendAsCustomEvent(logRecord);
            });
            resultCallback({ code: 0 });
        } catch (error) {
            console.debug('Failed to export logs to Application Insights:', error);
            resultCallback({ code: 2, error });
        }
    }

    shutdown(): Promise<void> {
        return Promise.resolve();
    }

    private sendAsCustomEvent(logRecord: any): void {
        // Get event name from body or attributes
        const eventName = logRecord.body || SDK_RUN_EVENT;
        
        const payload = {
            name: 'Microsoft.ApplicationInsights.Event',
            time: new Date().toISOString(),
            iKey: this.extractInstrumentationKey(),
            data: {
                baseType: 'EventData',
                baseData: {
                    ver: 2,
                    name: eventName,
                    properties: this.convertAttributesToProperties(logRecord.attributes || {})
                }
            },
            tags: {
                'ai.cloud.role': CLOUD_ROLE_NAME,
                'ai.cloud.roleInstance': SDK_VERSION
            }
        };

        this.sendToApplicationInsights(payload);
    }

    private extractInstrumentationKey(): string {
        const match = this.connectionString.match(/InstrumentationKey=([^;]+)/);
        return match ? match[1] : '';
    }

    private convertAttributesToProperties(attributes: any): Record<string, string> {
        const properties: Record<string, string> = {};
        Object.entries(attributes || {}).forEach(([key, value]) => {
            properties[key] = String(value);
        });
        return properties;
    }

    private async sendToApplicationInsights(payload: any): Promise<void> {
        try {
            const ingestionEndpoint = this.extractIngestionEndpoint();
            if (!ingestionEndpoint) {
                console.debug('No ingestion endpoint found in connection string');
                return;
            }

            const url = `${ingestionEndpoint}/v2/track`;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                console.debug(`Failed to send event telemetry: ${response.status} ${response.statusText}`);
            }
        } catch (error) {
            console.debug('Error sending event telemetry to Application Insights:', error);
        }
    }

    private extractIngestionEndpoint(): string {
        const match = this.connectionString.match(/IngestionEndpoint=([^;]+)/);
        return match ? match[1] : '';
    }
}

/**
 * Singleton telemetry client
 */
class TelemetryClient {
    private static instance: TelemetryClient;
    private isInitialized = false;
    private logProvider?: LoggerProvider;
    private logger?: any;
    private telemetryContext?: TelemetryConfig;

    private constructor() {}

    public static getInstance(): TelemetryClient {
        if (!TelemetryClient.instance) {
            TelemetryClient.instance = new TelemetryClient();
        }
        return TelemetryClient.instance;
    }

    /**
     * Initialize telemetry 
     */
    public initialize(config?: TelemetryConfig): void {
        if (this.isInitialized) {
            return;
        }

        this.isInitialized = true;
        if (config) {
            this.telemetryContext = config;
        }

        try {
            const connectionString = this.getConnectionString();
            if (!connectionString) {
                return;
            }

            this.setupTelemetryProvider(connectionString);
        } catch (error) {
            // Silent failure - telemetry errors shouldn't break functionality
            console.debug('Failed to initialize OpenTelemetry:', error);
        }
    }

    private getConnectionString(): string | null {
        const connectionString = CONNECTION_STRING;
        
        // Skip initialization if no connection string available
        if (!connectionString || connectionString === ("$CONNECTION_STRING" as string)) {
            return null;
        }
        
        return connectionString;
    }

    private setupTelemetryProvider(connectionString: string): void {
        const exporter = new ApplicationInsightsEventExporter(connectionString);
        const processor = new BatchLogRecordProcessor(exporter);

        this.logProvider = new LoggerProvider({
            processors: [processor]
        });

        this.logger = this.logProvider.getLogger(SDK_LOGGER_NAME);
    }

    /**
     * Track a telemetry event 
     */
    public track(eventName: string, name?: string, extraAttributes: TelemetryAttributes = {}): void {
        try {
            const finalDisplayName = name || eventName;
            
            const attributes = this.getEnrichedAttributes(extraAttributes, eventName);

            // Emit as log 
            this.logger.emit({
                body: finalDisplayName,
                attributes: attributes,
                timestamp: Date.now(),
            });
        } catch (error) {
            // Silent failure
            console.debug('Failed to track telemetry event:', error);
        }
    }

    /**
     * Get enriched attributes for telemetry events
     */
    private getEnrichedAttributes(extraAttributes: TelemetryAttributes, eventName: string): TelemetryAttributes {
        const attributes: TelemetryAttributes = {
            ...extraAttributes,
            [APP_NAME]: SDK_SERVICE_NAME,
            [VERSION]: SDK_VERSION || UNKNOWN,
            [SERVICE]: eventName,
            [CLOUD_URL]: this.createCloudUrl(),
            [CLOUD_ORGANIZATION_NAME]: this.telemetryContext?.orgName || UNKNOWN,
            [CLOUD_TENANT_NAME]: this.telemetryContext?.tenantName || UNKNOWN,
            [CLOUD_REDIRECT_URI]: this.telemetryContext?.redirectUri || UNKNOWN,
            [CLOUD_CLIENT_ID]: this.telemetryContext?.clientId || UNKNOWN,
        };

        return attributes;
    }

    /**
     * Create cloud URL from base URL, organization ID, and tenant ID
     */
    private createCloudUrl(): string {
        const baseUrl = this.telemetryContext?.baseUrl;
        const orgId = this.telemetryContext?.orgName;
        const tenantId = this.telemetryContext?.tenantName;

        if (!baseUrl || !orgId || !tenantId) {
            return UNKNOWN;
        }

        return `${baseUrl}/${orgId}/${tenantId}`;
    }
}

// Export singleton instance
export const telemetryClient = TelemetryClient.getInstance();