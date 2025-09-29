import { CaseGetAllResponse } from '../../models/maestro';
import { ProcessType } from '../../models/maestro/cases.internal-types';
import { BaseService } from '../base';
import { Config } from '../../core/config/config';
import { ExecutionContext } from '../../core/context/execution';
import { TokenManager } from '../../core/auth/token-manager';
import { MAESTRO_ENDPOINTS } from '../../utils/constants/endpoints';
import type { CasesServiceModel } from '../../models/maestro/cases.models';
import { track } from '../../core/telemetry';
import { createParams } from '../../utils/http/params';

/**
 * Service for interacting with UiPath Maestro Cases
 */
export class CasesService extends BaseService implements CasesServiceModel {
  /**
   * @hideconstructor
   */
  constructor(config: Config, executionContext: ExecutionContext, tokenManager: TokenManager) {
    super(config, executionContext, tokenManager);
  }

  /**
   * Get all case management processes with their instance statistics
   * @returns Promise resolving to array of Case objects
   * 
   * @example
   * ```typescript
   * // Get all case management processes
   * const cases = await sdk.maestro.cases.getAll();
   * 
   * // Access case information
   * for (const caseProcess of cases) {
   *   console.log(`Case Process: ${caseProcess.processKey}`);
   *   console.log(`Running instances: ${caseProcess.runningCount}`);
   *   console.log(`Completed instances: ${caseProcess.completedCount}`);
   * }
   * 
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
}