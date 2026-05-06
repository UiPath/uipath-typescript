/**
 * Reads UiPath cloud context from HTML meta tags injected at runtime.
 *
 * Meta tags are emitted by `@uipath/uipath-typescript` consumers (Apps
 * service at deploy time, `@uipath/coded-apps-dev` plugin during local
 * dev). Mirrors the SDK's `src/core/config/runtime.ts` so Coded Action App SDK can
 * discover the same hosting context without taking a constructor arg.
 */

const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';

const META_TAG_NAMES = {
  CLIENT_ID: 'uipath:client-id',
  ORG_NAME: 'uipath:org-name',
  TENANT_NAME: 'uipath:tenant-name',
  BASE_URL: 'uipath:base-url',
} as const;

export interface MetaTagsConfig {
  clientId?: string;
  orgName?: string;
  tenantName?: string;
  baseUrl?: string;
}

function getMetaTagContent(name: string): string | undefined {
  if (!isBrowser) return undefined;
  return document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)?.content;
}

/**
 * Load cloud context from `<meta>` tags. Returns `null` when none of the
 * recognized tags are present (e.g. running outside the Action Center
 * iframe), so the caller can decide how to handle a missing context.
 */
export function loadFromMetaTags(): MetaTagsConfig | null {
  if (!isBrowser) return null;

  const config: MetaTagsConfig = {
    clientId: getMetaTagContent(META_TAG_NAMES.CLIENT_ID),
    orgName: getMetaTagContent(META_TAG_NAMES.ORG_NAME),
    tenantName: getMetaTagContent(META_TAG_NAMES.TENANT_NAME),
    baseUrl: getMetaTagContent(META_TAG_NAMES.BASE_URL),
  };

  const hasAnyValue = Object.values(config).some(Boolean);
  return hasAnyValue ? config : null;
}
