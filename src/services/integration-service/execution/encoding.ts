import { decodeBase64 } from '@/utils/encoding/base64';

const BASE64URL_DASH_RE = /-/g;
const BASE64URL_UNDERSCORE_RE = /_/g;

/**
 * Decodes a base64url string, the URL-safe alphabet Integration Service page tokens use.
 * Padding is optional.
 *
 * @param base64Url - The base64url string to decode
 * @returns Decoded string
 * @internal
 */
export function decodeBase64Url(base64Url: string): string {
  const base64 = base64Url
    .replace(BASE64URL_DASH_RE, '+')
    .replace(BASE64URL_UNDERSCORE_RE, '/');
  return decodeBase64(base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '='));
}

/**
 * Decodes a base64 string to its bytes, for content that is not text.
 *
 * @param base64 - The base64 string to decode
 * @returns Decoded bytes
 * @internal
 */
export function decodeBase64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}
