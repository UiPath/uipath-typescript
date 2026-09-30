import { BaseService } from '../../base';
import { track } from '../../../core/telemetry';
import type { CaseAppServiceModel } from '../../../models/maestro/case-app.models';
import type {
  CaseAppAdhocTaskStage,
  CaseAppCloseOptions,
  CaseAppCloseResponse,
  CaseAppElementExecution,
  CaseAppGetElementExecutionsOptions,
  CaseAppGetElementExecutionsResponse,
  CaseAppIncidentGetResponse,
  CaseAppInstanceGetAllWithPaginationOptions,
  CaseAppInstanceGetResponse,
  CaseAppSelectStageOptions,
  CaseAppSendMessageResponse,
  CaseAppGetSlaSummaryResponse,
  CaseAppGetStagesResponse,
  CaseAppTriggerAdhocTaskOptions,
} from '../../../models/maestro/case-app.types';
import type {
  RawCaseAppInstance,
  RawCaseAppGetSlaSummaryResponse,
  RawCaseAppAdhocTasksResponse,
  RawCaseAppElementExecution,
  RawCaseAppGetElementExecutionsResponse,
  CaseAppSendMessageRequestBody,
} from '../../../models/maestro/case-app.internal-types';
import type {
  CaseInstanceMessageName,
  CaseInstanceOperationOptions,
  CaseInstanceOperationResponse,
  CaseInstanceSendMessageOptions,
} from '../../../models/maestro/case-instances.types';
import { CaseAppIncidentMap, CaseAppInstanceFilterMap, CaseAppInstanceMap } from '../../../models/maestro/case-app.constants';
import { CASE_INSTANCE_MESSAGE_REFERENCE, TimeFieldTransformMap } from '../../../models/maestro/case-instances.constants';
import { MAESTRO_ENDPOINTS } from '../../../utils/constants/endpoints';
import { PROCESS_INSTANCE_PAGINATION, PROCESS_INSTANCE_TOKEN_PARAMS } from '../../../utils/constants/common';
import { FOLDER_KEY } from '../../../utils/constants/headers';
import { createHeaders } from '../../../utils/http/headers';
import { createParams } from '../../../utils/http/params';
import { transformData, transformRequest } from '../../../utils/transform';
import { HasPaginationOptions, NonPaginatedResponse, PaginatedResponse } from '../../../utils/pagination';
import { PaginationHelpers } from '../../../utils/pagination/helpers';
import { PaginationType } from '../../../utils/pagination/internal-types';

/**
 * Service for Maestro case instances as a case app user, authorized by Case persona grants.
 *
 * @experimental
 *
 * /// warning
 * Preview: This service is experimental and may change or be removed in future releases.
 * ///
 *
 * Method documentation lives on {@link CaseAppServiceModel}, which this class implements.
 */
export class CaseAppService extends BaseService implements CaseAppServiceModel {
  @track('CaseApp.GetAll')
  async getAll<T extends CaseAppInstanceGetAllWithPaginationOptions = CaseAppInstanceGetAllWithPaginationOptions>(
    folderKey: string,
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<CaseAppInstanceGetResponse>
      : NonPaginatedResponse<CaseAppInstanceGetResponse>
  > {
    const { statuses, startedTimeStart, startedTimeEnd, ...rest } = options ?? {};
    const filters = transformRequest(
      {
        ...rest,
        statuses: statuses?.join(','),
        startedTimeStart: startedTimeStart?.toISOString(),
        startedTimeEnd: startedTimeEnd?.toISOString(),
      },
      CaseAppInstanceFilterMap
    );

    return PaginationHelpers.getAll(
      {
        serviceAccess: this.createPaginationServiceAccess(),
        getEndpoint: () => MAESTRO_ENDPOINTS.CASE_APP.GET_ALL,
        headers: createHeaders({ [FOLDER_KEY]: folderKey }),
        transformFn: (item: RawCaseAppInstance) => this.toInstance(item),
        pagination: {
          paginationType: PaginationType.TOKEN,
          itemsField: PROCESS_INSTANCE_PAGINATION.ITEMS_FIELD,
          continuationTokenField: PROCESS_INSTANCE_PAGINATION.CONTINUATION_TOKEN_FIELD,
          paginationParams: {
            pageSizeParam: PROCESS_INSTANCE_TOKEN_PARAMS.PAGE_SIZE_PARAM,
            tokenParam: PROCESS_INSTANCE_TOKEN_PARAMS.TOKEN_PARAM,
          },
        },
        excludeFromPrefix: Object.keys(filters),
      },
      filters as T
    );
  }

  @track('CaseApp.GetStages')
  async getStages(instanceId: string, folderKey: string): Promise<CaseAppGetStagesResponse> {
    const response = await this.get<CaseAppGetStagesResponse>(
      MAESTRO_ENDPOINTS.CASE_APP.GET_STAGES(instanceId),
      { headers: createHeaders({ [FOLDER_KEY]: folderKey }) }
    );
    return response.data;
  }

  @track('CaseApp.GetSlaSummary')
  async getSlaSummary(instanceId: string, folderKey: string): Promise<CaseAppGetSlaSummaryResponse> {
    const response = await this.get<RawCaseAppGetSlaSummaryResponse>(
      MAESTRO_ENDPOINTS.CASE_APP.GET_SLA_SUMMARY(instanceId),
      { headers: createHeaders({ [FOLDER_KEY]: folderKey }) }
    );
    return transformData(response.data, CaseAppInstanceMap) as unknown as CaseAppGetSlaSummaryResponse;
  }

  @track('CaseApp.GetCaseJson')
  async getCaseJson(instanceId: string, folderKey: string): Promise<Record<string, unknown>> {
    const response = await this.get<Record<string, unknown>>(
      MAESTRO_ENDPOINTS.CASE_APP.GET_CASE_JSON(instanceId),
      { headers: createHeaders({ [FOLDER_KEY]: folderKey }) }
    );
    return response.data;
  }

  @track('CaseApp.GetElementExecutions')
  async getElementExecutions(
    instanceId: string,
    folderKey: string,
    options?: CaseAppGetElementExecutionsOptions
  ): Promise<CaseAppGetElementExecutionsResponse> {
    const response = await this.get<RawCaseAppGetElementExecutionsResponse>(
      MAESTRO_ENDPOINTS.CASE_APP.GET_ELEMENT_EXECUTIONS(instanceId),
      {
        headers: createHeaders({ [FOLDER_KEY]: folderKey }),
        params: createParams({ elementTypes: options?.elementTypes?.join(',') }),
      }
    );

    // Sections carry author-defined details, so only the named time fields are renamed.
    const { elementExecutions, ...envelope } = response.data;
    return {
      ...(transformData(envelope, CaseAppInstanceMap) as unknown as Omit<
        CaseAppGetElementExecutionsResponse,
        'elementExecutions'
      >),
      elementExecutions: (elementExecutions ?? []).map(execution => this.toElementExecution(execution)),
    };
  }

  @track('CaseApp.GetIncidents')
  async getIncidents(instanceId: string, folderKey: string): Promise<CaseAppIncidentGetResponse[]> {
    const response = await this.get<Record<string, unknown>[]>(
      MAESTRO_ENDPOINTS.CASE_APP.GET_INCIDENTS(instanceId),
      { headers: createHeaders({ [FOLDER_KEY]: folderKey }) }
    );
    return transformData(response.data ?? [], CaseAppIncidentMap) as unknown as CaseAppIncidentGetResponse[];
  }

  @track('CaseApp.GetAdhocTasks')
  async getAdhocTasks(instanceId: string, folderKey: string): Promise<CaseAppAdhocTaskStage[]> {
    const response = await this.get<RawCaseAppAdhocTasksResponse>(
      MAESTRO_ENDPOINTS.CASE_APP.GET_ADHOC_TASKS(instanceId),
      { headers: createHeaders({ [FOLDER_KEY]: folderKey }) }
    );
    return response.data?.stages ?? [];
  }

  @track('CaseApp.TriggerAdhocTask')
  async triggerAdhocTask(
    instanceId: string,
    folderKey: string,
    taskName: string,
    options?: CaseAppTriggerAdhocTaskOptions
  ): Promise<void> {
    await this.post<void>(
      MAESTRO_ENDPOINTS.CASE_APP.TRIGGER_TASK(instanceId),
      { taskName, ...(options?.taskInput && { taskInput: options.taskInput }) },
      { headers: createHeaders({ [FOLDER_KEY]: folderKey }) }
    );
  }

  @track('CaseApp.SelectStage')
  async selectStage(
    instanceId: string,
    folderKey: string,
    stageName: string,
    options?: CaseAppSelectStageOptions
  ): Promise<void> {
    await this.post<void>(
      MAESTRO_ENDPOINTS.CASE_APP.SELECT_STAGE(instanceId),
      { stageName, ...(options?.waitingStageId && { waitingStageId: options.waitingStageId }) },
      { headers: createHeaders({ [FOLDER_KEY]: folderKey }) }
    );
  }

  @track('CaseApp.SendMessage')
  async sendMessage(
    instanceId: string,
    folderKey: string,
    name: CaseInstanceMessageName,
    options?: CaseInstanceSendMessageOptions
  ): Promise<CaseAppSendMessageResponse> {
    const body: CaseAppSendMessageRequestBody = {
      name,
      reference: options?.reference ?? CASE_INSTANCE_MESSAGE_REFERENCE(instanceId),
      itemData: options?.itemData ?? {},
    };
    const response = await this.post<CaseAppSendMessageResponse>(MAESTRO_ENDPOINTS.CASE_APP.SEND_MESSAGE, body, {
      headers: createHeaders({ [FOLDER_KEY]: folderKey }),
    });
    return response.data;
  }

  @track('CaseApp.Close')
  async close(instanceId: string, folderKey: string, options?: CaseAppCloseOptions): Promise<CaseAppCloseResponse> {
    // The route rejects a missing body, so an empty object is always sent.
    const response = await this.post<CaseAppCloseResponse>(
      MAESTRO_ENDPOINTS.CASE_APP.CLOSE(instanceId),
      { ...options },
      { headers: createHeaders({ [FOLDER_KEY]: folderKey }) }
    );
    return response.data;
  }

  @track('CaseApp.Reopen')
  async reopen(
    instanceId: string,
    folderKey: string,
    startElementId: string,
    options?: CaseInstanceOperationOptions
  ): Promise<CaseInstanceOperationResponse> {
    const response = await this.post<CaseInstanceOperationResponse>(
      MAESTRO_ENDPOINTS.CASE_APP.REOPEN(instanceId),
      { startElementId, ...options },
      { headers: createHeaders({ [FOLDER_KEY]: folderKey }) }
    );
    return response.data;
  }

  private toInstance(item: RawCaseAppInstance): CaseAppInstanceGetResponse {
    const { instanceRuns, ...rest } = item;
    return {
      ...(transformData(rest, CaseAppInstanceMap) as unknown as Omit<CaseAppInstanceGetResponse, 'instanceRuns'>),
      instanceRuns: instanceRuns
        ? (transformData(instanceRuns, TimeFieldTransformMap) as unknown as CaseAppInstanceGetResponse['instanceRuns'])
        : null,
    };
  }

  private toElementExecution(execution: RawCaseAppElementExecution): CaseAppElementExecution {
    const { elementRuns, ...rest } = execution;
    return {
      ...(transformData(rest, TimeFieldTransformMap) as unknown as Omit<CaseAppElementExecution, 'elementRuns'>),
      elementRuns: transformData(elementRuns ?? [], TimeFieldTransformMap) as unknown as CaseAppElementExecution['elementRuns'],
    };
  }
}
