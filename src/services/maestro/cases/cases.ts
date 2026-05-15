import { CaseGetAllResponse, ProcessGetTopResponse } from '../../../models/maestro';
import { ProcessType } from '../../../models/maestro/cases.internal-types';
import { BaseService } from '../../base';
import { MAESTRO_ENDPOINTS } from '../../../utils/constants/endpoints';
import type { CasesServiceModel } from '../../../models/maestro/cases.models';
import { fetchTopProcesses } from '../insights';
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

  /**
   * Get the top case processes ranked by run count within a time range.
   *
   * Returns an array of case processes sorted by how many times they were executed,
   * useful for identifying the most active case processes in a given period.
   *
   * @param startTime - Start of the time range to query
   * @param endTime - End of the time range to query
   * @returns Promise resolving to an array of {@link ProcessGetTopResponse}
   * @example
   * ```typescript
   * import { Cases } from '@uipath/uipath-typescript/cases';
   *
   * const cases = new Cases(sdk);
   *
   * // Get top case processes by run count for the last 7 days
   * const topProcesses = await cases.getTop(
   *   new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
   *   new Date()
   * );
   *
   * for (const process of topProcesses) {
   *   console.log(`${process.packageId}: ${process.runCount} runs`);
   * }
   * ```
   */
  @track('Cases.GetTop')
  async getTop(startTime: Date, endTime: Date): Promise<ProcessGetTopResponse[]> {
    return fetchTopProcesses(this.post.bind(this), startTime, endTime, true);
  }
}