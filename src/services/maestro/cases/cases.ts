import { CaseGetAllResponse, CaseGetTopRunCountResponse, GetTopRunCountResponse } from '../../../models/maestro';
import { InstanceStatusByDateResponse, MaestroInsightsOptions } from '../../../models/common';
import { ProcessType } from '../../../models/maestro/cases.internal-types';
import { MAESTRO_ENDPOINTS } from '../../../utils/constants/endpoints';
import type { CasesServiceModel } from '../../../models/maestro/cases.models';
import { buildInsightsTopBody } from '../insights';
import { BaseService } from '../../base';
import { track } from '../../../core/telemetry';
import { createParams } from '../../../utils/http/params';

/**
 * Service for interacting with UiPath Maestro Cases
 */
export class CasesService extends BaseService implements CasesServiceModel {
  /**
   * Get all case management processes with their instance statistics
   * @returns Promise resolving to array of Case objects
   *
   * @example
   * ```typescript
   * import { Cases } from '@uipath/uipath-typescript/cases';
   *
   * const cases = new Cases(sdk);
   * const allCases = await cases.getAll();
   *
   * // Access case information
   * for (const caseProcess of allCases) {
   *   console.log(`Case Process: ${caseProcess.processKey}`);
   *   console.log(`Running instances: ${caseProcess.runningCount}`);
   *   console.log(`Completed instances: ${caseProcess.completedCount}`);
   * }
   * ```
   */
  @track('Cases.GetAll')
  async getAll(): Promise<CaseGetAllResponse[]> {
    const params = createParams({
      processType: ProcessType.CaseManagement
    });
    
    const response = await this.get<{ processes: Omit<CaseGetAllResponse, 'name'>[] }>(
      MAESTRO_ENDPOINTS.PROCESSES.GET_ALL,
      { params }
    );
    
    // Extract processes array from response data and add name field
    const cases = response.data?.processes || [];
    return cases.map(caseItem => ({
      ...caseItem,
      name: this.extractCaseName(caseItem.packageId)
    }));
  }

  /**
   * Get the top 5 case processes ranked by run count within a time range.
   *
   * Returns an array of up to 5 case processes sorted by how many times they were executed,
   * useful for identifying the most active case processes in a given period.
   *
   * @param startTime - Start of the time range to query
   * @param endTime - End of the time range to query
   * @returns Promise resolving to an array of {@link CaseGetTopRunCountResponse}
   * @example
   * ```typescript
   * import { Cases } from '@uipath/uipath-typescript/cases';
   *
   * const cases = new Cases(sdk);
   *
   * // Get top case processes by run count for the last 7 days
   * const topProcesses = await cases.getTopRunCount(
   *   new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
   *   new Date()
   * );
   *
   * for (const process of topProcesses) {
   *   console.log(`${process.packageId}: ${process.runCount} runs`);
   * }
   * ```
   */
  @track('Cases.GetTopRunCount')
  async getTopRunCount(startTime: Date, endTime: Date): Promise<CaseGetTopRunCountResponse[]> {
    const { data } = await this.post<GetTopRunCountResponse[]>(
      MAESTRO_ENDPOINTS.INSIGHTS.TOP_PROCESSES_BY_RUN_COUNT,
      buildInsightsTopBody(startTime, endTime, true)
    );
    return (data ?? []).map(process => ({ ...process, name: this.extractCaseName(process.packageId) }));
  }

  /**
   * Get instance status counts aggregated by date for case management.
   *
   * Returns time-bucketed counts of case instances grouped by status (Completed, Faulted, Cancelled),
   * useful for rendering time-series charts. The time bucket granularity is controlled by `timeSliceUnit`.
   *
   * @param startTime - Start of the time range in epoch milliseconds
   * @param endTime - End of the time range in epoch milliseconds
   * @param options - Optional settings for time bucketing granularity
   * @returns Promise resolving to an array of {@link InstanceStatusByDateResponse}
   */
  @track('Cases.GetInstanceStatusByDate')
  async getInstanceStatusByDate(
    startTime: number,
    endTime: number,
    options?: MaestroInsightsOptions,
  ): Promise<InstanceStatusByDateResponse[]> {
    const response = await this.post<InstanceStatusByDateResponse[]>(
      MAESTRO_ENDPOINTS.INSIGHTS.INSTANCE_STATUS_BY_DATE,
      {
        commonParams: {
          startTime,
          endTime,
          isCaseManagement: true,
        },
        timeSliceUnit: options?.timeSliceUnit,
        timezoneOffset: new Date().getTimezoneOffset() * -1,
      },
    );

    return response.data ?? [];
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