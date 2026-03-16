import { PartialUiPathConfig } from './sdk-config';
import { UiPathMetaTags } from '../../utils/runtime/constants';
import { isBrowser } from '../../utils/platform';

/**
 * Get the content of a meta tag by name.
 * Returns undefined if not in browser environment or meta tag is not found.
 */
export function getMetaTagContent(name: string): string | undefined {
  if (!isBrowser) return undefined;
  return document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)?.content;
}

/**
 * Load configuration from HTML meta tags injected at runtime.
 * These meta tags are injected by @uipath/coded-apps during build
 * or by the Apps service during deployment.
 *
 * Returns partial config with values found, or null if no meta tags present.
 */
export function loadFromMetaTags(): PartialUiPathConfig | null {
  if (!isBrowser) return null;

  const config: PartialUiPathConfig = {
    clientId: getMetaTagContent(UiPathMetaTags.CLIENT_ID),
    scope: getMetaTagContent(UiPathMetaTags.SCOPE),
    orgName: getMetaTagContent(UiPathMetaTags.ORG_NAME),
    tenantName: getMetaTagContent(UiPathMetaTags.TENANT_NAME),
    baseUrl: getMetaTagContent(UiPathMetaTags.BASE_URL),
    redirectUri: getMetaTagContent(UiPathMetaTags.REDIRECT_URI),
  };

  const hasAnyValue = Object.values(config).some(Boolean);
  return hasAnyValue ? config : null;
}
