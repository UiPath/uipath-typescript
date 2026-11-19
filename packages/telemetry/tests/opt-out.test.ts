import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
    APPS_TELEMETRY_DISABLED_ENV,
    TELEMETRY_DISABLED_ENV,
    isTelemetryDisabled,
} from '../src/opt-out';
import type { TelemetryClientInitOptions } from '../src/types';

const mocks = vi.hoisted(() => {
    const emit = vi.fn();
    const getLogger = vi.fn(() => ({ emit }));
    const LoggerProvider = vi.fn(function () { return { getLogger }; });
    const BatchLogRecordProcessor = vi.fn();
    return { emit, getLogger, LoggerProvider, BatchLogRecordProcessor };
});

vi.mock('@opentelemetry/sdk-logs', () => ({
    LoggerProvider: mocks.LoggerProvider,
    BatchLogRecordProcessor: mocks.BatchLogRecordProcessor,
}));

const APPS_ENV_GLOBAL = '__UIPATH_ENV__';
const holder = globalThis as Record<string, unknown>;

const OPTIONS: TelemetryClientInitOptions = {
    sdkVersion: '1.2.3',
    serviceName: 'TestService',
    cloudRoleName: 'test-role',
    loggerName: 'test-logger',
    defaultEventName: 'Test.Run',
    connectionString: 'InstrumentationKey=abc;IngestionEndpoint=https://example.com',
};

async function freshClient() {
    const { TelemetryClient } = await import('../src/client');
    return new TelemetryClient();
}

function setAppsEnv(table: unknown): void {
    holder[APPS_ENV_GLOBAL] = table;
}

beforeEach(() => {
    mocks.emit.mockClear();
    mocks.LoggerProvider.mockClear();
});

afterEach(() => {
    vi.unstubAllEnvs();
    delete holder[APPS_ENV_GLOBAL];
});

describe('isTelemetryDisabled', () => {
    it('leaves telemetry on when no switch is set', () => {
        expect(isTelemetryDisabled()).toBe(false);
    });

    it.each(['1', 'true', 'TRUE', ' true '])(
        'opts out on %j in the process environment',
        (value) => {
            vi.stubEnv(TELEMETRY_DISABLED_ENV, value);

            expect(isTelemetryDisabled()).toBe(true);
        }
    );

    it.each(['', '0', 'false', 'yes'])(
        'leaves telemetry on for %j in the process environment',
        (value) => {
            vi.stubEnv(TELEMETRY_DISABLED_ENV, value);

            expect(isTelemetryDisabled()).toBe(false);
        }
    );

    it.each(['1', 'true'])(
        'opts out on %j among the coded app environment variables',
        (value) => {
            setAppsEnv({ [APPS_TELEMETRY_DISABLED_ENV]: value });

            expect(isTelemetryDisabled()).toBe(true);
        }
    );

    it('leaves telemetry on when the coded app variable is false', () => {
        setAppsEnv({ [APPS_TELEMETRY_DISABLED_ENV]: 'false' });

        expect(isTelemetryDisabled()).toBe(false);
    });

    it('ignores a coded app value that is not a string', () => {
        setAppsEnv({ [APPS_TELEMETRY_DISABLED_ENV]: true });

        expect(isTelemetryDisabled()).toBe(false);
    });

    it('ignores a coded app environment global that is not an object', () => {
        setAppsEnv('UIPATH_APPS_TELEMETRY_DISABLED=true');

        expect(isTelemetryDisabled()).toBe(false);
    });

    it('does not read the switch off Object.prototype', () => {
        setAppsEnv(Object.create({ [APPS_TELEMETRY_DISABLED_ENV]: 'true' }));

        expect(isTelemetryDisabled()).toBe(false);
    });

    it('does not take the unprefixed name from the coded app variables', () => {
        setAppsEnv({ [TELEMETRY_DISABLED_ENV]: 'true' });

        expect(isTelemetryDisabled()).toBe(false);
    });

    it('treats an environment that throws on read as not opted out', () => {
        const original = Object.getOwnPropertyDescriptor(globalThis, 'process');
        Object.defineProperty(globalThis, 'process', {
            configurable: true,
            get() {
                throw new Error('no env permission');
            },
        });

        try {
            expect(isTelemetryDisabled()).toBe(false);
        } finally {
            Object.defineProperty(globalThis, 'process', original!);
        }
    });
});

describe('TelemetryClient with telemetry disabled', () => {
    it('builds no exporter and emits nothing when the process environment opts out', async () => {
        vi.stubEnv(TELEMETRY_DISABLED_ENV, '1');
        const client = await freshClient();

        client.initialize(OPTIONS);
        client.track('Queue.GetAll');

        expect(mocks.LoggerProvider).not.toHaveBeenCalled();
        expect(mocks.emit).not.toHaveBeenCalled();
    });

    it('builds no exporter and emits nothing when the coded app opts out', async () => {
        setAppsEnv({ [APPS_TELEMETRY_DISABLED_ENV]: 'true' });
        const client = await freshClient();

        client.initialize(OPTIONS);
        client.track('Queue.GetAll');

        expect(mocks.LoggerProvider).not.toHaveBeenCalled();
        expect(mocks.emit).not.toHaveBeenCalled();
    });

    it('stays off once initialized disabled, even if the switch is later cleared', async () => {
        vi.stubEnv(TELEMETRY_DISABLED_ENV, '1');
        const client = await freshClient();
        client.initialize(OPTIONS);

        vi.unstubAllEnvs();
        client.initialize(OPTIONS);
        client.track('Queue.GetAll');

        expect(mocks.emit).not.toHaveBeenCalled();
    });

    it('emits as before when no switch is set', async () => {
        const client = await freshClient();

        client.initialize(OPTIONS);
        client.track('Queue.GetAll');

        expect(mocks.LoggerProvider).toHaveBeenCalledTimes(1);
        expect(mocks.emit).toHaveBeenCalledTimes(1);
    });
});
