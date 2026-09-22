/**
 * AgentHub Module
 *
 * @experimental
 *
 * /// warning
 * Preview: This module is experimental and may change or be removed in future releases.
 * ///
 *
 * Provides access to the AgentHub LLM gateway chat completions — send
 * OpenAI-compatible requests routed by normalized model name.
 *
 * @example
 * ```typescript
 * import { UiPath } from '@uipath/uipath-typescript/core';
 * import { AgentHub, AgentHubMessageRole } from '@uipath/uipath-typescript/agenthub';
 *
 * const sdk = new UiPath(config);
 * await sdk.initialize();
 *
 * const agentHub = new AgentHub(sdk);
 * const completion = await agentHub.createChatCompletion({
 *   model: '<modelName>',
 *   messages: [{ role: AgentHubMessageRole.User, content: 'Summarize this invoice.' }],
 * });
 * ```
 *
 * @module
 */

export { AgentHubService as AgentHub, AgentHubService } from './agenthub';

export * from '../../models/agenthub/agenthub.types';
export * from '../../models/agenthub/agenthub.models';
