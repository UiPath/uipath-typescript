/**
 * Internal types for case instances
 * These types are used internally by the SDK and should not be exposed to users
 */


/**
 * Raw Case App Overview from API response
 */
export interface RawCaseAppOverview {
  id: string;
  title: string;
  details: string;
}

/**
 * Raw Case App Configuration from API response
 */
export interface RawCaseAppConfig {
  caseSummary?: string;
  sections?: RawCaseAppOverview[];
}

/**
 * Case JSON Response structure
 * Internal type for the response from the case JSON API endpoint
 */
export interface CaseJsonResponse {
  root?: {
    id?: string;
    type?: string;
    name?: string;
    description?: string;
    caseIdentifier?: string;
    caseAppEnabled?: boolean;
    caseAppConfig?: RawCaseAppConfig;
    data?: any;
  };
  nodes?: any[];
  edges?: any[];
}