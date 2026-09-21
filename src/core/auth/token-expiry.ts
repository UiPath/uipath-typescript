/**
 * Milliseconds since the epoch for a token's expiry.
 *
 * `TokenInfo.expiresAt` is declared as a `Date`, but the value can reach the
 * SDK from a host `postMessage` — the embedded protocol carries it as an ISO
 * 8601 string, and the Action Center payload is forwarded without conversion.
 * Accepting both keeps the comparison correct either way.
 *
 * An unparseable value yields `NaN`, which makes every comparison against it
 * false, so the token is treated as not expired — the same outcome as before
 * this helper existed. Conversion failures are not logged here: this runs on
 * every request, and the managers that own the parse already warn once at the
 * point the value arrives.
 */
export function getExpiryMs(expiresAt: Date | string): number {
  return expiresAt instanceof Date ? expiresAt.getTime() : new Date(expiresAt).getTime();
}
