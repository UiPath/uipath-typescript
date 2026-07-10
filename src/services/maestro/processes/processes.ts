import { MaestroProcessGetAllResponse, ProcessIncidentGetResponse, ProcessGetTopRunCountResponse, ProcessGetTopFaultedCountResponse, ProcessGetTopDurationResponse, GetTopRunCountResponse, GetTopDurationResponse, ElementGetTopFailedCountResponse, IncidentTimelineResponse, InstanceStatusTimelineResponse, ElementStats, InstanceStats } from '../../../models/maestro';
import type { RawElementGetTopFailedCountResponse, RawInstanceStats } from '../../../models/maestro/insights.internal-types';
import { InstanceStatsMap } from '../../../models/maestro/insights.constants';
import { transformData } from '../../../utils/transform';
import type { MaestroProcessStatsRequest, TimelineOptions, TopQueryOptions } from '../../../models/maestro';
import type { IUiPath } from '../../../core/types';
import { MAESTRO_ENDPOINTS } from '../../../utils/constants/endpoints';
import type { MaestroProcessesServiceModel } from '../../../models/maestro/processes.models';
import { createProcessWithMethods } from '../../../models/maestro/processes.models';
import { buildInsightsTopBody, buildInsightsTimelineBody, buildInsightsCommonBody } from '../insights';
import { BpmnHelpers } from './helpers';
import { track } from '../../../core/telemetry';
import { createHeaders } from '../../../utils/http/headers';
import { FOLDER_KEY } from '../../../utils/constants/headers';
import { BaseService } from '../../base';
import { ProcessInstancesService } from './process-instances';

/**
 * Service for interacting with Maestro Processes
 */
export class MaestroProcessesService extends BaseService implements MaestroProcessesServiceModel {
  private processInstancesService: ProcessInstancesService;

  /**
   * Creates an instance of the Maestro Processes service.
   *
   * @param instance - UiPath SDK instance providing authentication and configuration
   */
  constructor(instance: IUiPath) {
    super(instance);
    this.processInstancesService = new ProcessInstancesService(instance);
  }

  @track('MaestroProcesses.GetAll')
  async getAll(): Promise<MaestroProcessGetAllResponse[]> {
    const response = await this.get<{ processes: Omit<MaestroProcessGetAllResponse, 'name'>[] }>(
      MAESTRO_ENDPOINTS.PROCESSES.GET_ALL,
    );

    // Extract processes array from response data and add name field
    const processes = response.data?.processes || [];
    const processesWithName = processes.map(process => ({
      ...process,
      name: process.packageId
    }));

    // Add methods to each process
    return processesWithName.map(process => createProcessWithMethods(process, this));
  }

  @track('MaestroProcesses.GetIncidents')
  async getIncidents(processKey: string, folderKey: string): Promise<ProcessIncidentGetResponse[]> {
    const rawResponse = await this.get<any[]>(
      MAESTRO_ENDPOINTS.INCIDENTS.GET_BY_PROCESS(processKey),
      {
        headers: createHeaders({ [FOLDER_KEY]: folderKey })
      }
    );

    // Fetch BPMN XML and add element name/type to each incident
    return BpmnHelpers.enrichIncidentsWithBpmnData(rawResponse.data || [], folderKey, this.processInstancesService);
  }

  @track('MaestroProcesses.GetTopRunCount')
  async getTopRunCount(startTime: Date, endTime: Date, options?: TopQueryOptions): Promise<ProcessGetTopRunCountResponse[]> {
    const { data } = await this.post<GetTopRunCountResponse[]>(
      MAESTRO_ENDPOINTS.INSIGHTS.TOP_PROCESSES_BY_RUN_COUNT,
      buildInsightsTopBody(startTime, endTime, false, options)
    );
    return (data ?? []).map(process => ({ ...process, name: process.packageId }));
  }

  @track('MaestroProcesses.GetTopElementFailedCount')
  async getTopElementFailedCount(startTime: Date, endTime: Date, options?: TopQueryOptions): Promise<ElementGetTopFailedCountResponse[]> {
    const { data } = await this.post<RawElementGetTopFailedCountResponse[]>(
      MAESTRO_ENDPOINTS.INSIGHTS.TOP_ELEMENTS_WITH_FAILURE,
      buildInsightsTopBody(startTime, endTime, false, options)
    );
    return (data ?? []).map(item => ({
      elementName: item.elementName,
      elementType: item.elementType,
      processKey: item.processKey,
      failedCount: item.count,
    }));
  }

  @track('MaestroProcesses.GetInstanceStatusTimeline')
  async getInstanceStatusTimeline(
    startTime: Date,
    endTime: Date,
    options?: TimelineOptions,
  ): Promise<InstanceStatusTimelineResponse[]> {
    const { data } = await this.post<InstanceStatusTimelineResponse[]>(
      MAESTRO_ENDPOINTS.INSIGHTS.INSTANCE_STATUS_BY_DATE,
      buildInsightsTimelineBody(startTime, endTime, false, options),
    );
    return data ?? [];
  }

  @track('MaestroProcesses.GetIncidentsTimeline')
  async getIncidentsTimeline(
    startTime: Date,
    endTime: Date,
    options?: TimelineOptions,
  ): Promise<IncidentTimelineResponse[]> {
    const { data } = await this.post<{ dataPoints?: IncidentTimelineResponse[] }>(
      MAESTRO_ENDPOINTS.INSIGHTS.INCIDENTS_BY_TIME_WINDOW,
      buildInsightsTimelineBody(startTime, endTime, false, options),
    );
    return data?.dataPoints ?? [];
  }

  @track('MaestroProcesses.GetTopFaultedCount')
  async getTopFaultedCount(startTime: Date, endTime: Date, options?: TopQueryOptions): Promise<ProcessGetTopFaultedCountResponse[]> {
    const { data } = await this.post<GetTopRunCountResponse[]>(
      MAESTRO_ENDPOINTS.INSIGHTS.TOP_PROCESSES_WITH_FAILURE,
      buildInsightsTopBody(startTime, endTime, false, options)
    );
    return (data ?? []).map(item => ({
      packageId: item.packageId,
      processKey: item.processKey,
      faultedCount: item.runCount,
      name: item.packageId,
    }));
  }

  @track('MaestroProcesses.GetTopExecutionDuration')
  async getTopExecutionDuration(startTime: Date, endTime: Date, options?: TopQueryOptions): Promise<ProcessGetTopDurationResponse[]> {
    const { data } = await this.post<GetTopDurationResponse[]>(
      MAESTRO_ENDPOINTS.INSIGHTS.TOP_PROCESSES_BY_DURATION,
      buildInsightsTopBody(startTime, endTime, false, options)
    );
    return (data ?? []).map(process => ({ ...process, name: process.packageId }));
  }

  @track('MaestroProcesses.GetElementStats')
  async getElementStats(request: MaestroProcessStatsRequest): Promise<ElementStats[]> {
    const { data } = await this.post<ElementStats[]>(
      MAESTRO_ENDPOINTS.INSIGHTS.ELEMENT_COUNT_BY_STATUS,
      buildInsightsCommonBody(request)
    );
    return data ?? [];
  }

  @track('MaestroProcesses.GetInstanceStats')
  async getInstanceStats(request: MaestroProcessStatsRequest): Promise<InstanceStats> {
    const { data } = await this.post<RawInstanceStats>(
      MAESTRO_ENDPOINTS.INSIGHTS.INSTANCE_COUNT_BY_STATUS,
      buildInsightsCommonBody(request)
    );
    return transformData(data, InstanceStatsMap) as unknown as InstanceStats;
  }
}
