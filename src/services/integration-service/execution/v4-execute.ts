import { ServerError } from '@/core/errors';
import { CONTENT_TYPES } from '@/utils/constants/headers';
import { decodeBase64ToBytes } from './encoding';
import type {
  ExecuteFile,
  ExecuteHttpResult,
  ExecuteMethod,
  ExecuteResult,
} from '@/models/integration-service/execution.types';
import { headerValue } from './response-content';
import { toBlob } from './multipart';

/** First connector major version that runs on the version 4 engine. */
const V4_MAJOR_VERSION = 4;
const MAJOR_VERSION_RE = /^v?(\d+)(?:\.|$)/i;

/** Name of the form part that carries the request description when a file is uploaded. */
const MANIFEST_PART_NAME = 'manifest';
const BASE64_ENCODING = 'base64';
const CONTENT_TYPE = 'content-type';
const MULTIPART_MIXED = 'multipart/mixed';
const BOUNDARY_RE = /boundary="?([^";]+)"?/i;

const CRLF = [13, 10];
const HEADER_END = [13, 10, 13, 10];

/**
 * The request the version 4 engine accepts: one vendor call and the connection to make it with.
 *
 * @internal
 */
export interface V4Manifest {
  outboundRequestConfig: {
    method: ExecuteMethod;
    url: string;
    headers?: { name: string; value: string }[];
    /** Body as text. Exclusive with `bodyRef`. */
    body?: string;
    /** Name of the attachment sent as the whole body. */
    bodyRef?: string;
  };
  attachments?: { name: string; size: number; contentType: string }[];
  context: { connectionId: string; connectorKey?: string };
}

/**
 * What a vendor call through the version 4 engine is built from.
 *
 * @internal
 */
export interface V4RequestInput {
  connectionId: string;
  connectorKey?: string;
  method: ExecuteMethod;
  url: string;
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
  body?: unknown;
  file?: ExecuteFile;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

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
 * Builds the version 4 request for one vendor call. The engine sends the body as given and has
 * no query field, so query parameters join the URL and a serialized body is labelled as JSON.
 *
 * @param input - The vendor call
 * @returns The request description
 * @internal
 */
export function buildV4Manifest(input: V4RequestInput): V4Manifest {
  const headers = { ...input.headers };

  let body: string | undefined;
  if (input.body !== undefined && input.body !== null) {
    if (typeof input.body === 'string') {
      body = input.body;
    } else {
      body = JSON.stringify(input.body);
      if (headerValue(headers, CONTENT_TYPE) === undefined) headers['Content-Type'] = CONTENT_TYPES.JSON;
    }
  }

  const headerList = Object.entries(headers).map(([name, value]) => ({ name, value }));

  const manifest: V4Manifest = {
    outboundRequestConfig: { method: input.method, url: withQuery(input.url, input.queryParams) },
    context: { connectionId: input.connectionId },
  };
  if (headerList.length > 0) manifest.outboundRequestConfig.headers = headerList;
  if (input.connectorKey) manifest.context.connectorKey = input.connectorKey;

  if (input.file) {
    const blob = toBlob(input.file);
    manifest.outboundRequestConfig.bodyRef = input.file.name;
    manifest.attachments = [{ name: input.file.name, size: blob.size, contentType: blob.type }];
  } else if (body !== undefined) {
    manifest.outboundRequestConfig.body = body;
  }
  return manifest;
}

/**
 * The form for a version 4 call that uploads a file: the request description first, then the file.
 *
 * @param manifest - The request description, naming the file as its body
 * @param file - The file to send as the vendor request body
 * @returns The form to send
 * @internal
 */
export function buildV4UploadForm(manifest: V4Manifest, file: ExecuteFile): FormData {
  const form = new FormData();
  form.append(MANIFEST_PART_NAME, new Blob([JSON.stringify(manifest)], { type: CONTENT_TYPES.JSON }));
  form.append(file.name, toBlob(file), file.fileName ?? file.name);
  return form;
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
export function unwrapV4Response(result: ExecuteResult): ExecuteHttpResult {
  if (!result.ok) return { ...result, isVendorError: false };

  if (result.body instanceof Uint8Array) {
    const contentType = headerValue(result.headers, CONTENT_TYPE) ?? '';
    if (!contentType.toLowerCase().startsWith(MULTIPART_MIXED)) return { ...result, isVendorError: false };
    const { envelope, bytes } = parseTwoPartAnswer(result.body, contentType, result.status);
    return toVendorResult(envelope, bytes);
  }

  if (!isRecord(result.body) || typeof result.body.status !== 'number') {
    return { ...result, isVendorError: false };
  }
  const { body, bodyEncoding } = result.body;
  const decoded = bodyEncoding === BASE64_ENCODING && typeof body === 'string' ? decodeBase64ToBytes(body) : body;
  return toVendorResult(result.body, decoded);
}

function withQuery(url: string, queryParams: Record<string, string> | undefined): string {
  if (!queryParams || Object.keys(queryParams).length === 0) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}${new URLSearchParams(queryParams).toString()}`;
}

function toVendorResult(envelope: Record<string, unknown>, body: unknown): ExecuteHttpResult {
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
  if (!isRecord(value)) return {};
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
  } catch (error) {
    console.warn('Integration Service file response: first part is not valid JSON', error);
    return fail('first part is not JSON');
  }
  if (!isRecord(envelope)) return fail('first part is not an object');

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
