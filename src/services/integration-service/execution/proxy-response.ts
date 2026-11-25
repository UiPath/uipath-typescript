import type {
  ExecuteHttpResult,
  ExecuteResult,
} from '@/models/integration-service/execution.types';
import { isPlainRecord } from './body-paths';

/** The vendor's headers as a flat record with lowercase names, the way `execute` returns headers. */
function toHeaderRecord(value: unknown): Record<string, string> {
  const result: Record<string, string> = {};
  if (!isPlainRecord(value)) return result;
  for (const [key, entry] of Object.entries(value)) {
    if (entry === undefined || entry === null) continue;
    // A header sent more than once arrives as a list; join it the way `fetch` does
    result[key.toLowerCase()] = Array.isArray(entry) ? entry.join(', ') : String(entry);
  }
  return result;
}

/** A vendor status is a whole number from 100 to 599; any other `code` is not a vendor response. */
const isHttpStatus = (code: unknown): code is number =>
  typeof code === 'number' && Number.isInteger(code) && code >= 100 && code <= 599;

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
  if (!result.ok || !isPlainRecord(envelope) || !isHttpStatus(envelope.code)) {
    return { ...result, isVendorError: false };
  }

  const ok = envelope.code >= 200 && envelope.code < 300;
  return {
    ok,
    status: envelope.code,
    statusText: typeof envelope.statusText === 'string' ? envelope.statusText : '',
    // The parsed body wins; `rawStringBody` carries a vendor body that is not JSON. With no raw
    // body the parsed one stands, so a vendor's JSON `null` stays `null`.
    body: envelope.body ?? envelope.rawStringBody ?? envelope.body,
    headers: toHeaderRecord(envelope.headers),
    isVendorError: !ok,
  };
}
