import { PartialUiPathConfig } from './sdk-config';
import { UIPATH_META_TAGS } from './constants';

/**
 * Load configuration from HTML meta tags injected at runtime.
 * These meta tags are injected by @uipath/uipath-config during build
 * or by the Apps service during deployment.
 *
 * Returns partial config with values found, or null if no meta tags present.
 */
export function loadFromMetaTags(): PartialUiPathConfig | null {
  if (typeof document === 'undefined') return null;

  const getMetaContent = (name: string) =>
    document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)?.content;

  const config: Record<string, string | undefined> = {};
  for (const [key, metaName] of Object.entries(UIPATH_META_TAGS)) {
    config[key] = getMetaContent(metaName);
  }

  // Return null if no meta tags found
  return Object.values(config).some(v => v !== undefined) ? config as PartialUiPathConfig : null;
}
