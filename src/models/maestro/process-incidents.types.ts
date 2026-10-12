import { ProcessIncidentStatus, ProcessIncidentType, ProcessIncidentSeverity, DebugMode } from './incidents.types';

export * from './incidents.types';

/**
 * Process Incident Get Response
 */
export interface ProcessIncidentGetResponse {
  instanceId: string;
  elementId: string;
  folderKey: string;
  processKey: string;
  incidentId: string;
  incidentStatus: ProcessIncidentStatus;
  incidentType: ProcessIncidentType | null;
  errorCode: string;
  errorMessage: string;
  errorTime: string;
  errorDetails: string;
  debugMode: DebugMode;
  incidentSeverity: ProcessIncidentSeverity | null;
  // fields added from bpmn
  incidentElementActivityType: string;
  incidentElementActivityName: string;
}

/**
 * Process Incident Summary Get Response
 */
export interface ProcessIncidentGetAllResponse {
  count: number;
  errorMessage: string;
  errorCode: string;
  firstOccuranceTime: string;
  processKey: string;
}