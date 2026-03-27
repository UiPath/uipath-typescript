import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../src/telemetry/client.js', () => ({
  cliTelemetryClient: { track: vi.fn() },
}));

import { track } from '../../../src/telemetry/track.js';
import { cliTelemetryClient } from '../../../src/telemetry/client.js';

describe('telemetry/track', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('as method decorator with string name', () => {
    it('should track with provided event name and call original method', () => {
      class TestClass {
        @track('MyEvent')
        doWork() {
          return 'result';
        }
      }
      const instance = new TestClass();
      const result = instance.doWork();
      expect(result).toBe('result');
      expect(cliTelemetryClient.track).toHaveBeenCalledWith('Cli.MyEvent', undefined);
    });

    it('should not double-prefix Cli. names', () => {
      class TestClass {
        @track('Cli.Already')
        doWork() {
          return 'ok';
        }
      }
      new TestClass().doWork();
      expect(cliTelemetryClient.track).toHaveBeenCalledWith('Cli.Already', undefined);
    });
  });

  describe('as method decorator with options', () => {
    it('should pass attributes to track', () => {
      class TestClass {
        @track({ attributes: { key: 'val' } })
        doWork() {
          return 42;
        }
      }
      new TestClass().doWork();
      expect(cliTelemetryClient.track).toHaveBeenCalledWith('Cli.doWork', { key: 'val' });
    });

    it('should not track when condition is false', () => {
      class TestClass {
        @track({ condition: false })
        doWork() {
          return 1;
        }
      }
      new TestClass().doWork();
      expect(cliTelemetryClient.track).not.toHaveBeenCalled();
    });

    it('should evaluate condition function', () => {
      class TestClass {
        @track({ condition: () => true })
        doWork() {
          return 1;
        }
      }
      new TestClass().doWork();
      expect(cliTelemetryClient.track).toHaveBeenCalled();
    });

    it('should skip tracking when condition function returns false', () => {
      class TestClass {
        @track({ condition: () => false })
        doWork() {
          return 1;
        }
      }
      new TestClass().doWork();
      expect(cliTelemetryClient.track).not.toHaveBeenCalled();
    });
  });

  describe('as function decorator', () => {
    it('should return a wrapper that tracks and calls original', () => {
      const decorator = track('FnEvent');
      const original = vi.fn().mockReturnValue('hello');
      const wrapped = (decorator as any)(null, undefined, undefined)(original);
      const result = wrapped();
      expect(result).toBe('hello');
      expect(cliTelemetryClient.track).toHaveBeenCalledWith('Cli.FnEvent', undefined);
    });
  });
});
