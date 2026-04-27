/**
 * Encodes a folder path for the `X-UIPATH-FolderPath-Encoded` header.
 *
 * Orchestrator decodes this header as **base64-encoded UTF-16 LE bytes**
 * (see `HttpHeadersProviderExtensions.GetDecoded` + `OrganizationUnitProvider`
 * in the Orchestrator repo). URL-encoding is NOT what OR expects — it must be
 * base64-of-UTF-16-LE bytes, matching `Encoding.Unicode.GetString(...)`.
 *
 * @param folderPath - The folder path (e.g. 'Shared/Finance')
 * @returns Base64 string suitable for the `X-UIPATH-FolderPath-Encoded` header
 */
export function encodeFolderPathHeader(folderPath: string): string {
  const utf16 = new Uint16Array(folderPath.length);
  for (let i = 0; i < folderPath.length; i++) {
    utf16[i] = folderPath.charCodeAt(i);
  }
  const bytes = new Uint8Array(utf16.buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  // btoa is browser-native; Node 16+ also has it as a global
  return btoa(binary);
}
