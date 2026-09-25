/**
 * Wire shapes for AgentHub chat completions before snake_case keys are
 * converted to camelCase. Not part of the public SDK surface.
 */

export interface RawAgentHubChatCompletionChoice {
  index: number;
  message: {
    role: string;
    content: string;
  };
  finish_reason?: string | null;
}

export interface RawAgentHubChatCompletionResponse {
  id: string;
  choices: RawAgentHubChatCompletionChoice[];
}
