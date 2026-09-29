/**
 * Role of a chat message.
 */
export enum AgentHubMessageRole {
  System = 'system',
  User = 'user',
  Assistant = 'assistant',
  Tool = 'tool',
}

/**
 * Tool definition type forwarded to the model.
 */
export enum AgentHubToolType {
  Function = 'function',
}

/**
 * A single chat message in an AgentHub chat completion request.
 */
export interface AgentHubChatMessage {
  /** Message role. */
  role: AgentHubMessageRole;
  /** Message content. */
  content: string;
}

/**
 * Tool definition forwarded to the model, OpenAI function-calling shape.
 */
export interface AgentHubChatTool {
  /** Tool type. */
  type: AgentHubToolType;
  /** Function definition. */
  function: {
    /** Function name. */
    name: string;
    /** JSON Schema describing the function parameters. */
    parameters?: Record<string, unknown>;
  };
}

/**
 * Request body for an AgentHub chat completion (non-streaming).
 */
export interface AgentHubChatCompletionRequest {
  /** Normalized model name, e.g. `gpt-4.1-2025-04-14`. Also sent via the gateway model header. */
  model: string;
  /** Conversation messages. */
  messages: AgentHubChatMessage[];
  /** Maximum tokens in the completion. */
  maxTokens?: number;
  /** Sampling temperature. */
  temperature?: number;
  /** Tool definitions available to the model. */
  tools?: AgentHubChatTool[];
}

/**
 * A single completion choice in an AgentHub chat completion response.
 */
export interface AgentHubChatCompletionChoice {
  /** Zero-based choice index. */
  index: number;
  /** Completed assistant message. */
  message: {
    /** Message role. */
    role: AgentHubMessageRole;
    /** Completed content. */
    content: string;
  };
  /** Reason the model stopped generating. */
  finishReason?: string | null;
}

/**
 * Response body for an AgentHub chat completion (non-streaming).
 */
export interface AgentHubChatCompletionResponse {
  /** Completion identifier. */
  id: string;
  /** Completion choices. */
  choices: AgentHubChatCompletionChoice[];
}

/**
 * Options for `createChatCompletion`.
 */
export interface AgentHubChatCompletionOptions {
  /** Abort signal cancelling the request. */
  signal?: AbortSignal;
}
