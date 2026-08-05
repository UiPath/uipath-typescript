import { ErrorFactory } from '../errors/error-factory';
import { errorResponseParser } from '../errors/parser';
import { CONTENT_TYPES } from '../../utils/constants/headers';

/**
 * HTTP client for **public (anonymous) coded apps**.
 *
 * In public mode the browser holds no token — the visitor is identified only by an
 * opaque, HttpOnly session cookie, and the app's own identity is minted server-side
 * by the Apps gateway. So this client is deliberately separate from {@link ApiClient}
 * (which always attaches a PKCE Bearer): it sends `credentials: 'include'`, never an
 * Authorization header, and talks to the gateway's REST surface rather than raw OData.
 *
 * All requests are same-origin, routed by the edge to the Apps service:
 *   `{baseUrl}/{orgName}/apps_/integrations/codedapp/{appId}/...`
 *
 * Session lifecycle: the first call may 401 (no cookie yet, or the Redis session
 * expired/was evicted). On a 401 the client bootstraps a session via `POST /session`
 * (which Set-Cookies) and retries the original request once. Bootstrap is single-flight
 * so concurrent calls share one `/session` round-trip.
 */
export class PublicAppClient {
  private readonly gatewayBase: string;
  // In-flight session bootstrap, shared so N concurrent 401s trigger one /session call.
  private sessionBootstrap: Promise<void> | null = null;

  constructor(baseUrl: string, orgName: string, appId: string) {
    const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    this.gatewayBase = `${base}/${orgName}/apps_/integrations/codedapp/${appId}`;
  }

  /** Starts a process and returns the created job. The gateway records it in this session's owned-set. */
  async startProcess(processKey: string, inputArguments?: unknown): Promise<unknown> {
    return this.request('POST', `/orchestrator/processes/${encodeURIComponent(processKey)}/jobs`, { inputArguments });
  }

  /** Reads a job's output. Returns 404 (→ error) if this session doesn't own the job. */
  async getJobOutput(jobId: string): Promise<unknown> {
    return this.request('GET', `/orchestrator/jobs/${encodeURIComponent(jobId)}/output`);
  }

  /**
   * Bootstraps the anonymous session. Idempotent and single-flight: the gateway
   * responds 204 with a `Set-Cookie`. A non-2xx here is terminal (the app is not
   * public/open, or the feature is off) and surfaces as an error.
   */
  private async ensureSession(): Promise<void> {
    if (!this.sessionBootstrap) {
      this.sessionBootstrap = (async () => {
        const response = await fetch(`${this.gatewayBase}/session`, {
          method: 'POST',
          credentials: 'include',
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
      fetch(`${this.gatewayBase}${subPath}`, {
        method,
        credentials: 'include',
        headers: body === undefined ? undefined : { 'Content-Type': CONTENT_TYPES.JSON },
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
