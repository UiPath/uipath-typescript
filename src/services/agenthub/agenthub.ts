import { track } from '../../core/telemetry';
import { ValidationError } from '../../core/errors';
import type {
  AgentHubChatCompletionOptions,
  AgentHubChatCompletionRequest,
  AgentHubChatCompletionResponse,
} from '../../models/agenthub/agenthub.types';
import type { RawAgentHubChatCompletionResponse } from '../../models/agenthub/agenthub.internal-types';
import type { AgentHubServiceModel } from '../../models/agenthub/agenthub.models';
import { AGENTHUB_ENDPOINTS } from '../../utils/constants/endpoints';
import { LLM_GATEWAY_MODEL_NAME } from '../../utils/constants/headers';
import { camelToSnakeCaseKeys, snakeToCamelCaseKeys } from '../../utils/transform';
import { BaseService } from '../base';

/**
 * Service for AgentHub LLM gateway chat completions (non-streaming).
 *
 * @experimental
 *
 * /// warning
 * Preview: This service is experimental and may change or be removed in future releases.
 * ///
 */
export class AgentHubService extends BaseService implements AgentHubServiceModel {
  @track('AgentHub.CreateChatCompletion')
  async createChatCompletion(
    request: AgentHubChatCompletionRequest,
    options: AgentHubChatCompletionOptions = {},
  ): Promise<AgentHubChatCompletionResponse> {
    if (!request?.model) {
      throw new ValidationError({ message: 'model is required for createChatCompletion' });
    }
    if (!request.messages?.length) {
      throw new ValidationError({ message: 'messages must not be empty for createChatCompletion' });
    }

    // Tool `parameters` is caller-defined JSON Schema — leave it verbatim so
    // recursive snake_case conversion cannot rewrite schema property names.
    const { tools, ...envelope } = request;
    const body = camelToSnakeCaseKeys(envelope);
    if (tools !== undefined) {
      body.tools = tools;
    }

    const response = await this.post<RawAgentHubChatCompletionResponse>(
      AGENTHUB_ENDPOINTS.CREATE_CHAT_COMPLETION,
      body,
      {
        headers: { [LLM_GATEWAY_MODEL_NAME]: request.model },
        signal: options.signal,
      },
    );
    return snakeToCamelCaseKeys(response.data) as AgentHubChatCompletionResponse;
  }
}
