/**
 * Constants for UiPath Coded Apps runtime configuration
 *
 * These meta tags are injected at deployment time by the Apps Service
 * to configure how the app resolves assets and routes in production.
 */

/**
 * Meta tag names for runtime asset resolution
 *
 * These are separate from SDK OAuth config meta tags (uipath:client-id, etc.)
 * and are specifically used for CDN asset resolution and app routing.
 */
export const RUNTIME_META_TAGS = {
  /**
   * CDN base URL for static assets
   * Example: https://cdn.uipath.com/appId/folderKey
   */
  cdnBase: 'uipath:cdn-base',

  /**
   * App base path for router configuration
   * Example: /org/apps_/default/run/env/tenant/folder/appId/public
   */
  appBase: 'uipath:app-base',
} as const;

export type RuntimeMetaTagKey = keyof typeof RUNTIME_META_TAGS;
