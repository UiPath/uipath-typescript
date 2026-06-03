/**
 * Maestro Service Endpoints
 */

import { PIMS_BASE, INSIGHTS_RTM_BASE } from './base';

/**
 * Maestro Process Service Endpoints
 */
export const MAESTRO_ENDPOINTS = {
  PROCESSES: {
    GET_ALL: `${PIMS_BASE}/api/v1/processes/summary`,
    GET_SETTINGS: (processKey: string) => `${PIMS_BASE}/api/v1/processes/${processKey}/settings`,
  },
  INSTANCES: {
    GET_ALL: `${PIMS_BASE}/api/v1/instances`,
    GET_BY_ID: (instanceId: string) => `${PIMS_BASE}/api/v1/instances/${instanceId}`,
    GET_EXECUTION_HISTORY: (instanceId: string) => `${PIMS_BASE}/api/v1/spans/${instanceId}`,
    GET_BPMN: (instanceId: string) => `${PIMS_BASE}/api/v1/instances/${instanceId}/bpmn`,
    GET_VARIABLES: (instanceId: string) => `${PIMS_BASE}/api/v1/instances/${instanceId}/variables`,
    CANCEL: (instanceId: string) => `${PIMS_BASE}/api/v1/instances/${instanceId}/cancel`,
    PAUSE: (instanceId: string) => `${PIMS_BASE}/api/v1/instances/${instanceId}/pause`,
    RESUME: (instanceId: string) => `${PIMS_BASE}/api/v1/instances/${instanceId}/resume`,
  },
  INCIDENTS: {
    GET_ALL: `${PIMS_BASE}/api/v1/incidents/summary`,
    GET_BY_PROCESS: (processKey: string) => `${PIMS_BASE}/api/v1/incidents/process/${processKey}`,
    GET_BY_INSTANCE: (instanceId: string) => `${PIMS_BASE}/api/v1/instances/${instanceId}/incidents`,
  },
  CASES: {
    GET_CASE_JSON: (instanceId: string) => `${PIMS_BASE}/api/v1/cases/${instanceId}/case-json`,
    GET_ELEMENT_EXECUTIONS: (instanceId: string) => `${PIMS_BASE}/api/v1/element-executions/case-instances/${instanceId}`,
    REOPEN: (instanceId: string) => `${PIMS_BASE}/api/v1/cases/${instanceId}/reopen`,
  },
  INSIGHTS: {
    /** SLA summary for case instances */
    SLA_SUMMARY: `${INSIGHTS_RTM_BASE}/caseManagement/slaSummary`,
    /** Stages summary for case instances */
    STAGES_SUMMARY: `${INSIGHTS_RTM_BASE}/caseManagement/stages`,
    /** Top processes ranked by run count */
    TOP_PROCESSES_BY_RUN_COUNT: `${INSIGHTS_RTM_BASE}/agenticInstanceStatus/TopProcessesByRunCount`,
    /** Top processes ranked by failure count */
    TOP_PROCESSES_WITH_FAILURE: `${INSIGHTS_RTM_BASE}/agenticInstanceStatus/TopProcesseswithFailure`,
    /** Top elements ranked by failure count */
    TOP_ELEMENTS_WITH_FAILURE: `${INSIGHTS_RTM_BASE}/agenticInstanceStatus/TopElementswithFailure`,
    /** Instance status aggregated by date for time-series charts */
    INSTANCE_STATUS_BY_DATE: `${INSIGHTS_RTM_BASE}/agenticInstanceStatus/InstanceStatusByDate`,
    /** Top processes ranked by total duration */
    TOP_PROCESSES_BY_DURATION: `${INSIGHTS_RTM_BASE}/agenticInstanceStatus/TopProcessesByDuration`,
    /** Element count by status for agentic instances (process and case) */
    ELEMENT_COUNT_BY_STATUS: `${INSIGHTS_RTM_BASE}/agenticInstanceStatus/ElementCountByStatus`,
    /** Incident counts aggregated by time window for time-series charts */
    INCIDENTS_BY_TIME_WINDOW: `${INSIGHTS_RTM_BASE}/agenticInstanceStatus/IncidentsByTimeWindow`,
  },
} as const;
