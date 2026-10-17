/**
 * UiPath meta tag names for runtime configuration.
 *
 * These meta tags are injected at deployment time by the Apps Service
 * to configure SDK authentication and asset resolution in production.
 */
export enum UiPathMetaTags {
  // SDK/OAuth configuration
  CLIENT_ID = 'uipath:client-id',
  SCOPE = 'uipath:scope',
  ORG_NAME = 'uipath:org-name',
  ORG_ID = 'uipath:org-id',
  TENANT_NAME = 'uipath:tenant-name',
  BASE_URL = 'uipath:base-url',
  REDIRECT_URI = 'uipath:redirect-uri',

  // Asset resolution and routing
  CDN_BASE = 'uipath:cdn-base',
  APP_BASE = 'uipath:app-base',

  // Folder context (injected during coded-app deployment)
  FOLDER_KEY = 'uipath:folder-key',

  // Debug session (injected by Studio Web when it stages a debug bundle)
  DEBUG_SOURCE = 'uipath:debug-source',
}

/** Query parameter a Studio Web debug page carries with the job key of its debug session. */
export const DEBUG_JOB_KEY_QUERY_PARAM = 'jobKey';

/**
 * Ids of page elements carrying runtime configuration
 *
 * Injected at deployment time, same producers as {@link UiPathMetaTags}.
 */
export enum UiPathElementIds {
  /** `<script type="application/json">` holding this app's resource overrides. */
  RESOURCE_OVERRIDES = 'uipath-overrides',
}
