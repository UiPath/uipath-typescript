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
   * Retrieves a single case process by name, optionally scoped to a folder.
   *
   * Implemented as a client-side filter over `getAll()` because the Maestro
   * API does not expose a name-based lookup endpoint. `folderPath` is matched
   * client-side against the `folderName` field returned by `getAll()`;
   * `folderKey` matches `folderKey`. When neither is supplied, the SDK falls
   * back to the init-time folderKey (e.g. from the `uipath:folder-key` meta
   * tag in coded-app deployments).
   *
   * Useful for bindings-driven code that has `name` (+ optional folder
   * context) at design time and wants to resolve to the operational
   * `processKey`.
   *
   * @param name - Case process name to search for
   * @param options - Optional folderPath / folderKey scoping
   * @returns Promise resolving to a single case process
   * {@link CaseGetAllResponse}
   * @throws NotFoundError if no case process matches
   * @example
   * ```typescript
   * const caseProcess = await cases.getByName('OnboardingCase', {
   *   folderPath: 'Shared/Onboarding',
   * });
   * console.log(caseProcess.processKey, caseProcess.runningCount);
   * ```
   */
  getByName(name: string, options?: CaseGetByNameOptions): Promise<CaseGetAllResponse>;
}