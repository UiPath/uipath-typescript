/**
 * Process Incident Status
 */
export enum ProcessIncidentStatus {
  Open = 'Open',
  Closed = 'Closed'
}

/**
 * Process Incident Type
 */
export enum ProcessIncidentType {
  System = 'System',
  User = 'User',
  Deployment = 'Deployment'
}

/**
 * Process Incident Severity
 */
export enum ProcessIncidentSeverity {
  Error = 'Error',
  Warning = 'Warning'
}

/**
 * Process Incident Debug Mode
 */
export enum DebugMode {
  None = 'None',
  Default = 'Default',
  StepByStep = 'StepByStep',
  SingleStep = 'SingleStep'
}

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