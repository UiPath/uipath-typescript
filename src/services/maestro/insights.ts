import { TimelineOptions } from '../../models/maestro';
import type { MaestroProcessStatsRequest, TopQueryOptions } from '../../models/maestro';

/**
 * Builds the request body for Insights RTM "top" endpoints.
 *
 * @param startTime - Start of the time range to query
 * @param endTime - End of the time range to query
 * @param isCaseManagement - Whether to filter for case management processes
 * @param options - Optional filters (packageId, processKey, version)
 * @returns Request body for the Insights RTM endpoint
 * @internal
 */
export function buildInsightsTopBody(startTime: Date, endTime: Date, isCaseManagement: boolean, options?: TopQueryOptions) {
  return {
    commonParams: {
      startTime: startTime.getTime(),
      endTime: endTime.getTime(),
      isCaseManagement,
      ...(options?.packageId ? { packageId: options.packageId } : {}),
      ...(options?.processKey ? { processKey: options.processKey } : {}),
      ...(options?.version ? { version: options.version } : {}),
    }
  };
}

/**
 * Builds the request body for Insights RTM timeline endpoints
 * (`InstanceStatusByDate`, `IncidentsByTimeWindow`).
 *
 * @param startTime - Start of the time range to query
 * @param endTime - End of the time range to query
 * @param isCaseManagement - Whether to filter for case management processes
 * @param options - Optional time bucketing and filtering settings
 * @returns Request body for the Insights RTM timeline endpoint
 * @internal
 */
export function buildInsightsTimelineBody(startTime: Date, endTime: Date, isCaseManagement: boolean, options?: TimelineOptions) {
  return {
    commonParams: {
      startTime: startTime.getTime(),
      endTime: endTime.getTime(),
      isCaseManagement,
      ...(options?.packageId ? { packageId: options.packageId } : {}),
      ...(options?.version ? { version: options.version } : {}),
      ...(options?.processKeys ? { processKeys: options.processKeys } : {}),
    },
    timeSliceUnit: options?.groupBy,
    timezoneOffset: new Date().getTimezoneOffset() * -1,
  };
}

/**
 * Builds the commonParams request body for Insights RTM endpoints
 * that filter by process key, package, time range, and version.
 *
 * @param request - Process scope + time range to aggregate over
 * @returns Request body with commonParams
 * @internal
 */
export function buildInsightsCommonBody(request: MaestroProcessStatsRequest) {
  return {
    commonParams: {
      processKey: request.processKey,
      packageId: request.packageId,
      startTime: request.startTime.getTime(),
      endTime: request.endTime.getTime(),
      version: request.packageVersion
    }
  };
}
