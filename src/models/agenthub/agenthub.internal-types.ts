/**
 * Wire shapes for AgentHub chat completions, before and after the SDK's field
 * mapping. Not part of the public SDK surface.
 */

import type { AgentHubMessageRole } from './agenthub.types';

export interface RawAgentHubToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

/** Content shape the normalized API expects on a `tool` message. */
export interface RawAgentHubToolResult {
  result: string;
  call_id: string;
}

export interface RawAgentHubChatMessage {
  role: AgentHubMessageRole;
  content: string | RawAgentHubToolResult;
  tool_calls?: RawAgentHubToolCall[];
}

export interface RawAgentHubChatCompletionChoice {
  index: number;
  message: {
    role: AgentHubMessageRole;
    content?: string | null;
    tool_calls?: RawAgentHubToolCall[];
  };
  finish_reason?: string | null;
}

export interface RawAgentHubChatCompletionUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cache_read_input_tokens?: number | null;
}

export interface RawAgentHubChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: RawAgentHubChatCompletionChoice[];
  usage: RawAgentHubChatCompletionUsage;
}
