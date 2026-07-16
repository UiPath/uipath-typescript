/**
 * ExchangeService - Exchange operations for Conversations
 *
 * Exchanges represent individual request-response pairs within a conversation.
 * Each exchange contains messages from the user and assistant.
 */

// Core SDK imports
import type { IUiPath } from '@/core/types';
import { track } from '@/core/telemetry';
import { BaseService } from '@/services/base';
import type { QueryParams } from '@/models/common/request-spec';

// Models
import type {
  ConversationalAgentOptions,
  CreateFeedbackOptions,
  Exchange,
  ExchangeServiceModel,
  FeedbackCreateResponse,
  ExchangeGetAllOptions,
  ExchangeGetByIdOptions,
  ExchangeGetResponse
} from '@/models/conversational-agent';

// Utils
import { CONVERSATIONAL_PAGINATION, CONVERSATIONAL_TOKEN_PARAMS } from '@/utils/constants/common';
import { EXCHANGE_ENDPOINTS } from '@/utils/constants/endpoints';
import { PaginatedResponse } from '@/utils/pagination';
import { PaginationHelpers } from '@/utils/pagination/helpers';
import { PaginationType } from '@/utils/pagination/internal-types';

// Local imports
import { transformExchange } from '@/services/conversational-agent/helpers';
import { buildConversationalAgentHeaders } from '@/services/conversational-agent/helpers/header';

/**
 * Service for exchange operations within a conversation
 *
 * Provides methods to list, retrieve, and provide feedback on exchanges.
 * Exchanges are the conversation turns containing user prompts and assistant responses.
 *
 * @example
 * ```typescript
 * import { Exchanges } from '@uipath/uipath-typescript/conversational-agent';
 *
 * const exchanges = new Exchanges(sdk);
 *
 * // List all exchanges in a conversation
 * const conversationExchanges = await exchanges.getAll(conversationId);
 *
 * // Get a specific exchange with messages
 * const exchangeDetails = await exchanges.getById(conversationId, exchangeId);
 *
 * // Submit feedback for an exchange
 * await exchanges.createFeedback(conversationId, exchangeId, {
 *   rating: FeedbackRating.Positive,
 *   comment: 'Great response!'
 * });
 * ```
 */
export class ExchangeService extends BaseService implements ExchangeServiceModel {
  /**
   * Creates an instance of the ExchangeService.
   *
   * @param instance - UiPath SDK instance providing authentication and configuration
   * @param options - Optional configuration (e.g. externalUserId for external app auth)
   */
  constructor(instance: IUiPath, options?: ConversationalAgentOptions) {
    super(instance, buildConversationalAgentHeaders(options));
  }

  @track('ConversationalAgent.Exchanges.GetAll')
  async getAll(
    conversationId: string,
    options?: ExchangeGetAllOptions
  ): Promise<PaginatedResponse<ExchangeGetResponse>> {
    const { pageSize, cursor, jumpToPage, ...additionalParams } = options ?? {};
    const paginationParams = cursor ? { cursor, pageSize } : jumpToPage ? { jumpToPage, pageSize } : { pageSize };

    return PaginationHelpers.getAllPaginated<Exchange, ExchangeGetResponse>({
      serviceAccess: this.createPaginationServiceAccess(),
      getEndpoint: () => EXCHANGE_ENDPOINTS.LIST(conversationId),
      paginationParams,
      additionalParams,
      transformFn: transformExchange,
      options: {
        paginationType: PaginationType.TOKEN,
        itemsField: CONVERSATIONAL_PAGINATION.ITEMS_FIELD,
        continuationTokenField: CONVERSATIONAL_PAGINATION.CONTINUATION_TOKEN_FIELD,
        paginationParams: {
          pageSizeParam: CONVERSATIONAL_TOKEN_PARAMS.PAGE_SIZE_PARAM,
          tokenParam: CONVERSATIONAL_TOKEN_PARAMS.TOKEN_PARAM
        }
      }
    });
  }

  @track('ConversationalAgent.Exchanges.GetById')
  async getById(
    conversationId: string,
    exchangeId: string,
    options?: ExchangeGetByIdOptions
  ): Promise<ExchangeGetResponse> {
    const params: QueryParams = {};

    if (options?.messageSort) {
      params.messageSort = options.messageSort;
    }

    const result = await this.get<Exchange>(
      EXCHANGE_ENDPOINTS.GET(conversationId, exchangeId),
      { params }
    );

    return transformExchange(result.data);
  }

  @track('ConversationalAgent.Exchanges.CreateFeedback')
  async createFeedback(
    conversationId: string,
    exchangeId: string,
    options: CreateFeedbackOptions
  ): Promise<FeedbackCreateResponse> {
    const response = await this.post<FeedbackCreateResponse>(
      EXCHANGE_ENDPOINTS.CREATE_FEEDBACK(conversationId, exchangeId),
      options
    );
    return response.data;
  }
}
