// Runtime config. In a deployed coded app (and in local dev via
// @uipath/coded-apps-dev) the platform injects <meta name="uipath:*"> tags for
// org/tenant/baseUrl; the SDK reads them itself when you call `new UiPath()`.
// The app reads the same tags for Action Center URL construction, with a
// `.env` (VITE_UIPATH_*) fallback for flexibility.

function meta(name: string): string {
  if (typeof document === 'undefined') return '';
  return document.querySelector(`meta[name="${name}"]`)?.getAttribute('content')?.trim() ?? '';
}

function envVar(key: string): string {
  return ((import.meta.env[key] as string | undefined) ?? '').trim();
}

export const ENV = {
  orgName: meta('uipath:org-name') || envVar('VITE_UIPATH_ORG_NAME'),
  tenantName: meta('uipath:tenant-name') || envVar('VITE_UIPATH_TENANT_NAME'),
  baseUrl: meta('uipath:base-url') || envVar('VITE_UIPATH_BASE_URL'),
  /** Space-separated OAuth scopes (for display). */
  scope: meta('uipath:scope') || envVar('VITE_UIPATH_SCOPE'),
};
