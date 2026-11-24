import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  HAS_MORE_HEADER,
  NEXT_PAGE_TOKEN_HEADER,
  extractPage,
  resolveMaxRecords,
  stripPaginationHeaders,
} from '@/services/integration-service/execution/pagination';
import { ValidationError } from '@/core/errors';
import { IS_TEST_CONSTANTS } from '@tests/utils/constants/integration-service';

const METHOD = 'execute';
const RECORDS = [{ id: 1 }, { id: 2 }];

const pagingHeaders = (hasMore: string, token: string): Record<string, string> => ({
  'content-type': 'application/json',
  [HAS_MORE_HEADER]: hasMore,
  [NEXT_PAGE_TOKEN_HEADER]: token,
});

describe('resolveMaxRecords', () => {
  it('returns undefined when the option is not supplied', () => {
    expect(resolveMaxRecords(undefined, METHOD)).toBeUndefined();
  });

  it('returns Infinity for -1', () => {
    expect(resolveMaxRecords(-1, METHOD)).toBe(Infinity);
  });

  it('returns a positive integer unchanged', () => {
    expect(resolveMaxRecords(250, METHOD)).toBe(250);
  });

  it.each([0, -2, 1.5, Number.NaN, Infinity])('throws ValidationError for %s', (value) => {
    expect(() => resolveMaxRecords(value, METHOD)).toThrow(ValidationError);
  });
});

describe('extractPage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the paging state when the connector has more records', () => {
    const page = extractPage(pagingHeaders('true', IS_TEST_CONSTANTS.PAGE_TOKEN), RECORDS);

    expect(page).toEqual({ hasMore: true, nextPageToken: IS_TEST_CONSTANTS.PAGE_TOKEN });
  });

  it('reads the has-more flag whatever its case', () => {
    const page = extractPage(pagingHeaders('TRUE', IS_TEST_CONSTANTS.PAGE_TOKEN), RECORDS);

    expect(page?.hasMore).toBe(true);
  });

  it('returns undefined when the flag is not true, even with a token', () => {
    expect(extractPage(pagingHeaders('false', IS_TEST_CONSTANTS.PAGE_TOKEN), RECORDS)).toBeUndefined();
  });

  it('returns undefined when the has-more header is missing', () => {
    const headers = { [NEXT_PAGE_TOKEN_HEADER]: IS_TEST_CONSTANTS.PAGE_TOKEN };

    expect(extractPage(headers, RECORDS)).toBeUndefined();
  });

  it('returns undefined when the token header is missing', () => {
    expect(extractPage({ [HAS_MORE_HEADER]: 'true' }, RECORDS)).toBeUndefined();
  });

  it('returns undefined when the body is not a list', () => {
    const headers = pagingHeaders('true', IS_TEST_CONSTANTS.PAGE_TOKEN);

    expect(extractPage(headers, { id: 1 })).toBeUndefined();
  });

  it('returns undefined when the token marks the end of the list', () => {
    const headers = pagingHeaders('true', IS_TEST_CONSTANTS.PAGE_TOKEN_DONE);

    expect(extractPage(headers, RECORDS)).toBeUndefined();
  });

  it('keeps a token it cannot decode and warns once however many pages carry one', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.resetModules();
    const fresh = await import('@/services/integration-service/execution/pagination');
    const headers = pagingHeaders('true', IS_TEST_CONSTANTS.PAGE_TOKEN_OPAQUE);

    const page = fresh.extractPage(headers, RECORDS);
    fresh.extractPage(headers, RECORDS);

    expect(page).toEqual({ hasMore: true, nextPageToken: IS_TEST_CONSTANTS.PAGE_TOKEN_OPAQUE });
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('keeps a token whose JSON is not an object', () => {
    const token = Buffer.from(JSON.stringify('2')).toString('base64url');

    expect(extractPage(pagingHeaders('true', token), RECORDS)?.nextPageToken).toBe(token);
  });
});

describe('stripPaginationHeaders', () => {
  it('removes the paging headers and keeps the rest', () => {
    const headers = pagingHeaders('true', IS_TEST_CONSTANTS.PAGE_TOKEN);

    expect(stripPaginationHeaders(headers)).toEqual({ 'content-type': 'application/json' });
  });

  it('does not change the headers it was given', () => {
    const headers = pagingHeaders('true', IS_TEST_CONSTANTS.PAGE_TOKEN);

    stripPaginationHeaders(headers);

    expect(headers[HAS_MORE_HEADER]).toBe('true');
  });
});
