import { encodeBase64 } from '@/utils/encoding/base64';

/** Paging parameters. Their values are tokens the connector reads as they are. */
const RESERVED_KEYS = new Set(['pagesize', 'nextpage', 'page', 'providernextpage']);

const ARRAY_MARKER_RE = /\[\*\]$/;

/**
 * True when `value` is an http or https URL, plain or percent-encoded once.
 *
 * @internal
 */
export function looksLikeUrl(value: string): boolean {
  let candidate = value;
  try {
    candidate = decodeURIComponent(value);
  } catch {
    // A malformed percent sequence: test the value as given
    candidate = value;
  }

  try {
    const { protocol } = new URL(candidate);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Base64-encodes the query values that carry a URL, for the fields a connector marks as
 * accepting one. Integration Service rejects a request whose query holds an encoded slash,
 * so the URL travels as Base64 and the connector decodes it.
 *
 * A value is encoded only when its name is listed and it is an http or https URL. Names match
 * without regard to case, and paging parameters are never encoded.
 *
 * @param query - Query parameters
 * @param fields - Names of the query fields that accept a URL
 * @returns The query to send; the same object when nothing was encoded
 * @internal
 */
export function encodeUrlInputs(
  query: Record<string, string> | undefined,
  fields: string[] | undefined,
): Record<string, string> | undefined {
  if (!query || !fields?.length) return query;

  const flagged = new Set(fields.map((name) => name.replace(ARRAY_MARKER_RE, '').toLowerCase()));

  let encoded: Record<string, string> | undefined;
  for (const [key, value] of Object.entries(query)) {
    const name = key.toLowerCase();
    if (RESERVED_KEYS.has(name) || !flagged.has(name) || typeof value !== 'string' || !looksLikeUrl(value)) {
      continue;
    }
    encoded ??= { ...query };
    encoded[key] = encodeBase64(value);
  }
  return encoded ?? query;
}
