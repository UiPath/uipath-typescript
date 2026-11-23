/** Name of the content type header, as a flat header record holds it. */
export const CONTENT_TYPE = 'content-type';
const CONTENT_DISPOSITION = 'content-disposition';

/** Content types that carry data to read, even when the server marks them as an attachment. */
const DATA_CONTENT_TYPES = [
  'application/json',
  'application/xml',
  'text/xml',
  'text/csv',
  'text/plain',
  'application/atom+xml',
  'application/rss+xml',
];

const BINARY_CONTENT_TYPE_PREFIXES = [
  'application/octet-stream',
  'application/pdf',
  'application/zip',
  'image/',
  'audio/',
  'video/',
  'application/vnd.',
  'application/x-tar',
  'application/gzip',
  // A multipart answer is framed bytes; whoever asked for it parses it
  'multipart/',
];

/** Reads a header from a flat record whatever the case of its name. */
export function headerValue(headers: Record<string, string>, name: string): string | undefined {
  const direct = headers[name];
  if (direct !== undefined) return direct;
  const match = Object.keys(headers).find((key) => key.toLowerCase() === name);
  return match === undefined ? undefined : headers[match];
}

function isDataContentType(contentType: string): boolean {
  const essence = contentType.split(';')[0].trim();
  if (DATA_CONTENT_TYPES.some((type) => essence.startsWith(type))) return true;
  // Structured suffixes such as application/vnd.api+json are data, image/svg+xml is not
  const isTextTree = essence.startsWith('application/') || essence.startsWith('text/');
  return isTextTree && (essence.endsWith('+json') || essence.endsWith('+xml'));
}

/**
 * True when the response headers describe a file instead of data to parse: the content type is
 * not a data type, and the response is an attachment or has a binary content type.
 *
 * @param headers - Response headers as a flat record
 * @internal
 */
export function isFileResponse(headers: Record<string, string>): boolean {
  const contentType = (headerValue(headers, CONTENT_TYPE) ?? '').toLowerCase();
  if (isDataContentType(contentType)) return false;

  const disposition = (headerValue(headers, CONTENT_DISPOSITION) ?? '').toLowerCase();
  return disposition.includes('attachment') ||
    BINARY_CONTENT_TYPE_PREFIXES.some((prefix) => contentType.startsWith(prefix));
}

/**
 * Reads a response body: bytes for a file, parsed JSON when the text is JSON, the text otherwise.
 *
 * @param response - The response to read
 * @param headers - Its headers as a flat record
 * @param asFile - Read a 2xx response as bytes whatever its content type
 * @param label - Name of the calling method, used in the warning for a non-JSON body
 * @returns The body
 * @internal
 */
export async function readResponseBody(
  response: Response,
  headers: Record<string, string>,
  asFile: boolean,
  label: string,
): Promise<unknown> {
  if ((asFile && response.ok) || isFileResponse(headers)) {
    return new Uint8Array(await response.arrayBuffer());
  }

  const text = await response.text();
  if (!text) return text;
  try {
    return JSON.parse(text);
  } catch (error) {
    console.warn(`${label}: response body is not valid JSON, returning raw text`, error);
    return text;
  }
}
