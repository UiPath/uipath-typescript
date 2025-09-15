import { AUTH_CONSTANTS } from '../../constants/auth.js';

/**
 * Calculate token expiration timestamp from expires_in seconds
 * @param expiresIn - Token expiration time in seconds
 * @returns Expiration timestamp in milliseconds
 */
export const calculateExpirationTime = (expiresIn: number): number => {
  return Date.now() + (expiresIn * AUTH_CONSTANTS.CONVERSION.SECONDS_TO_MS);
};

/**
 * Get formatted expiration date string
 * @param expiresIn - Token expiration time in seconds
 * @returns Formatted date string
 */
export const getFormattedExpirationDate = (expiresIn: number): string => {
  const expirationTime = calculateExpirationTime(expiresIn);
  return new Date(expirationTime).toLocaleString();
};