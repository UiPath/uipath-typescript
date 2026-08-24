/**
 * Helpers for resolving a citation media source into a downloadable document.
 */
import type { CitationSourceMedia } from '@/models/conversational-agent';

// The file extensions the context service can reference, mapped to their MIME
// types. Used only as a fallback for the octet-stream case below, so the
// extension set mirrors exactly what the reference service supports.
const EXTENSION_TO_MIME_TYPE: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.csv': 'text/csv',
  '.json': 'application/json',
  '.ods': 'application/vnd.oasis.opendocument.spreadsheet',
  '.xls': 'application/vnd.ms-excel',
  '.xlsm': 'application/vnd.ms-excel.sheet.macroEnabled.12',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.txt': 'text/plain',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.html': 'text/html' // ECS lists it, but clamped to octet-stream below
};

const OCTET_STREAM = 'application/octet-stream';

// MIME types that execute script when a downloaded blob is previewed inline: a
// blob URL runs in the embedder's origin, so an <iframe>/window.open preview of
// citation HTML could run its script in the consuming app. We never hand these
// back with a renderable type — forcing octet-stream makes the browser download
// rather than execute (matching how the reference service itself serves HTML).
const UNSAFE_INLINE_TYPES = new Set(['text/html', 'application/xhtml+xml']);

/**
 * Determines the best MIME type for the downloaded document. Prefers the
 * source's declared `mimeType`, then the server's Content-Type, and finally
 * falls back to the file extension in the title — because the context service
 * reference endpoint frequently responds with `application/octet-stream`.
 *
 * HTML-family types are always downgraded to `application/octet-stream` so a
 * consumer previewing the blob inline can't be made to execute citation markup.
 */
export function resolveCitationMimeType(
  source: CitationSourceMedia,
  responseType: string
): string {
  const resolved = selectMimeType(source, responseType);
  const essence = resolved.split(';')[0].trim().toLowerCase();
  return UNSAFE_INLINE_TYPES.has(essence) ? OCTET_STREAM : resolved;
}

function selectMimeType(source: CitationSourceMedia, responseType: string): string {
  if (source.mimeType) {
    return source.mimeType;
  }
  if (responseType && responseType !== OCTET_STREAM) {
    return responseType;
  }
  const extension = source.title?.toLowerCase().match(/\.[^.]*$/)?.[0];
  return (extension && EXTENSION_TO_MIME_TYPE[extension]) || responseType || OCTET_STREAM;
}
