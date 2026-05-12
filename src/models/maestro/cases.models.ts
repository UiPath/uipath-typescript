/**
 * Maestro Cases Models
 * Model classes for Maestro cases
 */

import { CaseGetAllResponse, CaseGetByNameOptions } from './cases.types';

/**
 * Service for managing UiPath Maestro Cases
 *
 * UiPath Maestro Case Management describes solutions that help manage and automate the full flow of complex E2E scenarios.
 *
 * ### Usage
 *
 * Prerequisites: Initialize the SDK first - see [Getting Started](/uipath-typescript/getting-started/#import-initialize)
 *
 * ```typescript
 * import { Cases } from '@uipath/uipath-typescript/cases';
 *
 * const cases = new Cases(sdk);
 * const allCases = await cases.getAll();
 * ```
 */
export interface CasesServiceModel {
  /**
   * @returns Promise resolving to array of Case objects
   * {@link CaseGetAllResponse}
   * @example
   * ```typescript
   * // Get all case management processes
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
  getAll(): Promise<CaseGetAllResponse[]>;

  /**
   * Retrieves a single case management process by name.
   *
   * @param name - Case process name to search for
   * @param options - Folder scoping (`folderKey` / `folderPath`)
   * @returns Promise resolving to a single case management process
   * {@link CaseGetAllResponse}
   * @throws ValidationError when the name is empty; NotFoundError when no match
   * @example
   * ```typescript
   * // By folder key (GUID)
   * await cases.getByName('OnboardingCase', { folderKey: '5f6dadf1-3677-49dc-8aca-c2999dd4b3ba' });
   *
   * // By folder path
   * await cases.getByName('OnboardingCase', { folderPath: 'Shared/Onboarding' });
   * ```
   */
  getByName(name: string, options?: CaseGetByNameOptions): Promise<CaseGetAllResponse>;
}