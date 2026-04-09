import { Product } from './policies.types';

/**
 * Product information associated with a license type
 */
export interface LicenseTypeProduct {
  /** Product details */
  product: Product;
}

/**
 * License type definition
 */
export interface LicenseType {
  /** License type name identifier */
  name: string;
  /** Human-readable license type label */
  label: string;
  /** Products associated with this license type */
  licenseTypeProducts: LicenseTypeProduct[];
  /** Whether the license type is restricted */
  isRestricted: boolean;
}
