import { CaseGetAllResponse } from '../../../models/maestro';
import { CaseGetByNameOptions } from '../../../models/maestro/cases.types';
import { ProcessType } from '../../../models/maestro/cases.internal-types';
import { BaseService } from '../../base';
import { MAESTRO_ENDPOINTS } from '../../../utils/constants/endpoints';
import type { CasesServiceModel } from '../../../models/maestro/cases.models';
import { track } from '../../../core/telemetry';
import { createParams } from '../../../utils/http/params';
import { findMaestroResourceByName, MaestroResourceType } from '../helpers/get-by-name';
import { validateName } from '../../../utils/validation/name-validator';

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
   * Retrieves a single case management process by name.
   *
   * @param name - Case process name to search for
   * @param options - Folder scoping (`folderKey` / `folderPath`)
   * @returns Promise resolving to a single case management process
   * @throws ValidationError when the name is empty; NotFoundError when no match
   *
   * @example
   * ```typescript
   * import { Cases } from '@uipath/uipath-typescript/cases';
   *
   * const cases = new Cases(sdk);
   *
   * // By folder key (GUID)
   * await cases.getByName('OnboardingCase', { folderKey: '5f6dadf1-3677-49dc-8aca-c2999dd4b3ba' });
   *
   * // By folder path
   * await cases.getByName('OnboardingCase', { folderPath: 'Shared/Onboarding' });
   * ```
   */
  @track('Cases.GetByName')
  async getByName(
    name: string,
    options: CaseGetByNameOptions = {},
  ): Promise<CaseGetAllResponse> {
    const validatedName = validateName(MaestroResourceType.Case, name);
    const all = await this.getAll();
    return findMaestroResourceByName(MaestroResourceType.Case, all, validatedName, {
      folderPath: options.folderPath,
      folderKey: options.folderKey,
      fallbackFolderKey: this.config.folderKey,
    });
  }
}