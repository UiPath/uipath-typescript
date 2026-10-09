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
 * Request body for sending a message to a running instance
 */
export interface CaseInstanceSendMessageRequestBody {
  name: string;
  reference: string;
  itemData?: Record<string, string | string[]>;
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

/**
 * Raw stage entry from the case instance stages API
 */
export interface RawCaseInstanceStage {
  elementId: string;
  latestStatus: string;
  startedTimeUtc?: string | null;
  completedTimeUtc?: string | null;
}

/**
 * Raw response from the case instance stages API
 */
export interface RawCaseInstanceStagesResponse {
  caseInstanceId: string;
  stages: RawCaseInstanceStage[];
}

/**
 * Case instance stage entry with its time fields renamed to SDK names
 */
export interface CaseInstanceStageStatus {
  elementId: string;
  latestStatus: string;
  startedTime?: string | null;
  completedTime?: string | null;
}
