/**
 * Incident Types
 * Enums shared by the incidents that process and case services return
 */

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
