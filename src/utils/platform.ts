/**
 * Utility functions for platform detection
 */

/**
 * Checks if code is running in a browser environment
 */
export const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';

export const isInActionCenter = isBrowser && window.self != window.top && window.location.href.includes('source=ActionCenter');

const _params = isBrowser ? new URLSearchParams(window.location.search) : null;

/**
 * True when the coded app has been loaded inside a host frame that explicitly
 * opted into token delegation by adding `?host=embed` to the iframe src URL.
 */
export const isHostEmbedded: boolean =
  isBrowser && window.self !== window.top && _params?.get('host') === 'embed';

/**
 * The validated parent origin, read from the `?basedomain=` query param set
 * by the embedding host in the iframe src URL.
 * Mirrors the same mechanism used by ActionCenterTokenManager.
 * Non-null only when `?host=embed` is present and `?basedomain=` is a valid URL.
 */
export const embeddingOrigin: string | null = (() => {
  if (!isHostEmbedded) return null;
  const basedomain = _params?.get('basedomain');
  if (!basedomain) return null;
  try {
    return new URL(basedomain).origin;
  } catch {
    console.warn('embeddingOrigin: basedomain query param is not a valid URL', basedomain);
    return null;
  }
})();
