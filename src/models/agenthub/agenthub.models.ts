import type {
  AgentHubChatCompletionOptions,
  AgentHubChatCompletionRequest,
  AgentHubChatCompletionResponse,
} from './agenthub.types';

/**
 *
 * @experimental
 *
 * /// warning
 * Preview: This service is experimental and may change or be removed in future releases.
 * ///
 *
 * Service for AgentHub LLM gateway chat completions.
 *
 * Sends OpenAI-compatible chat completion requests through the AgentHub LLM
 * gateway, which routes by the normalized model name.
 *
 * Streaming (`stream: true`, SSE) is intentionally not covered: the SDK HTTP
 * layer buffers response bodies, so callers needing token streams should keep
 * calling the endpoint directly until streaming support lands.
 *
 * ### Usage
 *
 * Prerequisites: Initialize the SDK first - see [Getting Started](/uipath-typescript/getting-started/#import-initialize)
 *
 * ```typescript
 * import { AgentHub } from '@uipath/uipath-typescript/agenthub';
 *
 * const agentHub = new AgentHub(sdk);
 * const completion = await agentHub.createChatCompletion({
 *   model: '<modelName>',
 *   messages: [{ role: 'user', content: 'Summarize this invoice.' }],
 * });
 * ```
 */
export interface AgentHubServiceModel {
  /**
   * Creates a non-streaming chat completion via the AgentHub LLM gateway.
   *
   * @experimental
   *
   * /// warning
   * Preview: This method is experimental and may change or be removed in future releases.
   * ///
   *
   * @param request - Model, messages, and generation parameters.
   * @param options - Optional abort signal.
   * @returns Promise resolving to the {@link AgentHubChatCompletionResponse} completion.
   * @example
   * ```typescript
   * const completion = await agentHub.createChatCompletion({
   *   model: '<modelName>',
   *   messages: [{ role: 'user', content: 'Summarize this invoice.' }],
   *   maxTokens: 2048,
   *   temperature: 0.7,
   * });
   *
   * console.log(completion.choices[0]?.message.content);
   * ```
   */
  createChatCompletion(
    request: AgentHubChatCompletionRequest,
    options?: AgentHubChatCompletionOptions,
  ): Promise<AgentHubChatCompletionResponse>;
}
