import { ErrorFactory } from '../errors/error-factory';
import { errorResponseParser } from '../errors/parser';
import { CONTENT_TYPES } from '../../utils/constants/headers';

/** The Apps service is mounted per sub-tenant and environment; both are `default` for coded apps. */
const APPS_INTEGRATION_BASE = 'apps_/default/api/v1/default/integrations/codedapp';

/** Identifies the app to the Apps service. Unguessable, minted once at deploy, injected as a meta tag. */
const APP_KEY_HEADER = 'X-UiPath-App-Key';

/**
 * `uipath:base-url` is the API host, which drops Origin and answers `*` for CORS, so it can't carry a session cookie.
 * Public calls go to the Apps origin behind it instead (the routes in apps-dev-tools ApiCorsWorker's wrangler.jsonc).
 */
const API_HOST_TO_APPS_HOST: Record<string, string> = {
  'alpha.api.uipath.com': 'alpha.uipath.com',
  'staging.api.uipath.com': 'staging.uipath.com',
  'api.uipath.com': 'cloud.uipath.com',
};

/** The Apps origin for a base URL; a base URL that isn't an API host is used as-is. */
export function toAppsBaseUrl(baseUrl: string): string {
  const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const url = new URL(base);
  const appsHost = API_HOST_TO_APPS_HOST[url.hostname];
  return appsHost ? `${url.protocol}//${appsHost}` : base;
}

/**
 * HTTP client for **public (anonymous) coded apps**.
 *
 * In public mode the browser holds no token — the visitor is identified only by an
 * opaque, HttpOnly session cookie, and the app's own identity is minted server-side
 * by the Apps service. So this client is deliberately separate from {@link ApiClient}
 * (which always attaches a PKCE Bearer): it sends `credentials: 'include'`, never an
 * Authorization header, and names the app with a header rather than a path segment.
 *
 *   `{appsBaseUrl}/{orgName}/apps_/default/api/v1/default/integrations/codedapp/...`
 *
 * Session lifecycle: the first call may 401 (no cookie yet, or the session
 * expired/was evicted). On a 401 the client bootstraps a session via `POST /session`
 * (which Set-Cookies) and retries the original request once. Bootstrap is single-flight
 * so concurrent calls share one `/session` round-trip.
 */
export class PublicAppClient {
  private readonly integrationBase: string;
  private readonly appKey: string;
  // In-flight session bootstrap, shared so N concurrent 401s trigger one /session call.
  private sessionBootstrap: Promise<void> | null = null;

  constructor(baseUrl: string, orgName: string, appKey: string) {
    this.integrationBase = `${toAppsBaseUrl(baseUrl)}/${orgName}/${APPS_INTEGRATION_BASE}`;
    this.appKey = appKey;
  }

  /**
   * Starts a job and returns Orchestrator's StartJobs response as sent. The server fences the process against the
   * app's bindings, sets the release and folder from the binding, and records the new job against this session.
   */
  async startProcess(processKey: string, inputArguments?: unknown): Promise<unknown> {
    return this.request('POST', `/orchestrator/processes/${encodeURIComponent(processKey)}/jobs`, { inputArguments });
  }

  /**
   * Reads a job, returning Orchestrator's response as sent. 404 (→ error) when this session did not start the job
   * and the job's process is not one the app declared as shared.
   */
  async getJob(jobKey: string): Promise<unknown> {
    return this.request('GET', `/orchestrator/jobs/${encodeURIComponent(jobKey)}/output`);
  }

  /**
   * Bootstraps the anonymous session. Idempotent and single-flight: the service
   * responds 204 with a `Set-Cookie`. A non-2xx here is terminal (the app is not
   * public, or the feature is off) and surfaces as an error.
   */
  private async ensureSession(): Promise<void> {
    if (!this.sessionBootstrap) {
      this.sessionBootstrap = (async () => {
        const response = await fetch(`${this.integrationBase}/session`, {
          method: 'POST',
          credentials: 'include',
          headers: { [APP_KEY_HEADER]: this.appKey },
        });
        if (!response.ok) {
          const errorInfo = await errorResponseParser.parse(response);
          throw ErrorFactory.createFromHttpStatus(response.status, errorInfo);
        }
      })();
      // Clear on settle so a later expiry can bootstrap again.
      this.sessionBootstrap.catch(() => undefined).finally(() => {
        this.sessionBootstrap = null;
      });
    }
    return this.sessionBootstrap;
  }

  private async request(method: string, subPath: string, body?: unknown): Promise<unknown> {
    const doFetch = () =>
      fetch(`${this.integrationBase}${subPath}`, {
        method,
        credentials: 'include',
        headers: {
          [APP_KEY_HEADER]: this.appKey,
          ...(body === undefined ? {} : { 'Content-Type': CONTENT_TYPES.JSON }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });

    let response: Response;
    try {
      response = await doFetch();
      // No session yet, or it expired/was revoked — bootstrap once and retry.
      if (response.status === 401) {
        await this.ensureSession();
        response = await doFetch();
      }
    } catch (error) {
      throw ErrorFactory.createNetworkError(error);
    }

    if (!response.ok) {
      const errorInfo = await errorResponseParser.parse(response);
      throw ErrorFactory.createFromHttpStatus(response.status, errorInfo);
    }
    if (response.status === 204) {
      return undefined;
    }
    const text = await response.text();
    return text ? JSON.parse(text) : undefined;
  }
}
