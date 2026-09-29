import { track } from '../../core/telemetry';
import { ValidationError } from '../../core/errors';
import {
  AgentHubMessageRole,
  type AgentHubChatCompletionChoice,
  type AgentHubChatCompletionMessage,
  type AgentHubChatCompletionOptions,
  type AgentHubChatCompletionResponse,
  type AgentHubChatMessage,
} from '../../models/agenthub/agenthub.types';
import type {
  RawAgentHubChatCompletionChoice,
  RawAgentHubChatCompletionResponse,
  RawAgentHubChatMessage,
} from '../../models/agenthub/agenthub.internal-types';
import type { AgentHubServiceModel } from '../../models/agenthub/agenthub.models';
import { AGENTHUB_ENDPOINTS } from '../../utils/constants/endpoints';
import { LLM_GATEWAY_MODEL_NAME } from '../../utils/constants/headers';
import { createHeaders } from '../../utils/http/headers';
import { camelToSnakeCaseKeys, snakeToCamelCaseKeys } from '../../utils/transform';
import { BaseService } from '../base';

/**
 * Service for AgentHub LLM gateway chat completions (non-streaming).
 */
export class AgentHubService extends BaseService implements AgentHubServiceModel {
  @track('AgentHub.CreateChatCompletion')
  async createChatCompletion(
    model: string,
    messages: AgentHubChatMessage[],
    options: AgentHubChatCompletionOptions = {},
  ): Promise<AgentHubChatCompletionResponse> {
    if (!model) {
      throw new ValidationError({ message: 'model is required for createChatCompletion' });
    }
    if (!messages?.length) {
      throw new ValidationError({ message: 'messages must not be empty for createChatCompletion' });
    }

    // Tool schemas, tool-call arguments and tool names are caller- or model-defined:
    // they bypass the snake_case conversion so their keys survive intact.
    const { tools, toolChoice, signal, ...generation } = options;
    const body: Record<string, unknown> = camelToSnakeCaseKeys(generation);
    body.messages = messages.map(toWireMessage);
    if (tools !== undefined) {
      body.tools = tools;
    }
    if (toolChoice !== undefined) {
      body.tool_choice = toolChoice;
    }

    const response = await this.post<RawAgentHubChatCompletionResponse>(
      AGENTHUB_ENDPOINTS.CREATE_CHAT_COMPLETION,
      body,
      {
        headers: createHeaders({ [LLM_GATEWAY_MODEL_NAME]: model }),
        signal,
      },
    );
    return fromWireResponse(response.data);
  }
}

/** Tool results take the normalized `{ result, call_id }` content shape; other roles send text. */
function toWireMessage(message: AgentHubChatMessage): RawAgentHubChatMessage {
  const { role, content, toolCalls, toolCallId } = message;
  const text = content ?? '';
  if (role === AgentHubMessageRole.Tool) {
    if (!toolCallId) {
      throw new ValidationError({ message: 'toolCallId is required on tool messages for createChatCompletion' });
    }
    return { role, content: { result: text, call_id: toolCallId } };
  }
  const wire: RawAgentHubChatMessage = { role, content: text };
  if (toolCalls !== undefined) {
    wire.tool_calls = toolCalls;
  }
  return wire;
}

function fromWireChoice(choice: RawAgentHubChatCompletionChoice): AgentHubChatCompletionChoice {
  const { role, content, tool_calls } = choice.message;
  const message: AgentHubChatCompletionMessage = { role, content: content ?? null };
  if (tool_calls !== undefined) {
    message.toolCalls = tool_calls;
  }
  return { index: choice.index, message, finishReason: choice.finish_reason };
}

/** Choices are mapped by hand so tool-call argument keys are never rewritten. */
function fromWireResponse(data: RawAgentHubChatCompletionResponse): AgentHubChatCompletionResponse {
  return {
    id: data.id,
    object: data.object,
    model: data.model,
    createdTime: new Date(data.created * 1000).toISOString(),
    choices: data.choices.map(fromWireChoice),
    usage: snakeToCamelCaseKeys(data.usage),
  };
}
