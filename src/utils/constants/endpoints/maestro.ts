/**
 * Maestro Service Endpoints
 */

import { PIMS_BASE } from './base';

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
    GET_ELEMENT_EXECUTIONS: (instanceId: string) => `${PIMS_BASE}/api/v1alpha1/element-executions/case-instances/${instanceId}`,
    REOPEN: (instanceId: string) => `${PIMS_BASE}/api/v1/cases/${instanceId}/reopen`,
  },
} as const;
