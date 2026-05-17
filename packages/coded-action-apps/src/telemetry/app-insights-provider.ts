import type { ITelemetryProvider, TelemetryProperties } from '@uipath/common/telemetry';

/**
 * Application Insights ingestion payload shape (subset).
 *
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

interface ApplicationInsightsProviderTags {
    cloudRoleName: string;
    cloudRoleInstance: string;
}

const INSTRUMENTATION_KEY_RE = /InstrumentationKey=([^;]+)/;
const INGESTION_ENDPOINT_RE = /IngestionEndpoint=([^;]+)/;

/**
 * `ITelemetryProvider` implementation that ships every event to the
 * Application Insights `/v2/track` endpoint as a custom event.
 */
export class ApplicationInsightsTelemetryProvider implements ITelemetryProvider {
    private readonly connectionString: string;
    private readonly tags: ApplicationInsightsProviderTags;

    constructor(connectionString: string, tags: ApplicationInsightsProviderTags) {
        this.connectionString = connectionString;
        this.tags = tags;
    }

    public async trackEvent(eventName: string, properties?: TelemetryProperties): Promise<void> {
        await this.send(this.buildEnvelope(eventName, properties));
    }

    public async trackException(error: Error, properties?: TelemetryProperties): Promise<void> {
        await this.send(this.buildEnvelope(error.message, properties));
    }

    public async trackRequest(
        name: string,
        _duration: number,
        _success: boolean,
        properties?: TelemetryProperties
    ): Promise<void> {
        await this.send(this.buildEnvelope(name, properties));
    }

    public async trackDependency(
        name: string,
        _type: string,
        _duration: number,
        _success: boolean,
        properties?: TelemetryProperties
    ): Promise<void> {
        await this.send(this.buildEnvelope(name, properties));
    }

    private buildEnvelope(eventName: string, properties?: TelemetryProperties): ApplicationInsightsEnvelope {
        return {
            name: 'Microsoft.ApplicationInsights.Event',
            time: new Date().toISOString(),
            iKey: this.extractInstrumentationKey(),
            data: {
                baseType: 'EventData',
                baseData: {
                    ver: 2,
                    name: eventName,
                    properties: this.toStringProperties(properties),
                },
            },
            tags: {
                'ai.cloud.role': this.tags.cloudRoleName,
                'ai.cloud.roleInstance': this.tags.cloudRoleInstance,
            },
        };
    }

    private async send(envelope: ApplicationInsightsEnvelope): Promise<void> {
        try {
            const endpoint = this.extractIngestionEndpoint();
            if (!endpoint) {
                console.debug('No ingestion endpoint found in connection string');
                return;
            }
            const response = await fetch(`${endpoint}/v2/track`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(envelope),
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

    private extractInstrumentationKey(): string {
        const match = INSTRUMENTATION_KEY_RE.exec(this.connectionString);
        return match ? match[1] : '';
    }

    private extractIngestionEndpoint(): string {
        const match = INGESTION_ENDPOINT_RE.exec(this.connectionString);
        return match ? match[1] : '';
    }

    private toStringProperties(properties?: TelemetryProperties): Record<string, string> {
        const out: Record<string, string> = {};
        if (!properties) return out;
        for (const [key, value] of Object.entries(properties)) {
            if (value !== undefined) {
                out[key] = String(value);
            }
        }
        return out;
    }
}
