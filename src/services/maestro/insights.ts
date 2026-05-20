/**
 * Builds the request body for Insights RTM "top" endpoints.
 *
 * @param startTime - Start of the time range to query
 * @param endTime - End of the time range to query
 * @param isCaseManagement - Whether to filter for case management processes
 * @returns Request body for the Insights RTM endpoint
 * @internal
 */
export function buildInsightsTopBody(startTime: Date, endTime: Date, isCaseManagement: boolean) {
  return {
    commonParams: {
      startTime: startTime.getTime(),
      endTime: endTime.getTime(),
      isCaseManagement
    }
  };
}
