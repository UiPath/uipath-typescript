import { ServerError } from '@/core/errors';
import { decodeBase64ToBytes } from './encoding';
import type { ExecuteResult } from '@/models/integration-service/execution.types';
import { CONTENT_TYPE, headerValue } from './response-content';
import { isPlainRecord } from './body-paths';

/** First connector major version that runs on the version 4 engine. */
const V4_MAJOR_VERSION = 4;
const MAJOR_VERSION_RE = /^v?(\d+)(?:\.|$)/i;

const BASE64_ENCODING = 'base64';
const MULTIPART_MIXED = 'multipart/mixed';
const BOUNDARY_RE = /boundary="?([^";]+)"?/i;

const CRLF = [13, 10];
const HEADER_END = [13, 10, 13, 10];

/**
 * The request the version 4 engine accepts to run a connector activity: the script to run and
 * the inbound call that script reads.
 *
 * @internal
 */
export interface V4ActivityManifest {
  context: { connectionId: string; connectorKey: string; script: { reference: string } };
  request: { body?: unknown; query?: Record<string, string>; headers?: Record<string, string> };
}

/**
 * What an activity call through the version 4 engine is built from.
 *
 * @internal
 */
export interface V4ActivityInput {
  connectionId: string;
  connectorKey: string;
  scriptRef: string;
  body?: unknown;
  queryParams?: Record<string, string>;
  headers?: Record<string, string>;
}

/**
 * The vendor's response as the version 4 engine reported it.
 *
 * @internal
 */
export interface V4VendorResult extends ExecuteResult {
  /** True when the vendor answered with a non-2xx status; false when the engine never reached it. */
  isVendorError: boolean;
}

/**
 * True when a connector of this version runs on the version 4 engine: major version 4 or later.
 * A missing or unreadable version means the version 3 engine.
 *
 * @param connectorVersion - Connector version, e.g. `4.0.0`
 * @internal
 */
export function usesV4Engine(connectorVersion: string | undefined): boolean {
  if (!connectorVersion) return false;
  const match = MAJOR_VERSION_RE.exec(connectorVersion.trim());
  return match !== null && Number(match[1]) >= V4_MAJOR_VERSION;
}

/**
 * Builds the version 4 request that runs one connector activity. The engine finds the activity's
 * script by its reference and hands it the body, query and headers as the inbound call.
 *
 * @param input - The activity call
 * @returns The request description
 * @internal
 */
export function buildV4ActivityManifest(input: V4ActivityInput): V4ActivityManifest {
  const request: V4ActivityManifest['request'] = {};
  if (input.body !== undefined) request.body = input.body;
  if (input.queryParams && Object.keys(input.queryParams).length > 0) request.query = input.queryParams;
  if (input.headers && Object.keys(input.headers).length > 0) request.headers = input.headers;
  return {
    context: {
      connectionId: input.connectionId,
      connectorKey: input.connectorKey,
      script: { reference: input.scriptRef },
    },
    request,
  };
}

/**
 * Turns the version 4 engine's answer into the vendor's response.
 *
 * The engine answers 2xx whenever it reached the vendor and reports the vendor's status, headers
 * and body inside the answer; any other status means the engine itself failed. The answer is a
 * JSON object, or a two-part document (the same object without the body, then the bytes) when
 * the vendor sent a file or a large body.
 *
 * @param result - The raw result of the engine call
 * @returns The vendor's response, or the engine's own response when it did not reach the vendor
 * @internal
 */
export function unwrapV4Response(result: ExecuteResult): V4VendorResult {
  if (!result.ok) return { ...result, isVendorError: false };

  if (result.body instanceof Uint8Array) {
    const contentType = headerValue(result.headers, CONTENT_TYPE) ?? '';
    if (!contentType.toLowerCase().startsWith(MULTIPART_MIXED)) return { ...result, isVendorError: false };
    const { envelope, bytes } = parseTwoPartAnswer(result.body, contentType, result.status);
    return toVendorResult(envelope, bytes);
  }

  if (!isPlainRecord(result.body) || typeof result.body.status !== 'number') {
    return { ...result, isVendorError: false };
  }
  const { body, bodyEncoding } = result.body;
  const decoded = bodyEncoding === BASE64_ENCODING && typeof body === 'string' ? decodeBase64ToBytes(body) : body;
  return toVendorResult(result.body, decoded);
}

function toVendorResult(envelope: Record<string, unknown>, body: unknown): V4VendorResult {
  const status = typeof envelope.status === 'number' ? envelope.status : 0;
  const ok = status >= 200 && status < 300;
  return {
    ok,
    status,
    statusText: '',
    body,
    headers: flattenHeaders(envelope.headers),
    isVendorError: !ok,
  };
}

/** The engine reports a repeated header as a list; the SDK result holds one string per name. */
function flattenHeaders(value: unknown): Record<string, string> {
  if (!isPlainRecord(value)) return {};
  const headers: Record<string, string> = {};
  for (const [name, entry] of Object.entries(value)) {
    if (entry === undefined || entry === null) continue;
    headers[name] = Array.isArray(entry) ? entry.map(String).join(', ') : String(entry);
  }
  return headers;
}

/**
 * Reads the two-part answer: part one is the JSON description, part two the vendor's bytes.
 * An answer without its closing delimiter was cut short and is refused.
 */
function parseTwoPartAnswer(
  document: Uint8Array,
  contentType: string,
  statusCode: number,
): { envelope: Record<string, unknown>; bytes: Uint8Array } {
  const fail = (reason: string): never => {
    throw new ServerError({ message: `Integration Service returned an incomplete file response: ${reason}`, statusCode });
  };

  const boundary = BOUNDARY_RE.exec(contentType)?.[1];
  if (!boundary) return fail('no boundary');

  const delimiter = toBytes(`--${boundary}`);
  const closing = toBytes(`\r\n--${boundary}--`);

  const first = indexOfBytes(document, delimiter, 0);
  const firstBodyStart = endOfHeaders(document, first);
  const second = indexOfBytes(document, [...CRLF, ...delimiter], firstBodyStart);
  if (first < 0 || firstBodyStart < 0 || second < 0) return fail('first part not found');

  const secondBodyStart = endOfHeaders(document, second + CRLF.length);
  const end = lastIndexOfBytes(document, closing);
  if (secondBodyStart < 0 || end < secondBodyStart) return fail('closing delimiter not found');

  let envelope: unknown;
  try {
    envelope = JSON.parse(new TextDecoder().decode(document.subarray(firstBodyStart, second)));
  } catch {
    return fail('first part is not JSON');
  }
  if (!isPlainRecord(envelope)) return fail('first part is not an object');

  return { envelope, bytes: document.slice(secondBodyStart, end) };
}

function toBytes(text: string): number[] {
  return Array.from(new TextEncoder().encode(text));
}

/** Position just after the blank line that ends a part's headers, or -1. */
function endOfHeaders(document: Uint8Array, from: number): number {
  if (from < 0) return -1;
  const position = indexOfBytes(document, HEADER_END, from);
  return position < 0 ? -1 : position + HEADER_END.length;
}

function matchesAt(document: Uint8Array, needle: number[], position: number): boolean {
  for (let offset = 0; offset < needle.length; offset++) {
    if (document[position + offset] !== needle[offset]) return false;
  }
  return true;
}

function indexOfBytes(document: Uint8Array, needle: number[], from: number): number {
  for (let position = Math.max(0, from); position <= document.length - needle.length; position++) {
    if (matchesAt(document, needle, position)) return position;
  }
  return -1;
}

function lastIndexOfBytes(document: Uint8Array, needle: number[]): number {
  for (let position = document.length - needle.length; position >= 0; position--) {
    if (matchesAt(document, needle, position)) return position;
  }
  return -1;
}
