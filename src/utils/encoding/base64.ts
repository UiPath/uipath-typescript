/**
 * Base64 encoding/decoding
 */
import { isBrowser } from '../platform';

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
  let bytes: Uint8Array;
  
  if (isBrowser) {
    // Browser environment
    const binaryString = atob(base64);
    bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
  } else {
    // Node.js environment
    bytes = new Uint8Array(Buffer.from(base64, 'base64'));
  }
  
  // TextDecoder for UTF-8 decoding (works in both browser and Node.js)
  const decoder = new TextDecoder();
  return decoder.decode(bytes);
}

