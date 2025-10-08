
/**
 * Raw incident summary response from getAll API
 */
export interface RawIncidentSummaryResponse {
    count: number;
    errorMessage: string;
    errorCode: string;
    firstTimeUtc: string;
    processKey: string;
  }