/**
 * Maps case instance wire fields to SDK names
 */
export const CaseAppInstanceMap: { [key: string]: string } = {
  externalId: 'caseId',
  createdTimeUtc: 'createdTime',
  startedTimeUtc: 'startedTime',
  completedTimeUtc: 'completedTime',
};

/**
 * Maps incident wire fields to SDK names
 */
export const CaseAppIncidentMap: { [key: string]: string } = {
  errorTimeUtc: 'errorTime',
  incidentUpdateTimeUtc: 'incidentUpdateTime',
};

/**
 * Maps list-filter query parameters to SDK option names; `transformRequest` reverses it
 */
export const CaseAppInstanceFilterMap: { [key: string]: string } = {
  externalId: 'caseId',
  startedTimeUtcStart: 'startedTimeStart',
  startedTimeUtcEnd: 'startedTimeEnd',
};
