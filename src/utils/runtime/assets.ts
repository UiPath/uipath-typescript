/**
 * Asset resolution utilities for UiPath Coded Apps
 *
 * These helpers enable developers to write code that works identically
 * in local development and production environments.
 *
 * Values are read from meta tags injected at deployment:
 * - <meta name="uipath:cdn-base" content="https://cdn.example.com/appId/folder">
 * - <meta name="uipath:app-base" content="/org/apps_/.../public">
 */

import { UiPathMetaTags } from './constants';
import { getMetaTagContent } from '../../core/config/runtime';
import { normalizeBaseUrl } from '../../core/config/config-utils';

/**
 * Resolves an asset path to the CDN URL (if available)
 *
 * In local development: returns path as-is (loads from local dev server)
 * In production: prepends CDN base URL from meta tag
 *
 * @param path - The asset path (e.g., './assets/logo.png' or '/assets/logo.png')
 * @returns The resolved asset URL
 *
 * @example
 * ```tsx
 * import { getAsset } from '@uipath/uipath-typescript';
 * import logoPath from './assets/logo.png';
 *
 * function MyComponent() {
 *   return <img src={getAsset(logoPath)} alt="Logo" />;
 * }
 * ```
 */
export function getAsset(path: string): string {
  // If path is already an absolute URL, return as-is
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  const cdnBase = getMetaTagContent(UiPathMetaTags.CDN_BASE);
  if (!cdnBase) return path;

  // Normalize CDN base URL to remove trailing slash
  const normalizedCdnBase = normalizeBaseUrl(cdnBase);

  // Normalize path to ensure it starts with /
  let normalizedPath = path;
  if (normalizedPath.startsWith('./')) {
    normalizedPath = normalizedPath.substring(1); // ./assets -> /assets
  } else if (!normalizedPath.startsWith('/')) {
    normalizedPath = '/' + normalizedPath; // assets -> /assets
  }

  return normalizedCdnBase + normalizedPath;
}

/**
 * Returns the app base path for router configuration
 *
 * In local development: returns '/'
 * In production: returns the deployed app path from meta tag
 *
 * @returns The app base path
 *
 * @example
 * ```tsx
 * import { getAppBase } from '@uipath/uipath-typescript';
 * import { BrowserRouter } from 'react-router-dom';
 *
 * function App() {
 *   return (
 *     <BrowserRouter basename={getAppBase()}>
 *       {/* routes *\/}
 *     </BrowserRouter>
 *   );
 * }
 * ```
 */
export function getAppBase(): string {
  return getMetaTagContent(UiPathMetaTags.APP_BASE) || '/';
}
