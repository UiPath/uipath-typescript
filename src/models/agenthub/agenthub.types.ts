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
 * How the model may use the tools supplied with a request.
 */
export enum AgentHubToolChoiceType {
  /** The model decides whether to call a tool. */
  Auto = 'auto',
  /** The model must not call any tool. */
  None = 'none',
  /** The model must call at least one tool. */
  Required = 'required',
  /** The model must call the tool named in `name`. */
  Tool = 'tool',
}

/**
 * A tool call made by the model. Appears on the assistant message of a response,
 * and is replayed on that message when the conversation continues.
 */
export interface AgentHubToolCall {
  /** Identifier of the call. Pass it as `toolCallId` on the tool message that answers it. */
  id: string;
  /** Name of the tool to invoke. */
  name: string;
  /** Arguments for the tool, keyed exactly as the tool's `parameters` schema names them. */
  arguments: Record<string, unknown>;
}

/**
 * A single chat message in an AgentHub chat completion request.
 */
export interface AgentHubChatMessage {
  /** Message role. */
  role: AgentHubMessageRole;
  /**
   * Message text. For a tool message, the tool result. `null` is accepted for an
   * assistant turn that only carries tool calls, so a response message can be replayed as-is.
   */
  content: string | null;
  /** Tool calls the assistant made in this turn. Assistant messages only. */
  toolCalls?: AgentHubToolCall[];
  /** Identifier of the tool call this message answers. Required on tool messages. */
  toolCallId?: string;
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
    /** What the function does, shown to the model. */
    description?: string;
    /** JSON Schema describing the function parameters. Forwarded verbatim. */
    parameters?: Record<string, unknown>;
  };
}

/**
 * Lets the model decide, forbids tool calls, or requires at least one call.
 */
export interface AgentHubToolChoiceMode {
  /** Tool usage mode. */
  type: AgentHubToolChoiceType.Auto | AgentHubToolChoiceType.None | AgentHubToolChoiceType.Required;
}

/**
 * Forces the model to call one named tool.
 */
export interface AgentHubNamedToolChoice {
  /** Always {@link AgentHubToolChoiceType.Tool}. */
  type: AgentHubToolChoiceType.Tool;
  /** Name of the tool the model must call. */
  name: string;
}

/**
 * Controls which tools the model may call.
 */
export type AgentHubToolChoice = AgentHubToolChoiceMode | AgentHubNamedToolChoice;

/**
 * Options for `createChatCompletion`.
 */
export interface AgentHubChatCompletionOptions {
  /** Maximum tokens in the completion. */
  maxTokens?: number;
  /** Sampling temperature. */
  temperature?: number;
  /** Tool definitions available to the model. */
  tools?: AgentHubChatTool[];
  /** Controls which of `tools` the model may call. */
  toolChoice?: AgentHubToolChoice;
  /** Abort signal cancelling the request. */
  signal?: AbortSignal;
}

/**
 * The assistant message produced for a completion choice.
 */
export interface AgentHubChatCompletionMessage {
  /** Message role. */
  role: AgentHubMessageRole;
  /** Completed text, or `null` when the turn only carries tool calls. */
  content: string | null;
  /** Tool calls the model wants made. Present only when the model called a tool. */
  toolCalls?: AgentHubToolCall[];
}

/**
 * A single completion choice in an AgentHub chat completion response.
 */
export interface AgentHubChatCompletionChoice {
  /** Zero-based choice index. */
  index: number;
  /** Completed assistant message. */
  message: AgentHubChatCompletionMessage;
  /** Reason the model stopped generating. */
  finishReason?: string | null;
}

/**
 * Token usage for a completion.
 */
export interface AgentHubChatCompletionUsage {
  /** Tokens in the prompt. */
  promptTokens: number;
  /** Tokens in the completion. */
  completionTokens: number;
  /** Prompt plus completion tokens. */
  totalTokens: number;
  /** Prompt tokens served from cache, when the model reports it. */
  cacheReadInputTokens?: number | null;
}

/**
 * Response body for an AgentHub chat completion (non-streaming).
 */
export interface AgentHubChatCompletionResponse {
  /** Completion identifier. */
  id: string;
  /** Object type reported by the gateway, e.g. `chat.completion`. */
  object: string;
  /** Model that produced the completion. */
  model: string;
  /** When the completion was created, as an ISO 8601 timestamp. */
  createdTime: string;
  /** Completion choices. */
  choices: AgentHubChatCompletionChoice[];
  /** Token usage. */
  usage: AgentHubChatCompletionUsage;
}
