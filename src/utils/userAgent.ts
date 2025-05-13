import { HEADERS } from './constants';

/**
 * Constants for header keys
 */
export const HEADER_USER_AGENT = 'X-UIPATH-UserAgent';

/**
 * Generates a user agent string for API requests.
 * 
 * @param specificComponent - The specific component making the request (e.g. "JobsService.retrieve")
 * @returns The formatted user agent string
 */
export function userAgentValue(specificComponent: string): string {
  const product = 'UiPath.TypeScript.Sdk';
  const productComponent = `UiPath.TypeScript.Sdk.Activities.${specificComponent}`;
  
  // TODO: Get version from package.json
  const version = '0.1.0';

  return `${product}/${productComponent}/${version}`;
}

/**
 * Creates a user agent header for API requests.
 * 
 * @param specificComponent - The specific component making the request
 * @returns Record containing the user agent header
 */
export function headerUserAgent(specificComponent: string): Record<string, string> {
  return { [HEADERS.USER_AGENT]: userAgentValue(specificComponent) };
} 