/**
 * Resolves the organization (partition) GUID that some platform APIs key on.
 *
 * UiPath APIs are addressed by organization *name* in the URL, but the Identity and
 * Authorization services additionally require the organization GUID as a route or body
 * value. Rather than asking callers for it, the SDK derives it once per instance:
 *
 * 1. `organizationId` supplied in the SDK configuration — directly, or through the
 *    `uipath:org-id` meta tag that coded-app deployments inject
 * 2. An `orgName` that is already a GUID (UiPath URLs accept the organization GUID in place of its name)
 * 3. The `prt_id` claim of a JWT access token (OAuth and client-credentials tokens)
 * 4. Identity's authorize redirect, which echoes the GUID for an organization name — the only
 *    route available to opaque personal access tokens. Node.js only: browsers cannot read a
 *    cross-origin redirect, but browser callers always resolve through step 1 or 3.
 *
 * @internal
 */

import type { UiPathConfig } from '../config/config';
import type { TokenManager } from '../auth/token-manager';
import { ValidationError } from '../errors';
import { decodeJwtClaims } from '../../utils/encoding/jwt';
import { decodeBase64 } from '../../utils/encoding/base64';
import { IDENTITY_ENDPOINTS } from '../../utils/constants/endpoints/identity';
import { TRACEPARENT, UIPATH_TRACEPARENT_ID } from '../../utils/constants/headers';
import { fetchWithRetry } from '../../utils/http/fetch-with-retry';
import { DEFAULT_RETRY_OPTIONS } from '../../utils/http/retry-policy';

const GUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DASH_REGEX = /-/g;
const UNDERSCORE_REGEX = /_/g;
const WHITESPACE_REGEX = /\s+/g;

/** Automation Cloud portal's public OAuth client — registered on every environment. Only used to trigger the redirect; no login is completed. */
export const ORGANIZATION_LOOKUP_CLIENT_ID = '1119a927-10ab-4543-bd1a-ad6bfbbc27f4';
/** The portal client's registered redirect URI, relative to the base URL. */
export const ORGANIZATION_LOOKUP_REDIRECT_PATH = 'portal_/api/tokenFactory/callback';
/** Identity sends unknown organizations here instead of to the login page. */
const UNREGISTERED_ORGANIZATION_PATH = '/portal_/unregistered';
/** Identity normalizes the requested `tenantName:<name>` into `tenant:<guid>` on the redirect. */
const TENANT_ACR_PREFIX = 'tenant:';
/** One hop for an API gateway bouncing to the Identity host, one for the login redirect, one spare. */
const MAX_REDIRECT_HOPS = 3;
/** Identity's error page carries a base64 JSON blob under this query param; simpler redirects use a plain code. */
const IDENTITY_ERROR_ID_PARAM = 'errorId';
const IDENTITY_ERROR_CODE_PARAM = 'errorCode';
const BODY_SNIPPET_LENGTH = 160;
const CONFIG_HINT = 'Set `organizationId` in the SDK configuration.';

interface IdentityErrorPayload {
  Data?: { Error?: unknown; ErrorDescription?: unknown };
}

interface OrganizationClaims {
  prt_id?: unknown;
}

/** Whether a redirect target is itself an authorize request (an API gateway bouncing to the Identity host). */
function isAuthorizeRequest(url: URL): boolean {
  return url.pathname.endsWith(`/${IDENTITY_ENDPOINTS.AUTHORIZE}`);
}

function withoutQuery(url: string): string {
  const parsed = new URL(url);
  return `${parsed.origin}${parsed.pathname}`;
}

/** Reads the error Identity attached to a redirect: the decoded `errorId` blob, else a plain `errorCode`. */
function readIdentityError(url: URL): string | undefined {
  const errorId = url.searchParams.get(IDENTITY_ERROR_ID_PARAM);
  if (errorId) {
    try {
      const base64 = errorId.replace(DASH_REGEX, '+').replace(UNDERSCORE_REGEX, '/');
      const json = decodeBase64(base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '='));
      const data = (JSON.parse(json) as IdentityErrorPayload).Data;
      const error = typeof data?.Error === 'string' ? data.Error : undefined;
      const description = typeof data?.ErrorDescription === 'string' ? data.ErrorDescription : undefined;
      if (error) {
        return description ? `${error} (${description})` : error;
      }
    } catch {
      return url.searchParams.get(IDENTITY_ERROR_CODE_PARAM) ?? undefined;
    }
  }
  return url.searchParams.get(IDENTITY_ERROR_CODE_PARAM) ?? undefined;
}

/** Status plus a short body excerpt, for the error raised when Identity does not redirect. */
async function describeResponse(response: Response): Promise<string> {
  const body = (await response.text().catch(() => '')).replace(WHITESPACE_REGEX, ' ').trim();
  return body ? `HTTP ${response.status}: ${body.slice(0, BODY_SNIPPET_LENGTH)}` : `HTTP ${response.status}`;
}

/** 64 hex chars — satisfies PKCE's 43–128 character rule without a base64url encoder. */
function randomUrlSafeToken(): string {
  return `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(DASH_REGEX, '');
}

/** Mirrors the distributed-tracing headers `ApiClient` adds; this request bypasses it. */
function tracingHeaders(): Record<string, string> {
  const traceId = crypto.randomUUID().replace(DASH_REGEX, '');
  const spanId = crypto.randomUUID().replace(DASH_REGEX, '').slice(0, 16);
  const traceparent = `00-${traceId}-${spanId}-01`;
  return { [TRACEPARENT]: traceparent, [UIPATH_TRACEPARENT_ID]: traceparent };
}

function buildAuthorizeUrl(baseUrl: string, orgName: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: ORGANIZATION_LOOKUP_CLIENT_ID,
    redirect_uri: `${baseUrl}/${ORGANIZATION_LOOKUP_REDIRECT_PATH}`,
    scope: 'openid',
    code_challenge: randomUrlSafeToken(),
    code_challenge_method: 'S256',
    state: randomUrlSafeToken(),
    acr_values: `tenantName:${orgName}`,
  });
  return `${baseUrl}/${IDENTITY_ENDPOINTS.AUTHORIZE}?${params.toString()}`;
}

/**
 * Reads the organization GUID out of an authorize redirect. The GUID rides inside the
 * login page's `returnUrl` (the authorize callback Identity resumes after login); the
 * outer query is checked too in case Identity ever flattens it.
 */
function extractOrganizationId(location: URL): string | undefined {
  const acrValues = [location.searchParams.get('acr_values')];
  const returnUrl = location.searchParams.get('returnUrl');
  if (returnUrl) {
    acrValues.push(new URL(returnUrl, location.origin).searchParams.get('acr_values'));
  }

  for (const acr of acrValues) {
    for (const token of acr?.split(' ') ?? []) {
      if (token.startsWith(TENANT_ACR_PREFIX)) {
        const candidate = token.slice(TENANT_ACR_PREFIX.length);
        if (GUID_REGEX.test(candidate)) {
          return candidate;
        }
      }
    }
  }
  return undefined;
}

/**
 * Looks up an organization's GUID from its name using Identity's authorize redirect.
 *
 * The path for personal access tokens: they are opaque, so unlike a JWT they carry no
 * organization claim to read. Starts an OAuth authorization request with
 * `acr_values=tenantName:<orgName>` and reads the redirect it produces instead of following
 * it. No token is sent and no login is completed — Identity resolves the name while
 * preparing the login page.
 *
 * @param baseUrl - Normalized SDK base URL (no trailing slash)
 * @param orgName - Organization logical name
 * @returns The organization GUID
 */
export async function lookupOrganizationIdForPat(baseUrl: string, orgName: string): Promise<string> {
  let url = buildAuthorizeUrl(baseUrl, orgName);

  for (let hop = 0; hop < MAX_REDIRECT_HOPS; hop++) {
    const response = await fetchWithRetry(
      url,
      { redirect: 'manual', headers: tracingHeaders() },
      { retry: DEFAULT_RETRY_OPTIONS }
    );
    const location = response.headers.get('location');
    if (!location) {
      // Browsers expose redirects as opaque responses; non-redirects carry no Location
      throw new ValidationError({
        message:
          `Could not resolve the organization id for '${orgName}': Identity answered ` +
          `${await describeResponse(response)} instead of redirecting. ${CONFIG_HINT}`,
      });
    }

    const target = new URL(location, url);
    const organizationId = extractOrganizationId(target);
    if (organizationId) {
      return organizationId;
    }
    if (target.pathname.startsWith(UNREGISTERED_ORGANIZATION_PATH)) {
      throw new ValidationError({ message: `Organization '${orgName}' was not found at ${baseUrl}.` });
    }
    const identityError = readIdentityError(target);
    if (identityError) {
      throw new ValidationError({
        message:
          `Could not resolve the organization id for '${orgName}': Identity rejected the lookup ` +
          `with ${identityError}. ${CONFIG_HINT}`,
      });
    }
    // An API gateway bounced us to the Identity host: rebuild the request there so the redirect
    // URI matches the portal client's registration on that host, rather than following as-is.
    url = isAuthorizeRequest(target) ? buildAuthorizeUrl(target.origin, orgName) : target.toString();
  }

  throw new ValidationError({
    message:
      `Could not resolve the organization id for '${orgName}': gave up after ${MAX_REDIRECT_HOPS} ` +
      `redirects (last: ${withoutQuery(url)}). ${CONFIG_HINT}`,
  });
}

/**
 * Per-SDK-instance organization GUID resolution with a shared, memoized result.
 * @internal
 */
export class OrganizationIdResolver {
  #organizationId?: Promise<string>;

  constructor(
    private readonly config: UiPathConfig,
    private readonly tokenManager: TokenManager
  ) {}

  /**
   * Resolves the organization GUID, once per SDK instance. A failed attempt is not
   * cached so a transient network error can be retried on the next call.
   */
  resolve(): Promise<string> {
    if (!this.#organizationId) {
      this.#organizationId = this.#resolve().catch((error: unknown) => {
        this.#organizationId = undefined;
        throw error;
      });
    }
    return this.#organizationId;
  }

  async #resolve(): Promise<string> {
    const { organizationId, orgName, baseUrl } = this.config;
    if (organizationId) {
      return organizationId;
    }
    if (GUID_REGEX.test(orgName)) {
      return orgName;
    }

    const claimed = decodeJwtClaims<OrganizationClaims>(this.tokenManager.getToken())?.prt_id;
    if (typeof claimed === 'string' && GUID_REGEX.test(claimed)) {
      return claimed;
    }

    return lookupOrganizationIdForPat(baseUrl, orgName);
  }
}
