export type PreviewKind = 'image' | 'pdf' | 'video' | 'audio' | 'json' | 'text' | 'unsupported'

const EXTENSION_KINDS: Record<string, PreviewKind> = {
  png: 'image', jpg: 'image', jpeg: 'image', gif: 'image', webp: 'image', svg: 'image', bmp: 'image', ico: 'image',
  pdf: 'pdf',
  mp4: 'video', webm: 'video', mov: 'video',
  mp3: 'audio', wav: 'audio', ogg: 'audio', m4a: 'audio',
  json: 'json',
  txt: 'text', csv: 'text', tsv: 'text', log: 'text', md: 'text', xml: 'text', html: 'text', htm: 'text',
  yaml: 'text', yml: 'text', ini: 'text', cfg: 'text', conf: 'text', js: 'text', ts: 'text', py: 'text',
  cs: 'text', sql: 'text', sh: 'text', css: 'text', xaml: 'text',
}

const TEXT_MIME_TYPES = new Set([
  'application/xml',
  'application/javascript',
  'application/x-yaml',
  'application/yaml',
  'application/sql',
])

/**
 * Decides how to render a file. Bucket content types are often generic
 * (`application/octet-stream`), so the extension is checked when the MIME
 * type isn't conclusive.
 */
export function detectPreviewKind(path: string, contentType: string | null | undefined): PreviewKind {
  const mime = (contentType ?? '').split(';')[0].trim().toLowerCase()
  if (mime.startsWith('image/')) return 'image'
  if (mime === 'application/pdf') return 'pdf'
  if (mime.startsWith('video/')) return 'video'
  if (mime.startsWith('audio/')) return 'audio'
  if (mime === 'application/json' || mime.endsWith('+json')) return 'json'
  if (mime.startsWith('text/') || TEXT_MIME_TYPES.has(mime) || mime.endsWith('+xml')) return 'text'

  const ext = path.includes('.') ? path.slice(path.lastIndexOf('.') + 1).toLowerCase() : ''
  return EXTENSION_KINDS[ext] ?? 'unsupported'
}

/** MIME type to give the downloaded Blob so the browser renders it correctly. */
export function blobMimeFor(kind: PreviewKind, path: string, fallback: string): string {
  if (kind === 'pdf') return 'application/pdf'
  if (kind === 'image' && path.toLowerCase().endsWith('.svg')) return 'image/svg+xml'
  return fallback
}
