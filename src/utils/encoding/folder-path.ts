/**
 * Encodes a folder path for the `X-UIPATH-FolderPath-Encoded` header.
 *
 * Orchestrator decodes this header as **base64-encoded UTF-16 LE bytes**
 * (see `HttpHeadersProviderExtensions.GetDecoded` + `OrganizationUnitProvider`
 * in the Orchestrator repo, which call `Encoding.Unicode.GetString(...)`).
 * URL-encoding is NOT what the server expects — it must be base64-of-UTF-16-LE
 * bytes.
 *
 * @param folderPath - The folder path (e.g. 'Shared/Finance')
 * @returns Base64 string suitable for the `X-UIPATH-FolderPath-Encoded` header
 */
export function encodeFolderPathHeader(folderPath: string): string {
  // Force little-endian regardless of host byte order. `Uint16Array` viewed
  // as `Uint8Array` would use the host's native order — correct on LE hosts
  // (x86/ARM-LE) but wrong on BE hosts. `DataView.setUint16(..., true)`
  // pins LE.
  const buf = new ArrayBuffer(folderPath.length * 2);
  const view = new DataView(buf);
  for (let i = 0; i < folderPath.length; i++) {
    view.setUint16(i * 2, folderPath.charCodeAt(i), true);
  }
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  // btoa is browser-native; Node 16+ also has it as a global
  return btoa(binary);
}
