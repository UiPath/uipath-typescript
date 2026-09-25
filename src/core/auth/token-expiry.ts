/**
 * Milliseconds since the epoch for a token's expiry.
 *
 * `expiresAt` is typed as a `Date`, but `sdk.updateToken()` can be called from
 * JavaScript with a string, so both are accepted. A value that cannot be read
 * returns the epoch, so the token counts as expired and is refreshed, instead
 * of `NaN`, which would make it look like it never expires.
 */
export function getExpiryMs(expiresAt: Date | string): number {
  const ms = expiresAt instanceof Date ? expiresAt.getTime() : new Date(expiresAt).getTime();
  return Number.isNaN(ms) ? 0 : ms;
}
