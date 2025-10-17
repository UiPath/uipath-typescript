
/**
 * Raw incident response from getAll API
 */
export interface RawIncidentGetAllResponse {
    count: number;
    errorMessage: string;
    errorCode: string;
    firstTimeUtc: string;
    processKey: string;
  }