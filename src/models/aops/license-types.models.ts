import { LicenseType } from './license-types.types';

/**
 * Response type for getting all license types
 * The API returns an array of LicenseType objects directly
 */
export type LicenseTypeGetAllResponse = LicenseType[];

/**
 * Service model interface for LicenseType operations
 */
export interface LicenseTypeServiceModel {
  /**
   * Gets all license types
   */
  getAll(): Promise<LicenseType[]>;
}
