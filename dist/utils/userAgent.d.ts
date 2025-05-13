/**
 * Constants for header keys
 */
export declare const HEADER_USER_AGENT = "X-UIPATH-UserAgent";
/**
 * Generates a user agent string for API requests.
 *
 * @param specificComponent - The specific component making the request (e.g. "JobsService.retrieve")
 * @returns The formatted user agent string
 */
export declare function userAgentValue(specificComponent: string): string;
/**
 * Creates a user agent header for API requests.
 *
 * @param specificComponent - The specific component making the request
 * @returns Record containing the user agent header
 */
export declare function headerUserAgent(specificComponent: string): Record<string, string>;
