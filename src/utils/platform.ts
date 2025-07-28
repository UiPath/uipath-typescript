/**
 * Utility functions for platform detection
 */

/**
 * Checks if code is running in a browser environment
 */
export const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';

