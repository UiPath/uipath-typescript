import { CaseGetAllResponse, CaseGetTopRunCountResponse, CaseGetTopFaultedCountResponse, CaseGetTopDurationResponse, GetTopRunCountResponse, GetTopDurationResponse, ElementGetTopFailedCountResponse, IncidentTimelineResponse, InstanceStatusTimelineResponse, ElementStats, InstanceStats } from '../../../models/maestro';
import type { RawElementGetTopFailedCountResponse, RawInstanceStats } from '../../../models/maestro/insights.internal-types';
import { InstanceStatsMap } from '../../../models/maestro/insights.constants';
import { transformData } from '../../../utils/transform';
import type { MaestroProcessStatsRequest, TimelineOptions, TopQueryOptions } from '../../../models/maestro';
import { ProcessType } from '../../../models/maestro/cases.internal-types';
import { MAESTRO_ENDPOINTS } from '../../../utils/constants/endpoints';
import type { CasesServiceModel } from '../../../models/maestro/cases.models';
import { createCaseWithMethods, CaseGetAllWithMethodsResponse } from '../../../models/maestro/cases.models';
import { buildInsightsTopBody, buildInsightsTimelineBody, buildInsightsCommonBody } from '../insights';
import { BaseService } from '../../base';
import { track } from '../../../core/telemetry';
import { createParams } from '../../../utils/http/params';

/**
 * Service for interacting with UiPath Maestro Cases
 */
export class CasesService extends BaseService implements CasesServiceModel {
  @track('Cases.GetAll')
  async getAll(): Promise<CaseGetAllWithMethodsResponse[]> {
    const params = createParams({
      processType: ProcessType.CaseManagement
    });

    const response = await this.get<{ processes: Omit<CaseGetAllResponse, 'name'>[] }>(
      MAESTRO_ENDPOINTS.PROCESSES.GET_ALL,
      { params }
    );

    // Extract processes array from response data and add name field
    const cases = response.data?.processes || [];
    return cases.map(caseItem => createCaseWithMethods({
      ...caseItem,
      name: this.extractCaseName(caseItem.packageId)
    }, this));
  }

  @track('Cases.GetTopRunCount')
  async getTopRunCount(startTime: Date, endTime: Date, options?: TopQueryOptions): Promise<CaseGetTopRunCountResponse[]> {
    const { data } = await this.post<GetTopRunCountResponse[]>(
      MAESTRO_ENDPOINTS.INSIGHTS.TOP_PROCESSES_BY_RUN_COUNT,
      buildInsightsTopBody(startTime, endTime, true, options)
    );
    return (data ?? []).map(process => ({ ...process, name: this.extractCaseName(process.packageId) }));
  }

  @track('Cases.GetTopElementFailedCount')
  async getTopElementFailedCount(startTime: Date, endTime: Date, options?: TopQueryOptions): Promise<ElementGetTopFailedCountResponse[]> {
    const { data } = await this.post<RawElementGetTopFailedCountResponse[]>(
      MAESTRO_ENDPOINTS.INSIGHTS.TOP_ELEMENTS_WITH_FAILURE,
      buildInsightsTopBody(startTime, endTime, true, options)
    );
    return (data ?? []).map(item => ({
      elementName: item.elementName,
      elementType: item.elementType,
      processKey: item.processKey,
      failedCount: item.count,
    }));
  }

  @track('Cases.GetInstanceStatusTimeline')
  async getInstanceStatusTimeline(
    startTime: Date,
    endTime: Date,
    options?: TimelineOptions,
  ): Promise<InstanceStatusTimelineResponse[]> {
    const { data } = await this.post<InstanceStatusTimelineResponse[]>(
      MAESTRO_ENDPOINTS.INSIGHTS.INSTANCE_STATUS_BY_DATE,
      buildInsightsTimelineBody(startTime, endTime, true, options),
    );
    return data ?? [];
  }

  @track('Cases.GetIncidentsTimeline')
  async getIncidentsTimeline(
    startTime: Date,
    endTime: Date,
    options?: TimelineOptions,
  ): Promise<IncidentTimelineResponse[]> {
    const { data } = await this.post<{ dataPoints?: IncidentTimelineResponse[] }>(
      MAESTRO_ENDPOINTS.INSIGHTS.INCIDENTS_BY_TIME_WINDOW,
      buildInsightsTimelineBody(startTime, endTime, true, options),
    );
    return data?.dataPoints ?? [];
  }

  @track('Cases.GetTopFaultedCount')
  async getTopFaultedCount(startTime: Date, endTime: Date, options?: TopQueryOptions): Promise<CaseGetTopFaultedCountResponse[]> {
    const { data } = await this.post<GetTopRunCountResponse[]>(
      MAESTRO_ENDPOINTS.INSIGHTS.TOP_PROCESSES_WITH_FAILURE,
      buildInsightsTopBody(startTime, endTime, true, options)
    );
    return (data ?? []).map(item => ({
      packageId: item.packageId,
      processKey: item.processKey,
      faultedCount: item.runCount,
      name: this.extractCaseName(item.packageId),
    }));
  }

  @track('Cases.GetTopExecutionDuration')
  async getTopExecutionDuration(startTime: Date, endTime: Date, options?: TopQueryOptions): Promise<CaseGetTopDurationResponse[]> {
    const { data } = await this.post<GetTopDurationResponse[]>(
      MAESTRO_ENDPOINTS.INSIGHTS.TOP_PROCESSES_BY_DURATION,
      buildInsightsTopBody(startTime, endTime, true, options)
    );
    return (data ?? []).map(process => ({ ...process, name: this.extractCaseName(process.packageId) }));
  }

  @track('Cases.GetElementStats')
  async getElementStats(request: MaestroProcessStatsRequest): Promise<ElementStats[]> {
    const { data } = await this.post<ElementStats[]>(
      MAESTRO_ENDPOINTS.INSIGHTS.ELEMENT_COUNT_BY_STATUS,
      buildInsightsCommonBody(request)
    );
    return data ?? [];
  }

  @track('Cases.GetInstanceStats')
  async getInstanceStats(request: MaestroProcessStatsRequest): Promise<InstanceStats> {
    const { data } = await this.post<RawInstanceStats>(
      MAESTRO_ENDPOINTS.INSIGHTS.INSTANCE_COUNT_BY_STATUS,
      buildInsightsCommonBody(request)
    );
    return transformData(data, InstanceStatsMap) as unknown as InstanceStats;
  }

  /**
   * Extract a readable case name from the packageId
   * @param packageId - The full package identifier
   * @returns A human-readable case name
   * @private
   */
  private extractCaseName(packageId: string): string {
    // Check if packageId contains "CaseManagement."
    const caseManagementIndex = packageId.indexOf('CaseManagement.');

    if (caseManagementIndex !== -1) {
      // Extract everything after "CaseManagement."
      const afterCaseManagement = packageId.substring(caseManagementIndex + 'CaseManagement.'.length);

      // Replace hyphens with spaces for better readability
      return afterCaseManagement.replace(/-/g, ' ');
    }

    // If no "CaseManagement.", return the whole packageId
    return packageId;
  }
}
