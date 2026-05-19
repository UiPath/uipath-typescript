import { afterEach, describe, expect, it } from 'vitest';

import { TelemetryClient } from '../src/client';
import { getOrCreateClient } from '../src/registry';

const REGISTRY_KEY = Symbol.for('@uipath/core-telemetry/clients');

afterEach(() => {
    // The registry lives on `globalThis`. Reset it between tests so each
    // test sees a fresh state.
    delete (globalThis as { [key: symbol]: unknown })[REGISTRY_KEY];
});

describe('getOrCreateClient', () => {
    it('returns the same TelemetryClient for the same name across calls', () => {
        const a = getOrCreateClient('uipath-ts-sdk');
        const b = getOrCreateClient('uipath-ts-sdk');

        expect(a).toBe(b);
        expect(a).toBeInstanceOf(TelemetryClient);
    });

    it('returns different clients for different names', () => {
        const sdk = getOrCreateClient('uipath-ts-sdk');
        const caa = getOrCreateClient('uipath-ts-coded-action-apps');

        expect(sdk).not.toBe(caa);
    });

    it('creates a fresh client after the registry is cleared', () => {
        const first = getOrCreateClient('uipath-ts-sdk');

        delete (globalThis as { [key: symbol]: unknown })[REGISTRY_KEY];

        const second = getOrCreateClient('uipath-ts-sdk');

        expect(first).not.toBe(second);
    });
});
