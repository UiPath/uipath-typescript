/**
 * UiPath meta tag names for runtime configuration.
 *
 * These meta tags are injected at deployment time by the Apps Service
 * to configure SDK authentication and asset resolution in production.
 */
export enum UiPathMetaTags {
  // SDK/OAuth configuration
  CLIENT_ID = 'uipath:client-id',
  ORG_NAME = 'uipath:org-name',
  TENANT_NAME = 'uipath:tenant-name',
  BASE_URL = 'uipath:base-url',
}
