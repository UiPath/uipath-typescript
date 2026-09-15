import { ErrorFactory } from '../errors/error-factory';
import { errorResponseParser } from '../errors/parser';
import { CONTENT_TYPES } from '../../utils/constants/headers';

/** The Apps service is mounted per sub-tenant and environment; both are `default` for coded apps. */
const APPS_INTEGRATION_BASE = 'apps_/default/api/v1/default/integrations/codedapp';

/** Identifies the app to the Apps service. Unguessable, minted once at deploy, injected as a meta tag. */
const APP_KEY_HEADER = 'X-UiPath-App-Key';

export interface PublicAppOperationRequest {
  /** The declared resource the call targets, as `{type, key}` from the app's bindings. */
  resource?: { type: string; key: string };
  /** The runtime resource being read, e.g. a job key. Checked against what this session created. */
  resourceId?: string;
  /** The downstream request body, forwarded as sent apart from the fields the server owns. */
  payload?: unknown;
  /** Query parameters for the downstream call, forwarded as sent. */
  query?: Record<string, unknown>;
}

/**
 * HTTP client for **public (anonymous) coded apps**.
 *
 * In public mode the browser holds no token — the visitor is identified only by an
 * opaque, HttpOnly session cookie, and the app's own identity is minted server-side
 * by the Apps service. So this client is deliberately separate from {@link ApiClient}
 * (which always attaches a PKCE Bearer): it sends `credentials: 'include'` and never an
 * Authorization header.
 *
 * It is a transport only. Every call goes to one endpoint, naming an operation the Apps service defines; request and
 * response bodies are the same ones the direct path uses, so callers keep one shape in both modes.
 *
 *   `{baseUrl}/{orgName}/apps_/default/api/v1/default/integrations/codedapp/invoke`
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
    const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    this.integrationBase = `${base}/${orgName}/${APPS_INTEGRATION_BASE}`;
    this.appKey = appKey;
  }

  /**
   * Runs one operation the Apps service defines, and returns the downstream response as sent.
   *
   * The caller names the operation; it never describes one. Which downstream is called, what is fenced and how
   * ownership applies are decided server-side, so a browser cannot widen its own access.
   */
  async invoke(operation: string, request: PublicAppOperationRequest = {}): Promise<unknown> {
    return this.send('/invoke', { operation, ...request });
  }

  /**
   * Bootstraps the anonymous session. Idempotent and single-flight: the service
   * responds 204 with a `Set-Cookie`. A non-2xx here is terminal (the app is not
   * public/open, or the feature is off) and surfaces as an error.
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

  private async send(subPath: string, body: unknown): Promise<unknown> {
    const doFetch = () =>
      fetch(`${this.integrationBase}${subPath}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': CONTENT_TYPES.JSON, [APP_KEY_HEADER]: this.appKey },
        body: JSON.stringify(body),
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
