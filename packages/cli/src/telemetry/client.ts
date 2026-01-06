/**
 * CLI Telemetry client
 */

import { AzureMonitorLogExporter } from '@azure/monitor-opentelemetry-exporter';
import { LoggerProvider, SimpleLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import {
    CONNECTION_STRING,
    ENV_TELEMETRY_ENABLED,
    CLOUD_TENANT_ID,
    CLOUD_ORGANIZATION_ID,
    CLOUD_URL,
    APP_NAME,
    CLI_VERSION,
    APP_SYSTEM_NAME,
    VERSION,
    UNKNOWN,
    CLI_SERVICE_NAME,
    CLI_LOGGER_NAME,
    CLOUD_ROLE_NAME
} from './constants.js';
import { AUTH_CONSTANTS } from '../constants/auth.js';
import { TelemetryAttributes } from './types.js';

const { FILES } = AUTH_CONSTANTS;

/**
 * Singleton CLI telemetry client
 */
class CliTelemetryClient {
    private static instance: CliTelemetryClient;
    private isInitialized = false;
    private isEnabled = false;
    private logger?: any;

    private constructor() {}

    public static getInstance(): CliTelemetryClient {
        if (!CliTelemetryClient.instance) {
            CliTelemetryClient.instance = new CliTelemetryClient();
        }
        return CliTelemetryClient.instance;
    }

    /**
     * Initialize the telemetry client
     */
    public initialize(): void {
        if (this.isInitialized) {
            return;
        }

        this.isInitialized = true;

        if (!this.checkTelemetryEnabled()) {
            return;
        }

        try {
            const connectionString = this.getConnectionString();
            if (!connectionString) {
                this.isEnabled = false;
                return;
            }

            this.setupTelemetryProvider(connectionString);
        } catch (error) {
            // Silent failure - telemetry errors shouldn't break functionality
            this.isEnabled = false;
            console.debug('Failed to initialize CLI telemetry:', error);
        }
    }

    private checkTelemetryEnabled(): boolean {
        const telemetryEnabled = process.env[ENV_TELEMETRY_ENABLED];
        if (telemetryEnabled === 'false') {
            this.isEnabled = false;
            return false;
        }

        // Default to enabled if not explicitly disabled
        this.isEnabled = true;
        return true;
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
        const logExporter = this.createLogExporter(connectionString);
        const resource = this.createResource();
        const loggerProvider = this.createLoggerProvider(resource, logExporter);
        
        this.logger = loggerProvider.getLogger(CLI_LOGGER_NAME);
    }

    private createLogExporter(connectionString: string) {
        return new AzureMonitorLogExporter({
            connectionString,
            disableOfflineStorage: true,
        });
    }

    private createResource() {
        const cliVersion = CLI_VERSION || UNKNOWN;
        return resourceFromAttributes({
            [ATTR_SERVICE_NAME]: CLOUD_ROLE_NAME,
            'service.instance.id': cliVersion,
        });
    }

    private createLoggerProvider(resource: any, logExporter: any) {
        return new LoggerProvider({ 
            resource,
            processors: [new SimpleLogRecordProcessor(logExporter)]
        });
    }

    /**
     * Track a telemetry event
     */
    public track(eventName: string, extraAttributes: TelemetryAttributes = {}): void {
        if (!this.isEnabled || !this.logger) {
            return;
        }

        try {
            const attributes = this.getEnrichedAttributes(extraAttributes);

            // Emit log event that will be sent to Application Insights
            this.logger.emit({
                attributes: {
                    ...attributes,
                    "microsoft.custom_event.name": eventName,
                },
                timestamp: Date.now(),
            });
        } catch (error) {
            // Silent failure
            console.debug('Failed to track CLI telemetry event:', error);
        }
    }

    /**
     * Create cloud URL from base URL, organization ID, and tenant ID
     */
    private createCloudUrl(): string {
        const baseUrl = process.env[AUTH_CONSTANTS.ENV_CONFIG.BASE_URL.envVar];
        const orgId = process.env[AUTH_CONSTANTS.ENV_CONFIG.ORG_ID.envVar];
        const tenantId = process.env[AUTH_CONSTANTS.ENV_CONFIG.TENANT_ID.envVar];

        if (!baseUrl || !orgId || !tenantId) {
            return UNKNOWN;
        }

        return `${baseUrl}/${orgId}/${tenantId}`;
    }

    /**
     * Get enriched attributes for telemetry events
     */
    private getEnrichedAttributes(extraAttributes: TelemetryAttributes): TelemetryAttributes {
        const attributes: TelemetryAttributes = {
            ...extraAttributes,
            [CLOUD_TENANT_ID]: process.env[AUTH_CONSTANTS.ENV_CONFIG.TENANT_ID.envVar] || UNKNOWN,
            [CLOUD_ORGANIZATION_ID]: process.env[AUTH_CONSTANTS.ENV_CONFIG.ORG_ID.envVar] || UNKNOWN,
            [CLOUD_URL]: this.createCloudUrl(),
            [APP_NAME]: CLI_SERVICE_NAME,
            [VERSION]: CLI_VERSION || UNKNOWN,
            [APP_SYSTEM_NAME]: this.getAppSystemName(),
        };

        return attributes;
    }

    /**
     * Get app system name from .uipath/app.config.json
     */
    private getAppSystemName(): string {
        try {
            const uipathFolderPath = join(process.cwd(), AUTH_CONSTANTS.FILES.UIPATH_DIR);
            if (!existsSync(uipathFolderPath)) {
                return UNKNOWN;
            }

            const appConfigPath = join(uipathFolderPath, AUTH_CONSTANTS.FILES.APP_CONFIG);
            if (!existsSync(appConfigPath)) {
                return UNKNOWN;
            }

            const appConfig = JSON.parse(readFileSync(appConfigPath, 'utf-8'));
            return appConfig.systemName || UNKNOWN;
        } catch (error) {
            console.debug('Failed to read system name from .uipath/app.config.json:', error);
            return UNKNOWN;
        }
    }
}

// Export singleton instance
export const cliTelemetryClient = CliTelemetryClient.getInstance();