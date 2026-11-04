// Runtime settings for the gallery. The platform settings come from the same `<meta name="uipath:*">`
// tags the SDK reads; the two POC settings come from Vite env.

function meta(name: string): string | undefined {
  return document.querySelector<HTMLMetaElement>(`meta[name="uipath:${name}"]`)?.content || undefined;
}

/** Where the backend listens (GET /templates, POST /copies) (local `bun run server.ts` or `uip function serve`). */
export const COPIES_API = (import.meta.env.VITE_COPIES_API as string | undefined)?.replace(/\/+$/, '') ?? 'http://localhost:7070';

export const platform = {
  orgName: meta('org-name') ?? '',
  tenantName: meta('tenant-name') ?? '',
  baseUrl: meta('base-url') ?? '',
};


/** Host of deployed coded apps for a base URL: api.uipath.com -> uipath.host, alpha.api.uipath.com -> alpha.uipath.host, staging... -> staging.uipath.host. */
export function appsHostSuffix(baseUrl: string): string {
  try {
    const host = new URL(baseUrl).host;
    if (host === 'api.uipath.com' || host === 'cloud.uipath.com') return 'uipath.host';
    const m = host.match(/^([a-z]+)\.(?:api\.)?uipath\.com$/);
    return m ? `${m[1]}.uipath.host` : host;
  } catch {
    return 'uipath.host';
  }
}

/** URL a deployment is served at: https://{org}.{suffix}/{routingName}/ */
export function deployedAppUrl(routingName: string): string {
  return `https://${platform.orgName}.${appsHostSuffix(platform.baseUrl)}/${routingName}/`;
}
