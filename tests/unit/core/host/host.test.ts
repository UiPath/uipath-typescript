import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { hostCapability } from '../../../../src/core/host/host';
import { TRACE_TEST_CONSTANTS } from '../../../utils/constants/tracing';

const HOST_KEY = Symbol.for(TRACE_TEST_CONSTANTS.HOST_KEY);
const { CAPABILITY, CAPABILITY_MAJOR } = TRACE_TEST_CONSTANTS;

const capability = { recordSpan: () => undefined };

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  Reflect.deleteProperty(globalThis, HOST_KEY);
  vi.restoreAllMocks();
});

describe('hostCapability', () => {
  it('returns undefined when no host is installed', () => {
    expect(hostCapability(CAPABILITY, CAPABILITY_MAJOR)).toBeUndefined();
  });

  it('returns what the host serves for the capability name and major', () => {
    const host = { capability: vi.fn(() => capability) };
    Reflect.set(globalThis, HOST_KEY, host);

    expect(hostCapability(CAPABILITY, CAPABILITY_MAJOR)).toBe(capability);
    expect(host.capability).toHaveBeenCalledWith(CAPABILITY, CAPABILITY_MAJOR);
  });

  it('returns undefined for a host that has no capability function', () => {
    Reflect.set(globalThis, HOST_KEY, { capability });

    expect(hostCapability(CAPABILITY, CAPABILITY_MAJOR)).toBeUndefined();
  });

  it('warns and returns undefined when the host throws answering', () => {
    Reflect.set(globalThis, HOST_KEY, {
      capability: () => {
        throw new Error(TRACE_TEST_CONSTANTS.HOST_ERROR_MESSAGE);
      },
    });

    expect(hostCapability(CAPABILITY, CAPABILITY_MAJOR)).toBeUndefined();
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining(`${CAPABILITY}@${CAPABILITY_MAJOR}`), expect.any(Error));
  });
});
