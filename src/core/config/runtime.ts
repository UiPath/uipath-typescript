import { PartialUiPathConfig } from './sdk-config';
import { UiPathMetaTags } from '../../utils/runtime/constants';
import { isBrowser } from '../../utils/platform';

/**
 * Meta-tag-derived config. Extends {@link PartialUiPathConfig} with
 * `folderKey`, sourced from `<meta name="uipath:folder-key">` (the
 * configuration object has no such field; a coded function's context is the
 * other source).
 */
export type MetaTagConfig = PartialUiPathConfig & { folderKey?: string };

/**
 * Get the content of a meta tag by name.
 * Returns undefined if not in browser environment or meta tag is not found.
 */
export function getMetaTagContent(name: string): string | undefined {
  if (!isBrowser) return undefined;
  return document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)?.content;
}

/**
 * The token IP restriction lets a trusted public app through on, built the way low-code public apps build it:
 * base64 of the app's folder key, tenant id and system name, GUIDs lowercase as the IP check stores them.
 * The system name is the `uipath:cdn-base` path segment before the folder key (`…/{appSystemName}/{folderKey}/{version}`).
 */
function appUniqueTokenFromMetaTags(): string | undefined {
  const folderKey = getMetaTagContent(UiPathMetaTags.FOLDER_KEY)?.toLowerCase();
  const tenantId = getMetaTagContent(UiPathMetaTags.TENANT_ID)?.toLowerCase();
  const segments = getMetaTagContent(UiPathMetaTags.CDN_BASE)?.split('/') ?? [];
  const appSystemName = segments[segments.findIndex(segment => segment.toLowerCase() === folderKey) - 1];
  if (!folderKey || !tenantId || !appSystemName) return undefined;
  return btoa(JSON.stringify({ folderId: folderKey, tenantId, appSystemName }));
}

/**
 * Load configuration from HTML meta tags injected at runtime.
 * These meta tags are injected by @uipath/coded-apps during build
 * or by the Apps service during deployment.
 *
 * Returns partial config with values found, or null if no meta tags present.
 */
export function loadFromMetaTags(): MetaTagConfig | null {
  if (!isBrowser) return null;

  const config: MetaTagConfig = {
    clientId: getMetaTagContent(UiPathMetaTags.CLIENT_ID),
    scope: getMetaTagContent(UiPathMetaTags.SCOPE),
    orgName: getMetaTagContent(UiPathMetaTags.ORG_NAME),
    organizationId: getMetaTagContent(UiPathMetaTags.ORG_ID),
    tenantName: getMetaTagContent(UiPathMetaTags.TENANT_NAME),
    baseUrl: getMetaTagContent(UiPathMetaTags.BASE_URL),
    redirectUri: getMetaTagContent(UiPathMetaTags.REDIRECT_URI),
    folderKey: getMetaTagContent(UiPathMetaTags.FOLDER_KEY),
    appKey: getMetaTagContent(UiPathMetaTags.APP_KEY),
  };
  if (config.appKey) {
    config.appUniqueToken = appUniqueTokenFromMetaTags();
  }

  const hasAnyValue = Object.values(config).some(Boolean);
  return hasAnyValue ? config : null;
}
