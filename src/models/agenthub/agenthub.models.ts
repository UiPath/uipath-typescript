import type {
  AgentHubChatCompletionOptions,
  AgentHubChatCompletionRequest,
  AgentHubChatCompletionResponse,
} from './agenthub.types';

/**
 * Service for AgentHub LLM gateway chat completions.
 *
 * Sends OpenAI-compatible chat completion requests through the
 * `agenthub_/llm/api` gateway, which routes by the normalized model name.
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
   * POSTs the OpenAI-compatible request body to `chat/completions` with the
   * `X-UiPath-LlmGateway-NormalizedApi-ModelName` header set to
   * `request.model`.
   *
   * @param request - Model, messages, and generation parameters.
   * @param options - Optional abort signal.
   * @returns Promise resolving to the {@link AgentHubChatCompletionResponse} completion.
   * @throws ValidationError when `model` or `messages` are missing/empty.
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
