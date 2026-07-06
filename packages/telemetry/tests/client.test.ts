import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TelemetryClient } from '../src/client';
import type { TelemetryClientInitOptions } from '../src/types';

// Hoisted mocks so the `vi.mock` factory below can reference them.
const mocks = vi.hoisted(() => {
    const emit = vi.fn();
    const logger = { emit };
    const getLogger = vi.fn(() => logger);
    const provider = { getLogger };
    const LoggerProvider = vi.fn(function () { return provider; });
    const BatchLogRecordProcessor = vi.fn();
    return { emit, logger, getLogger, provider, LoggerProvider, BatchLogRecordProcessor };
});

vi.mock('@opentelemetry/sdk-logs', () => ({
    LoggerProvider: mocks.LoggerProvider,
    BatchLogRecordProcessor: mocks.BatchLogRecordProcessor,
}));

const VALID_OPTIONS: TelemetryClientInitOptions = {
    sdkVersion: '1.2.3',
    serviceName: 'TestService',
    cloudRoleName: 'test-role',
    loggerName: 'test-logger',
    defaultEventName: 'Test.Run',
};

const VALID_CONNECTION_STRING =
    'InstrumentationKey=abc;IngestionEndpoint=https://example.com';

const TEST_USER_ID = 'user-guid-1234';

/**
 * `TelemetryClient.initialize` reads `CONNECTION_STRING` from `./constants`
 * at call time. Each test that needs to drive a specific value re-mocks
 * `../src/constants`, resets the module cache, and re-imports
 * `TelemetryClient` so the constant is read fresh.
 */
async function clientWithConnectionString(connectionString: string) {
    vi.resetModules();
    vi.doMock('../src/constants', async () => {
        const actual = await vi.importActual<typeof import('../src/constants')>(
            '../src/constants'
        );
        return { ...actual, CONNECTION_STRING: connectionString };
    });
    const mod = await import('../src/client');
    return new mod.TelemetryClient();
}

beforeEach(() => {
    mocks.emit.mockClear();
    mocks.getLogger.mockClear();
    mocks.LoggerProvider.mockClear();
    mocks.BatchLogRecordProcessor.mockClear();
});

afterEach(() => {
    vi.doUnmock('../src/constants');
});

describe('TelemetryClient.initialize', () => {
    it('sets up the LoggerProvider and getLogger when the connection string is valid', async () => {
        const client = await clientWithConnectionString(VALID_CONNECTION_STRING);

        client.initialize(VALID_OPTIONS);

        expect(mocks.LoggerProvider).toHaveBeenCalledTimes(1);
        expect(mocks.BatchLogRecordProcessor).toHaveBeenCalledTimes(1);
        expect(mocks.getLogger).toHaveBeenCalledWith('test-logger');
    });

    it('no-ops when the package-level connection string is empty', async () => {
        const client = await clientWithConnectionString('');

        client.initialize(VALID_OPTIONS);

        expect(mocks.LoggerProvider).not.toHaveBeenCalled();
        expect(mocks.getLogger).not.toHaveBeenCalled();
    });

    it('no-ops when the package-level connection string is the unsubstituted build placeholder', async () => {
        const client = await clientWithConnectionString('$CONNECTION_STRING');

        client.initialize(VALID_OPTIONS);

        expect(mocks.LoggerProvider).not.toHaveBeenCalled();
        expect(mocks.getLogger).not.toHaveBeenCalled();
    });

    it('ignores subsequent initialize calls on the same instance — first init wins', async () => {
        const client = await clientWithConnectionString(VALID_CONNECTION_STRING);

        client.initialize(VALID_OPTIONS);
        client.initialize({ ...VALID_OPTIONS, loggerName: 'second-logger' });

        expect(mocks.LoggerProvider).toHaveBeenCalledTimes(1);
        expect(mocks.getLogger).toHaveBeenCalledTimes(1);
        expect(mocks.getLogger).toHaveBeenCalledWith('test-logger');
        expect(mocks.getLogger).not.toHaveBeenCalledWith('second-logger');
    });

    it('treats the second init as a no-op even after a failed first init', async () => {
        // First init no-ops because the placeholder was never substituted,
        // but `isInitialized` still flips to true — the second init must
        // not retry, even if a valid connection string somehow appears.
        const client = await clientWithConnectionString('');

        client.initialize(VALID_OPTIONS);
        client.initialize(VALID_OPTIONS);

        expect(mocks.LoggerProvider).not.toHaveBeenCalled();
    });

    it('keeps two independent client instances isolated from each other', async () => {
        // Each consumer (SDK, CAA, …) instantiates its own client. Their
        // identities, init state, and Logger pipelines are independent.
        // Load the class through the same constants-mocking helper so the
        // module-level CONNECTION_STRING is the valid value for both
        // instances.
        vi.resetModules();
        vi.doMock('../src/constants', async () => {
            const actual = await vi.importActual<typeof import('../src/constants')>(
                '../src/constants'
            );
            return { ...actual, CONNECTION_STRING: VALID_CONNECTION_STRING };
        });
        const { TelemetryClient: FreshClient } = await import('../src/client');

        const a = new FreshClient();
        const b = new FreshClient();

        a.initialize(VALID_OPTIONS);
        b.initialize({ ...VALID_OPTIONS, loggerName: 'logger-b' });

        // Both clients should have triggered their own LoggerProvider +
        // getLogger calls — proves they don't share state.
        expect(mocks.LoggerProvider).toHaveBeenCalledTimes(2);
        expect(mocks.getLogger).toHaveBeenCalledWith('test-logger');
        expect(mocks.getLogger).toHaveBeenCalledWith('logger-b');
    });
});

describe('TelemetryClient.track', () => {
    it('does not throw when called before initialize', async () => {
        const client = await clientWithConnectionString(VALID_CONNECTION_STRING);

        expect(() => client.track('Some.Event')).not.toThrow();
        expect(mocks.emit).not.toHaveBeenCalled();
    });

    it('does not throw when called after a failed initialize', async () => {
        const client = await clientWithConnectionString('');
        client.initialize(VALID_OPTIONS);

        expect(() => client.track('Some.Event')).not.toThrow();
        expect(mocks.emit).not.toHaveBeenCalled();
    });

    it('emits a log record enriched with producer and tenant attributes', async () => {
        const client = await clientWithConnectionString(VALID_CONNECTION_STRING);

        client.initialize({
            ...VALID_OPTIONS,
            context: {
                baseUrl: 'https://example.com',
                orgName: 'org',
                tenantName: 'tenant',
                orgId: 'org-guid',
                tenantId: 'tenant-guid',
                clientId: 'client-1',
                redirectUri: 'https://example.com/cb',
            },
        });

        client.track('Service.Method', 'Test.Run', { custom: 'value' });

        expect(mocks.emit).toHaveBeenCalledTimes(1);
        const [logRecord] = mocks.emit.mock.calls[0];
        expect(logRecord.body).toBe('Test.Run');
        expect(logRecord.attributes).toMatchObject({
            ApplicationName: 'TestService',
            Version: '1.2.3',
            Service: 'Service.Method',
            CloudUrl: 'https://example.com/org-guid/tenant-guid',
            CloudOrganizationName: 'org',
            CloudTenantName: 'tenant',
            CloudOrganizationId: 'org-guid',
            CloudTenantId: 'tenant-guid',
            CloudClientId: 'client-1',
            CloudRedirectUri: 'https://example.com/cb',
            custom: 'value',
        });
        expect(typeof logRecord.timestamp).toBe('number');
    });

    it('builds CloudUrl from org/tenant names when the ids are absent', async () => {
        const client = await clientWithConnectionString(VALID_CONNECTION_STRING);

        client.initialize({
            ...VALID_OPTIONS,
            context: {
                baseUrl: 'https://example.com',
                orgName: 'org',
                tenantName: 'tenant',
            },
        });

        client.track('Some.Event');

        const [logRecord] = mocks.emit.mock.calls[0];
        expect(logRecord.attributes.CloudUrl).toBe('https://example.com/org/tenant');
    });

    it('falls back to the eventName as the body when no display name is given', async () => {
        const client = await clientWithConnectionString(VALID_CONNECTION_STRING);
        client.initialize(VALID_OPTIONS);

        client.track('Some.Event');

        expect(mocks.emit).toHaveBeenCalledWith(
            expect.objectContaining({ body: 'Some.Event' })
        );
    });

    it('uses the empty UNKNOWN sentinel for context fields when no context was supplied', async () => {
        const client = await clientWithConnectionString(VALID_CONNECTION_STRING);
        client.initialize(VALID_OPTIONS);

        client.track('Some.Event');

        const [logRecord] = mocks.emit.mock.calls[0];
        expect(logRecord.attributes.CloudOrganizationName).toBe('');
        expect(logRecord.attributes.CloudTenantName).toBe('');
        expect(logRecord.attributes.CloudOrganizationId).toBe('');
        expect(logRecord.attributes.CloudTenantId).toBe('');
        expect(logRecord.attributes.CloudUrl).toBe('');
        expect(logRecord.attributes.CloudClientId).toBe('');
        expect(logRecord.attributes.CloudRedirectUri).toBe('');
        expect(logRecord.attributes.CloudUserId).toBe('');
    });

    it('reports the event name as the Service attribute and respects the explicit display name', async () => {
        const client = await clientWithConnectionString(VALID_CONNECTION_STRING);
        client.initialize(VALID_OPTIONS);

        client.track('Tasks.Create', 'Sdk.Run');

        const [logRecord] = mocks.emit.mock.calls[0];
        expect(logRecord.body).toBe('Sdk.Run');
        expect(logRecord.attributes.Service).toBe('Tasks.Create');
    });
});

describe('TelemetryClient.setUserId', () => {
    it('populates CloudUserId on subsequent events', async () => {
        const client = await clientWithConnectionString(VALID_CONNECTION_STRING);
        client.initialize(VALID_OPTIONS);

        client.setUserId(TEST_USER_ID);
        client.track('Some.Event');

        const [logRecord] = mocks.emit.mock.calls[0];
        expect(logRecord.attributes.CloudUserId).toBe(TEST_USER_ID);
    });

    it('reports CloudUserId as UNKNOWN on events emitted before a user id is set', async () => {
        const client = await clientWithConnectionString(VALID_CONNECTION_STRING);
        client.initialize(VALID_OPTIONS);

        client.track('Before.UserId');
        client.setUserId(TEST_USER_ID);
        client.track('After.UserId');

        const [beforeRecord] = mocks.emit.mock.calls[0];
        const [afterRecord] = mocks.emit.mock.calls[1];
        expect(beforeRecord.attributes.CloudUserId).toBe('');
        expect(afterRecord.attributes.CloudUserId).toBe(TEST_USER_ID);
    });

    it('keeps the previously set user id when called with an empty value', async () => {
        const client = await clientWithConnectionString(VALID_CONNECTION_STRING);
        client.initialize(VALID_OPTIONS);

        client.setUserId(TEST_USER_ID);
        client.setUserId('');
        client.track('Some.Event');

        const [logRecord] = mocks.emit.mock.calls[0];
        expect(logRecord.attributes.CloudUserId).toBe(TEST_USER_ID);
    });
});

describe('TelemetryClient.getDefaultEventName', () => {
    it('returns undefined before initialize', () => {
        const client = new TelemetryClient();
        expect(client.getDefaultEventName()).toBeUndefined();
    });

    it('returns the configured default event name after initialize', async () => {
        const client = await clientWithConnectionString(VALID_CONNECTION_STRING);
        client.initialize(VALID_OPTIONS);
        expect(client.getDefaultEventName()).toBe('Test.Run');
    });
});
