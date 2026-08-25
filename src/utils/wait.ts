/**
 * Waits for a fixed duration before resolving.
 *
 * @param durationMs - How long to wait, in milliseconds. Values below zero resolve immediately.
 * @returns A promise that resolves once the duration has elapsed.
 *
 * @example
 * ```typescript
 * import { wait } from '@uipath/uipath-typescript';
 *
 * await wait(1000); // pause for one second
 * ```
 */
export function wait(durationMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, durationMs)));
}
