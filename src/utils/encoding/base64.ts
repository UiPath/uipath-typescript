/**
 * Base64 encoding/decoding
 */
import { isBrowser } from '../platform';

const BASE64URL_DASH_RE = /-/g;
const BASE64URL_UNDERSCORE_RE = /_/g;

/**
 * Encodes a string to base64
 * @param str - The string to encode
 * @returns Base64 encoded string
 */
export function encodeBase64(str: string): string {
  // TextEncoder for UTF-8 encoding (works in both browser and Node.js)
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  
  // Convert Uint8Array to base64
  if (isBrowser) {
    // Browser environment
    // Convert Uint8Array to binary string then to base64
    const binaryString = Array.from(data, byte => String.fromCharCode(byte)).join('');
    return btoa(binaryString);
  } else {
    // Node.js environment
    return Buffer.from(data).toString('base64');
  }
}

/**
 * Decodes a base64 string
 * @param base64 - The base64 string to decode
 * @returns Decoded string
 */
export function decodeBase64(base64: string): string {
  // TextDecoder for UTF-8 decoding (works in both browser and Node.js)
  const decoder = new TextDecoder();
  return decoder.decode(decodeBase64ToBytes(base64));
}

/**
 * Decodes a base64 string to its bytes, for content that is not text
 * @param base64 - The base64 string to decode
 * @returns Decoded bytes
 */
export function decodeBase64ToBytes(base64: string): Uint8Array {
  if (isBrowser) {
    // Browser environment
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }
  // Node.js environment
  return new Uint8Array(Buffer.from(base64, 'base64'));
}

/**
 * Decodes a base64url string, the URL-safe alphabet used by JWT segments and
 * Integration Service page tokens. Padding is optional.
 * @param base64Url - The base64url string to decode
 * @returns Decoded string
 */
export function decodeBase64Url(base64Url: string): string {
  const base64 = base64Url
    .replace(BASE64URL_DASH_RE, '+')
    .replace(BASE64URL_UNDERSCORE_RE, '/');
  return decodeBase64(base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '='));
}
