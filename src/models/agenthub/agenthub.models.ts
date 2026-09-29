import type {
  AgentHubChatCompletionOptions,
  AgentHubChatCompletionResponse,
  AgentHubChatMessage,
} from './agenthub.types';

/**
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
 * import { AgentHub, AgentHubMessageRole } from '@uipath/uipath-typescript/agenthub';
 *
 * const agentHub = new AgentHub(sdk);
 * const completion = await agentHub.createChatCompletion('<modelName>', [
 *   { role: AgentHubMessageRole.User, content: 'Summarize this invoice.' },
 * ]);
 * ```
 */
export interface AgentHubServiceModel {
  /**
   * Creates a non-streaming chat completion via the AgentHub LLM gateway.
   *
   * Returns the completion choices together with token usage. When the model calls a
   * tool, the choice message carries `toolCalls` and its `content` is `null`; continue
   * the conversation by replaying that message followed by a tool message whose
   * `toolCallId` echoes the call id.
   *
   * @param model - Normalized model name, e.g. `gpt-4.1-2025-04-14`
   * @param messages - Conversation so far, oldest first
   * @param options - Generation parameters, tool definitions and an abort signal
   * @returns Promise resolving to the {@link AgentHubChatCompletionResponse} completion.
   *
   * @example Minimal request
   * ```typescript
   * import { AgentHubMessageRole } from '@uipath/uipath-typescript/agenthub';
   *
   * const completion = await agentHub.createChatCompletion('<modelName>', [
   *   { role: AgentHubMessageRole.User, content: 'Summarize this invoice.' },
   * ]);
   *
   * console.log(completion.choices[0].message.content);
   * console.log(completion.usage.totalTokens);
   * ```
   *
   * @example With generation parameters
   * ```typescript
   * import { AgentHubMessageRole } from '@uipath/uipath-typescript/agenthub';
   *
   * const completion = await agentHub.createChatCompletion(
   *   '<modelName>',
   *   [{ role: AgentHubMessageRole.User, content: 'Summarize this invoice.' }],
   *   { maxTokens: 2048, temperature: 0.7 },
   * );
   * ```
   *
   * @example Tool calling round trip
   * ```typescript
   * import {
   *   AgentHubMessageRole,
   *   AgentHubToolChoiceType,
   *   AgentHubToolType,
   * } from '@uipath/uipath-typescript/agenthub';
   *
   * const messages = [{ role: AgentHubMessageRole.User, content: 'Look up invoice INV-42.' }];
   * const tools = [{
   *   type: AgentHubToolType.Function,
   *   function: {
   *     name: 'lookupInvoice',
   *     description: 'Fetches an invoice by its identifier',
   *     parameters: {
   *       type: 'object',
   *       properties: { invoiceId: { type: 'string' } },
   *       required: ['invoiceId'],
   *     },
   *   },
   * }];
   *
   * const first = await agentHub.createChatCompletion('<modelName>', messages, {
   *   tools,
   *   toolChoice: { type: AgentHubToolChoiceType.Tool, name: 'lookupInvoice' },
   * });
   *
   * const assistant = first.choices[0].message;
   * const toolResults = await Promise.all(
   *   (assistant.toolCalls ?? []).map(async (call) => ({
   *     role: AgentHubMessageRole.Tool,
   *     toolCallId: call.id,
   *     content: JSON.stringify(await lookupInvoice(call.arguments)), // your implementation
   *   })),
   * );
   *
   * const answer = await agentHub.createChatCompletion(
   *   '<modelName>',
   *   [...messages, assistant, ...toolResults],
   *   { tools },
   * );
   * console.log(answer.choices[0].message.content);
   * ```
   * @internal
   */
  createChatCompletion(
    model: string,
    messages: AgentHubChatMessage[],
    options?: AgentHubChatCompletionOptions,
  ): Promise<AgentHubChatCompletionResponse>;
}
