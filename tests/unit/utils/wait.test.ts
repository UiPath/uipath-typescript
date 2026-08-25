import { describe, it, expect, vi, afterEach } from 'vitest';
import { wait } from '../../../src/utils/wait';
import { HTTP_TEST_CONSTANTS } from '../../utils/constants';

afterEach(() => {
  vi.useRealTimers();
});

describe('wait', () => {
  it('resolves only after the requested duration has elapsed', async () => {
    vi.useFakeTimers();
    const settled = vi.fn();

    const pending = wait(HTTP_TEST_CONSTANTS.TIMEOUT_MS).then(settled);

    await vi.advanceTimersByTimeAsync(HTTP_TEST_CONSTANTS.TIMEOUT_MS - 1);
    expect(settled).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    await pending;
    expect(settled).toHaveBeenCalledTimes(1);
  });

  it('resolves immediately for a zero or negative duration', async () => {
    await expect(wait(0)).resolves.toBeUndefined();
    await expect(wait(-1)).resolves.toBeUndefined();
  });
});
