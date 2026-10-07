/**
 * Case App route mock factories — raw wire shapes, so the service's renames actually run.
 */

import { CASE_APP_TEST_CONSTANTS as C } from '../constants/case-app';
import { InstanceStatus } from '../../../src/models/maestro/case-instances.types';
import { ProcessIncidentStatus } from '../../../src/models/maestro/incidents.types';
import { ProcessType } from '../../../src/models/maestro/cases.internal-types';

export const createRawCaseAppInstance = (overrides?: Record<string, unknown>) => ({
  instanceId: C.INSTANCE_ID,
  folderKey: C.FOLDER_KEY,
  processKey: C.PROCESS_KEY,
  packageId: C.PACKAGE_ID,
  latestRunId: C.RUN_ID,
  latestRunStatus: InstanceStatus.RUNNING,
  externalId: C.CASE_ID,
  startedTimeUtc: C.STARTED_TIME,
  createdTimeUtc: C.STARTED_TIME,
  completedTimeUtc: null,
  processType: ProcessType.CaseManagement,
  instanceRuns: [{ runId: C.RUN_ID, status: InstanceStatus.RUNNING, startedTimeUtc: C.STARTED_TIME, completedTimeUtc: C.COMPLETED_TIME }],
  ...overrides,
});

export const createCaseAppInstanceListResponse = (overrides?: Record<string, unknown>) => ({
  instances: [createRawCaseAppInstance(), createRawCaseAppInstance({ instanceId: C.INSTANCE_ID_ALT })],
  nextPage: null,
  hasMoreResults: false,
  ...overrides,
});

export const createRawCaseAppElementRun = (overrides?: Record<string, unknown>) => ({
  elementRunId: C.ELEMENT_RUN_ID,
  status: InstanceStatus.COMPLETED,
  startedTimeUtc: C.STARTED_TIME,
  completedTimeUtc: C.COMPLETED_TIME,
  incomingFlowId: null,
  incomingFlowIds: [],
  markerItemIndex: null,
  workflowId: null,
  version: C.ELEMENT_RUN_VERSION,
  parentElementRunId: null,
  jobKey: null,
  externalLink: null,
  maestroLink: null,
  ...overrides,
});

export const createRawCaseAppElementExecution = (overrides?: Record<string, unknown>) => ({
  elementId: C.ELEMENT_ID,
  elementType: C.ELEMENT_TYPE,
  elementName: C.ELEMENT_NAME,
  elementExtensionType: C.ELEMENT_EXTENSION_TYPE,
  status: InstanceStatus.COMPLETED,
  startedTimeUtc: C.STARTED_TIME,
  completedTimeUtc: C.COMPLETED_TIME,
  runId: C.RUN_ID,
  parentRunId: null,
  parentElementId: null,
  parentElementRunId: null,
  processKey: C.PROCESS_KEY,
  caseInstanceId: C.INSTANCE_ID,
  caseStageElementId: C.STAGE_ID,
  jobKey: null,
  externalLink: null,
  maestroLink: null,
  elementRuns: [createRawCaseAppElementRun()],
  ...overrides,
});

export const createRawCaseAppGetElementExecutionsResponse = (overrides?: Record<string, unknown>) => ({
  instanceId: C.INSTANCE_ID,
  instanceDisplayName: C.CASE_ID,
  externalId: C.CASE_ID,
  organizationId: C.ORGANIZATION_ID,
  tenantId: C.TENANT_ID,
  folderKey: C.FOLDER_KEY,
  processKey: C.PROCESS_KEY,
  packageId: C.PACKAGE_ID,
  packageKey: C.PACKAGE_ID,
  packageVersion: C.PACKAGE_VERSION,
  source: C.INSTANCE_SOURCE,
  creationUserKey: null,
  status: InstanceStatus.RUNNING,
  startedTimeUtc: C.STARTED_TIME,
  completedTimeUtc: null,
  traceId: null,
  caseSummary: null,
  caseSummaryExpression: null,
  sections: [
    {
      id: C.STAGE_ID,
      title: C.SECTION_TITLE,
      details: { [C.SECTION_DETAIL_KEY]: C.SECTION_DETAIL_VALUE },
    },
  ],
  sectionsExpressions: null,
  elementExecutions: [createRawCaseAppElementExecution()],
  ...overrides,
});

export const createRawCaseAppIncident = (overrides?: Record<string, unknown>) => ({
  id: C.INCIDENT_ID,
  incidentId: C.INCIDENT_ID,
  instanceId: C.INSTANCE_ID,
  runId: C.RUN_ID,
  folderKey: C.FOLDER_KEY,
  elementId: C.ELEMENT_ID,
  incidentStatus: ProcessIncidentStatus.Open,
  errorMessage: C.ERROR_CASE_NOT_FOUND,
  errorTimeUtc: C.ERROR_TIME,
  incidentUpdateTimeUtc: C.INCIDENT_UPDATE_TIME,
  ...overrides,
});

export const createCaseAppAdhocTasksResponse = () => ({
  stages: [
    {
      stageId: C.STAGE_ID,
      stageLabel: C.STAGE_NAME,
      tasks: [{ taskName: C.TASK_NAME, taskId: C.ELEMENT_ID }],
    },
  ],
});
