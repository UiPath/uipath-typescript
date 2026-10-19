import { BaseService } from '../../../base';
import {
  DecisionCreateInput,
  DecisionIngestAck,
  DecisionGetOptions,
  DecisionGetAllOptions,
  DecisionQueryOptions,
  DecisionResponse,
  DecisionsPageResponse,
} from '../../../../models/observability/traces/decisions/decisions.types';
import { DecisionsServiceModel } from '../../../../models/observability/traces/decisions/decisions.models';
import {
  DecisionMap,
  TRACE_ID_REGEX,
  DECISION_ID_REGEX,
  DecisionPlatformWireMap,
  DecisionActorKindWireMap,
  DecisionSortFieldWireMap,
} from '../../../../models/observability/traces/decisions/decisions.constants';
import { transformData } from '../../../../utils/transform';
import { DECISIONS_ENDPOINTS } from '../../../../utils/constants/endpoints';
import { DECISIONS_OFFSET_PARAMS, DECISIONS_PAGINATION } from '../../../../utils/constants/common';
import { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../../../../utils/pagination';
import { PaginationHelpers } from '../../../../utils/pagination/helpers';
import { PaginationType } from '../../../../utils/pagination/internal-types';
import { track } from '../../../../core/telemetry';
import { ValidationError } from '../../../../core/errors';
import { createHeaders } from '../../../../utils/http/headers';
import { FOLDER_KEY } from '../../../../utils/constants/headers';

/** Service for recording and reading the Decisions API's Decision Object Model. */
export class DecisionsService extends BaseService implements DecisionsServiceModel {
  @track('Decisions.Create')
  async create(traceId: string, decisions: DecisionCreateInput[], folderKey: string): Promise<DecisionIngestAck[]> {
    if (!TRACE_ID_REGEX.test(traceId)) {
      throw new ValidationError({ message: 'traceId must be 32 hex characters for create' });
    }
    if (!folderKey) {
      throw new ValidationError({ message: 'folderKey is required for create' });
    }
    if (!Array.isArray(decisions) || decisions.length === 0) {
      throw new ValidationError({ message: 'decisions must be a non-empty array for create' });
    }
    for (const decision of decisions) {
      if (!DECISION_ID_REGEX.test(decision.decisionId)) {
        throw new ValidationError({ message: `decisionId '${decision.decisionId}' must be 16 hex characters (an OTEL span ID)` });
      }
    }

    const response = await this.post<DecisionIngestAck[]>(
      DECISIONS_ENDPOINTS.ROOT,
      decisions,
      { params: { traceId }, headers: createHeaders({ [FOLDER_KEY]: folderKey }) }
    );
    return response.data;
  }

  @track('Decisions.GetById')
  async getById(decisionId: string, options?: DecisionGetOptions): Promise<DecisionResponse> {
    if (!DECISION_ID_REGEX.test(decisionId)) {
      throw new ValidationError({ message: 'decisionId must be 16 hex characters (an OTEL span ID) for getById' });
    }

    const params = options?.includeSpans !== undefined ? { includeSpans: options.includeSpans } : undefined;
    const response = await this.get<DecisionResponse>(
      DECISIONS_ENDPOINTS.GET_BY_ID(decisionId),
      { params, headers: createHeaders({ [FOLDER_KEY]: options?.folderKey }) }
    );
    return transformData(response.data, DecisionMap) as unknown as DecisionResponse;
  }

  @track('Decisions.GetAll')
  async getAll<T extends DecisionGetAllOptions = DecisionGetAllOptions>(options?: T): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<DecisionResponse>
      : NonPaginatedResponse<DecisionResponse>
  > {
    const { folderKey, from, to, ...pagedOptions } = options ?? ({} as T);
    const transformDecision = (item: DecisionResponse): DecisionResponse =>
      transformData(item, DecisionMap) as unknown as DecisionResponse;

    return PaginationHelpers.getAll<T, DecisionResponse, DecisionResponse>({
      serviceAccess: this.createPaginationServiceAccess(),
      getEndpoint: () => DECISIONS_ENDPOINTS.ROOT,
      headers: createHeaders({ [FOLDER_KEY]: folderKey }),
      queryParams: {
        ...(from !== undefined ? { from: from.toISOString() } : {}),
        ...(to !== undefined ? { to: to.toISOString() } : {}),
      },
      transformFn: transformDecision,
      pagination: {
        paginationType: PaginationType.OFFSET,
        itemsField: DECISIONS_PAGINATION.ITEMS_FIELD,
        totalCountField: DECISIONS_PAGINATION.TOTAL_COUNT_FIELD,
        paginationParams: {
          pageSizeParam: DECISIONS_OFFSET_PARAMS.PAGE_SIZE_PARAM,
          offsetParam: DECISIONS_OFFSET_PARAMS.OFFSET_PARAM,
          countParam: DECISIONS_OFFSET_PARAMS.COUNT_PARAM,
        },
      },
      excludeFromPrefix: Object.keys(pagedOptions),
    }, pagedOptions as T);
  }

  @track('Decisions.Query')
  async query(options?: DecisionQueryOptions): Promise<DecisionsPageResponse> {
    const { folderKey, platform, actorKind, sortBy, from, to, ...rest } = options ?? {};

    const body: Record<string, unknown> = { ...rest };
    if (platform !== undefined) body.platform = DecisionPlatformWireMap[platform];
    if (actorKind !== undefined) body.actorKind = DecisionActorKindWireMap[actorKind];
    if (sortBy !== undefined) body.sortBy = DecisionSortFieldWireMap[sortBy];
    if (from !== undefined) body.from = from.toISOString();
    if (to !== undefined) body.to = to.toISOString();

    const response = await this.post<{ items: DecisionResponse[]; totalCount: number; effectiveFrom?: string }>(
      DECISIONS_ENDPOINTS.QUERY,
      body,
      { headers: createHeaders({ [FOLDER_KEY]: folderKey }) }
    );

    return {
      ...response.data,
      items: transformData(response.data.items, DecisionMap) as unknown as DecisionResponse[],
    };
  }
}
