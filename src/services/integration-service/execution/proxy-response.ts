import type {
  ExecuteHttpResult,
  ExecuteResult,
} from '@/models/integration-service/execution.types';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Keeps the string-valued entries of a header or query map. */
function toStringRecord(value: unknown): Record<string, string> | undefined {
  if (!isRecord(value)) return undefined;
  const result: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (entry !== undefined && entry !== null) result[key] = String(entry);
  }
  return result;
}

/**
 * Turns the Integration Service answer to an HTTP passthrough call into the vendor's response.
 *
 * Integration Service answers 200 whatever the vendor said and reports the vendor's status,
 * headers and body inside the response body. When the call never reached the vendor (the
 * answer is not 2xx, or carries no vendor status), the Integration Service response is
 * returned as is.
 *
 * @param result - The raw result of the passthrough call
 * @returns The vendor's response, or the Integration Service response when there is none
 * @internal
 */
export function unwrapProxyResponse(result: ExecuteResult): ExecuteHttpResult {
  const envelope = result.body;
  if (!result.ok || !isRecord(envelope) || typeof envelope.code !== 'number') {
    return { ...result, isVendorError: false };
  }

  const ok = envelope.code >= 200 && envelope.code < 300;
  return {
    ok,
    status: envelope.code,
    statusText: typeof envelope.statusText === 'string' ? envelope.statusText : '',
    // The parsed body wins; `rawStringBody` carries a vendor body that is not JSON.
    body: envelope.body ?? envelope.rawStringBody,
    headers: toStringRecord(envelope.headers) ?? {},
    isVendorError: !ok,
  };
}
