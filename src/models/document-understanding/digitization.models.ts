import { StartDigitizationOptions, StartDigitizationResponse } from './digitization.types';

/**
 * Service model interface for Document Understanding Digitization operations
 */
export interface DigitizationServiceModel {
  /**
   * Initiates a document digitization process and
   * extracts text, structure, and metadata from the document.
   * 
   * @param options - Configuration for the digitization request
   * @returns Promise resolving to operation details
   */
  start(options: StartDigitizationOptions): Promise<StartDigitizationResponse>;
}