import { describe, it, expect } from 'vitest';
import { encodeUrlInputs, looksLikeUrl } from '@/services/integration-service/execution/url-input';
import { encodeBase64 } from '@/utils/encoding/base64';
import { IS_TEST_CONSTANTS } from '@tests/utils/constants/integration-service';

const URL_VALUE = IS_TEST_CONSTANTS.VENDOR_URL;

describe('looksLikeUrl', () => {
  it.each([
    [URL_VALUE, true],
    ['http://example.com/a', true],
    [encodeURIComponent(URL_VALUE), true],
    ['mailto:someone@example.com', false],
    ['ftp://example.com/file', false],
    ['01ABCDEF', false],
    ['%E0%A4%A', false],
    ['', false],
  ])('classifies %s as %s', (value, expected) => {
    expect(looksLikeUrl(value)).toBe(expected);
  });
});

describe('encodeUrlInputs', () => {
  it('returns the same query when no field is listed', () => {
    const query = { referenceID: URL_VALUE };

    expect(encodeUrlInputs(query, undefined)).toBe(query);
    expect(encodeUrlInputs(query, [])).toBe(query);
    expect(encodeUrlInputs(undefined, ['referenceID'])).toBeUndefined();
  });

  it('encodes a listed field whose value is a URL and leaves the input untouched', () => {
    const query = { referenceID: URL_VALUE, limit: '10' };

    const result = encodeUrlInputs(query, ['referenceID']);

    expect(result).toEqual({ referenceID: encodeBase64(URL_VALUE), limit: '10' });
    expect(query.referenceID).toBe(URL_VALUE);
  });

  it('matches field names without regard to case and ignores a trailing array marker', () => {
    const result = encodeUrlInputs({ ReferenceID: URL_VALUE }, ['referenceid[*]']);

    expect(result).toEqual({ ReferenceID: encodeBase64(URL_VALUE) });
  });

  it('leaves a listed field whose value is not a URL', () => {
    const query = { referenceID: '01ABCDEF' };

    expect(encodeUrlInputs(query, ['referenceID'])).toBe(query);
  });

  it('leaves a URL in a field that is not listed', () => {
    const query = { other: URL_VALUE };

    expect(encodeUrlInputs(query, ['referenceID'])).toBe(query);
  });

  it('never encodes a paging parameter', () => {
    const query = { nextPage: URL_VALUE, pageSize: URL_VALUE };

    expect(encodeUrlInputs(query, ['nextPage', 'pageSize'])).toBe(query);
  });
});
