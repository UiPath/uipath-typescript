import { describe, it, expect } from 'vitest';
import { decodeBase64, decodeBase64ToBytes, decodeBase64Url, encodeBase64 } from '@/utils/encoding/base64';

// "ÿþ?" encodes to base64 with both characters the URL-safe alphabet replaces
const TEXT = '{"k":"ÿþ?>"}';

describe('decodeBase64Url', () => {
  it('decodes a URL-safe string without padding', () => {
    const base64Url = Buffer.from(TEXT).toString('base64url');

    expect(base64Url).not.toContain('=');
    expect(decodeBase64Url(base64Url)).toBe(TEXT);
  });

  it('decodes the - and _ characters of the URL-safe alphabet', () => {
    const standard = encodeBase64(TEXT);
    const base64Url = standard.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    expect(base64Url).not.toBe(standard);
    expect(decodeBase64Url(base64Url)).toBe(decodeBase64(standard));
  });

  it('decodes a string that is already padded', () => {
    expect(decodeBase64Url(encodeBase64('ab'))).toBe('ab');
  });
});

describe('decodeBase64ToBytes', () => {
  it('decodes content that is not text to its exact bytes', () => {
    const bytes = [0, 255, 13, 10, 128];

    expect(Array.from(decodeBase64ToBytes(Buffer.from(bytes).toString('base64')))).toEqual(bytes);
  });

  it('decodes an empty string to no bytes', () => {
    expect(decodeBase64ToBytes('').length).toBe(0);
  });
});
