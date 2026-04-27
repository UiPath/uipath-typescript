/**
 * Insights Real-Time Monitoring Endpoints
 */

import { INSIGHTS_RTM_BASE } from './base';

export const INSIGHTS_RTM_ENDPOINTS = {
  TOP_PROCESSES_BY_RUN_COUNT: (orgName: string, tenantName: string, tenantId: string) =>
    `${INSIGHTS_RTM_BASE}/agenticInstanceStatus/${orgName}/${tenantName}/${tenantId}/TopProcessesByRunCount`,
} as const;
