/**
 * Maestro Cases Models
 * Model classes for Maestro cases
 */

import { CaseGetAllResponse} from './cases.types';

/**
 * Service for managing UiPath Maestro Cases
 * 
 * UiPath Maestro Case Management describes solutions that help manage and automate the full flow of complex E2E scenarios.
 */
export interface CasesServiceModel {
  /**
   * @returns Promise resolving to array of Case objects
   * {@link CaseGetAllResponse}
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
  getAll(): Promise<CaseGetAllResponse[]>;
}