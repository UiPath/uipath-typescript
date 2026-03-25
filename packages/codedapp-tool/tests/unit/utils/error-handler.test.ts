import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { withErrorHandling } from '../../../src/utils/error-handler.js';

describe('withErrorHandling', () => {
  beforeEach(() => {
    vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    delete process.env.DEBUG;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should call process.exit(0) on success', async () => {
    const fn = vi.fn().mockResolvedValue(undefined);
    const wrapped = withErrorHandling(fn);

    await wrapped();

    expect(fn).toHaveBeenCalled();
    expect(process.exit).toHaveBeenCalledWith(0);
  });

  it('should log error and exit(1) on failure', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('something failed'));
    const wrapped = withErrorHandling(fn);

    await wrapped();

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('something failed')
    );
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('should show stack trace when DEBUG is set', async () => {
    process.env.DEBUG = 'true';
    const error = new Error('debug error');
    const fn = vi.fn().mockRejectedValue(error);
    const wrapped = withErrorHandling(fn);

    await wrapped();

    // Should log both the formatted error and the stack
    expect(console.error).toHaveBeenCalledTimes(2);
  });

  it('should handle non-Error thrown values', async () => {
    const fn = vi.fn().mockRejectedValue('string error');
    const wrapped = withErrorHandling(fn);

    await wrapped();

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('string error')
    );
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('should pass through arguments to the wrapped function', async () => {
    const fn = vi.fn().mockResolvedValue(undefined);
    const wrapped = withErrorHandling(fn);

    await wrapped('arg1', 'arg2');

    expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
  });
});
