import {
    BrowserContextStorage,
    TelemetryService,
    type TelemetryContext,
    type TelemetryProperties,
} from '@uipath/common/telemetry';

import {
    SDK_VERSION,
    CLOUD_ROLE_NAME,
    SDK_SERVICE_NAME,
} from './constants';
import { TelemetryAttributes, TelemetryConfig } from './types';
import { ApplicationInsightsTelemetryProvider } from './app-insights-provider';

/**
 * Application Insights connection string — patched by the SDK publish
 * workflow. Kept here (not in `constants.ts`) so the SDK identity file
 * remains static and matches the shared shape used by other consumers.
 */
const CONNECTION_STRING = '$CONNECTION_STRING';

// Property keys attached to every emitted event. Held locally so the SDK
// owns the wire format independently of `@uipath/common`.
const APP_NAME = 'ApplicationName';
const VERSION = 'Version';
const SERVICE = 'Service';
const CLOUD_URL = 'CloudUrl';
const CLOUD_ORGANIZATION_NAME = 'CloudOrganizationName';
const CLOUD_TENANT_NAME = 'CloudTenantName';
const CLOUD_CLIENT_ID = 'CloudClientId';
const CLOUD_REDIRECT_URI = 'CloudRedirectUri';
const UNKNOWN = '';

/**
 * SDK-facing telemetry singleton. Wraps `@uipath/common`'s
 * `TelemetryService` so the SDK keeps its existing call site
 * (`telemetryClient.initialize({ baseUrl, orgName, ... })`) while routing
 * events through the shared package.
 */
class SdkTelemetryClient {
    private service?: TelemetryService;
    private isInitialized = false;

    /**
     * Initialize telemetry with the consumer's per-tenant context. Safe to
     * call once — subsequent calls are no-ops.
     */
    public initialize(config?: TelemetryConfig): void {
        if (this.isInitialized) {
            return;
        }
        this.isInitialized = true;

        try {
            if (!this.isValidConnectionString(CONNECTION_STRING)) {
                return;
            }

            const provider = new ApplicationInsightsTelemetryProvider(CONNECTION_STRING, {
                cloudRoleName: CLOUD_ROLE_NAME,
                cloudRoleInstance: SDK_VERSION,
            });
            this.service = new TelemetryService(
                provider,
                new BrowserContextStorage<TelemetryContext>()
            );
            this.service.setDefaultProperties(this.buildDefaultProperties(config));
        } catch (error) {
            // Silent failure - telemetry errors shouldn't break functionality
            console.debug('Failed to initialize telemetry:', error);
        }
    }

    /**
     * Emit a telemetry event. `eventName` identifies the SDK operation
     * (e.g. `Queue.GetAll`); `name` is the Application Insights event body
     * (defaults to the same value).
     */
    public track(eventName: string, name?: string, extraAttributes: TelemetryAttributes = {}): void {
        try {
            if (!this.service) {
                return;
            }
            const displayName = name ?? eventName;
            this.service.trackEvent(displayName, {
                [SERVICE]: eventName,
                ...extraAttributes,
            });
        } catch (error) {
            // Silent failure
            console.debug('Failed to track telemetry event:', error);
        }
    }

    private isValidConnectionString(connectionString: string): boolean {
        // Build placeholders are emitted as `$CONNECTION_STRING` literally
        // until the publish workflow patches them. Treat any unsubstituted
        // placeholder as "no connection string available".
        return Boolean(connectionString) && !connectionString.startsWith('$');
    }

    private buildDefaultProperties(config?: TelemetryConfig): TelemetryProperties {
        return {
            [APP_NAME]: SDK_SERVICE_NAME,
            [VERSION]: SDK_VERSION || UNKNOWN,
            [CLOUD_URL]: this.createCloudUrl(config),
            [CLOUD_ORGANIZATION_NAME]: config?.orgName ?? UNKNOWN,
            [CLOUD_TENANT_NAME]: config?.tenantName ?? UNKNOWN,
            [CLOUD_REDIRECT_URI]: config?.redirectUri ?? UNKNOWN,
            [CLOUD_CLIENT_ID]: config?.clientId ?? UNKNOWN,
        };
    }

    private createCloudUrl(config?: TelemetryConfig): string {
        if (!config?.baseUrl || !config.orgName || !config.tenantName) {
            return UNKNOWN;
        }
        return `${config.baseUrl}/${config.orgName}/${config.tenantName}`;
    }
}

export const telemetryClient = new SdkTelemetryClient();
