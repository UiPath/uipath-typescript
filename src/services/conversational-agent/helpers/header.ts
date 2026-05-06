/**
 * Header builder for Conversational Agent Services
 *
 * Builds the default request headers shared across the Conversational Agent
 * service constructors (`ConversationalAgentService`, `ConversationService`,
 * `ExchangeService`, `MessageService`) from a single set of options.
 */

import type { ConversationalAgentOptions } from '@/models/conversational-agent';
import {
  CONVERSATIONAL_SURFACE_NAME,
  CONVERSATIONAL_SURFACE_VERSION,
  EXTERNAL_USER_ID,
} from '@/utils/constants/headers';
import { createHeaders } from '@/utils/http/headers';

/**
 * Builds the default request headers for Conversational Agent service calls
 * from the provided options. Returns `undefined` when no headers apply, so
 * the SDK does not pass an empty `headers` bag down to the HTTP layer.
 */
export function buildConversationalAgentDefaultHeaders(
  options?: ConversationalAgentOptions,
): Record<string, string> | undefined {
  const headers = createHeaders({
    [EXTERNAL_USER_ID]: options?.externalUserId,
    [CONVERSATIONAL_SURFACE_NAME]: options?.surfaceName,
    [CONVERSATIONAL_SURFACE_VERSION]: options?.surfaceVersion,
  });
  return Object.keys(headers).length > 0 ? headers : undefined;
}
