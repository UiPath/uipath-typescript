import { ValidationError } from '@/core/errors';
import { decodeBase64Url } from '@/utils/encoding/base64';
import type { ExecutePage } from '@/models/integration-service/execution.types';

/** Response header telling whether the connector has more records. */
export const HAS_MORE_HEADER = 'elements-has-more';
/** Response header carrying the token for the next page. */
export const NEXT_PAGE_TOKEN_HEADER = 'elements-next-page-token';
/** Query parameter that requests the page a token points to. */
export const NEXT_PAGE_PARAM = 'nextPage';

/** `maxRecords` value that asks for every record. */
const ALL_RECORDS = -1;
/** Marker a connector puts in its page token once the list is exhausted. */
const PROVIDER_DONE = 'DONE';

/**
 * Turns the caller's `maxRecords` into the record limit to page up to.
 *
 * @param maxRecords - The option as supplied by the caller
 * @param method - Name of the calling method, for the error message
 * @returns `undefined` when paging is off, `Infinity` for every record, otherwise the limit
 * @internal
 */
export function resolveMaxRecords(maxRecords: number | undefined, method: string): number | undefined {
  if (maxRecords === undefined) return undefined;
  if (maxRecords === ALL_RECORDS) return Infinity;
  if (!Number.isInteger(maxRecords) || maxRecords <= 0) {
    throw new ValidationError({ message: `maxRecords must be a positive integer or -1 for ${method}` });
  }
  return maxRecords;
}

/**
 * Reads the paging state of a list response.
 *
 * @param headers - Response headers with lowercase names
 * @param body - Parsed response body
 * @returns The paging state, or `undefined` when the response is not a paged list or the
 *   connector reported its last page
 * @internal
 */
export function extractPage(headers: Record<string, string>, body: unknown): ExecutePage | undefined {
  const hasMore = headers[HAS_MORE_HEADER];
  const nextPageToken = headers[NEXT_PAGE_TOKEN_HEADER];
  if (!hasMore || !nextPageToken || !Array.isArray(body)) return undefined;
  if (isTokenExhausted(nextPageToken)) return undefined;

  return { hasMore: hasMore.toLowerCase() === 'true', nextPageToken };
}

/**
 * Drops the paging headers, for a result whose pages were already gathered.
 *
 * @param headers - Response headers with lowercase names
 * @returns A copy of the headers without the paging ones
 * @internal
 */
export function stripPaginationHeaders(headers: Record<string, string>): Record<string, string> {
  const { [HAS_MORE_HEADER]: _hasMore, [NEXT_PAGE_TOKEN_HEADER]: _token, ...rest } = headers;
  return rest;
}

/** A page token is base64url JSON; the connector marks the end of the list inside it. */
function isTokenExhausted(token: string): boolean {
  try {
    const decoded: unknown = JSON.parse(decodeBase64Url(token));
    if (typeof decoded !== 'object' || decoded === null) return false;
    const providerNextPage = (decoded as Record<string, unknown>).providerNextPage;
    return typeof providerNextPage === 'string' && providerNextPage.toUpperCase() === PROVIDER_DONE;
  } catch (error) {
    // An unreadable token is still a usable token: only a decodable one can say the list is done.
    console.warn('execute: page token could not be decoded, treating it as a next page', error);
    return false;
  }
}
