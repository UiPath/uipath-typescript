import { PartialUiPathConfig } from './ts-sdk-config';
import { UiPathMetaTags } from './runtime-constants';

/**
 * Get the content of a meta tag by name.
 * Returns undefined if not in browser environment or meta tag is not found.
 */
export function getMetaTagContent(name: string): string | undefined {
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
  const config: PartialUiPathConfig = {
    clientId: getMetaTagContent(UiPathMetaTags.CLIENT_ID),
    orgName: getMetaTagContent(UiPathMetaTags.ORG_NAME),
    tenantName: getMetaTagContent(UiPathMetaTags.TENANT_NAME),
    baseUrl: getMetaTagContent(UiPathMetaTags.BASE_URL),
  };

  const hasAnyValue = Object.values(config).some(Boolean);
  return hasAnyValue ? config : null;
}
