import { CaseGetAllResponse } from '../../../models/maestro';
import { CaseGetByNameOptions } from '../../../models/maestro/cases.types';
import { ProcessType } from '../../../models/maestro/cases.internal-types';
import { BaseService } from '../../base';
import { MAESTRO_ENDPOINTS } from '../../../utils/constants/endpoints';
import type { CasesServiceModel } from '../../../models/maestro/cases.models';
import { track } from '../../../core/telemetry';
import { createParams } from '../../../utils/http/params';
import { NotFoundError } from '../../../core/errors';
import { validateGetByNameArgs } from '../../../utils/validation/name-validator';

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
   * Retrieves a single case process by name, optionally scoped to a folder.
   *
   * Implemented as a client-side filter over `getAll()` because the Maestro
   * `/api/v1/processes/summary` endpoint returns the full list and exposes no
   * name-based lookup. `folderPath` is matched against the `folderName` field
   * returned by `getAll()`; `folderKey` is matched against `folderKey`. When
   * neither is supplied, the SDK falls back to the init-time folderKey
   * (e.g. `uipath:folder-key` meta tag in coded-app deployments). No extra
   * network call; the data was already fetched.
   *
   * @param name - Case process name to search for
   * @param options - Optional folderPath / folderKey scoping
   * @returns Promise resolving to a single case process
   * @throws ValidationError when inputs are malformed; NotFoundError when no match
   *
   * @example
   * ```typescript
   * import { Cases } from '@uipath/uipath-typescript/cases';
   *
   * const cases = new Cases(sdk);
   *
   * const caseProcess = await cases.getByName('OnboardingCase', {
   *   folderPath: 'Shared/Onboarding',
   * });
   * console.log(caseProcess.processKey, caseProcess.runningCount);
   * ```
   */
  @track('Cases.GetByName')
  async getByName(
    name: string,
    options: CaseGetByNameOptions = {},
  ): Promise<CaseGetAllResponse> {
    const validated = validateGetByNameArgs(
      'Case',
      name,
      options.folderPath,
      options.folderKey,
    );

    // Fall back to init-time folderKey (e.g. uipath:folder-key meta tag) only
    // when the caller didn't supply any folder context.
    const effectiveFolderKey =
      validated.folderKey ?? (validated.folderPath ? undefined : this.config.folderKey);

    const all = await this.getAll();
    const match = all.find(
      (c) =>
        c.name === validated.name &&
        (validated.folderPath ? c.folderName === validated.folderPath : true) &&
        (effectiveFolderKey ? c.folderKey === effectiveFolderKey : true),
    );

    if (!match) {
      const folderHint =
        validated.folderPath ? ` in folder '${validated.folderPath}'`
        : effectiveFolderKey ? ` in folder (key: ${effectiveFolderKey})`
        : '';
      throw new NotFoundError({
        message: `Case '${validated.name}' not found${folderHint}.`,
      });
    }
    return match;
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