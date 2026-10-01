// ===== IMPORTS =====
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  CaseInstances,
  CaseAppElementType,
  CaseAppInstanceSortBy,
  CaseAppSortOrder,
  CaseInstanceMessageName,
  InstanceStatus,
} from '../../../../src/services/maestro/cases';
import { ApiClient } from '../../../../src/core/http/api-client';
import {
  CASE_APP_TEST_CONSTANTS as C,
  createCaseAppAdhocTasksResponse,
  createCaseAppInstanceListResponse,
  createMockError,
  createRawCaseAppGetElementExecutionsResponse,
  createRawCaseAppIncident,
} from '../../../utils/mocks';
import { createServiceTestDependencies, createMockApiClient } from '../../../utils/setup';
import { MAESTRO_ENDPOINTS } from '../../../../src/utils/constants/endpoints';
import { FOLDER_KEY } from '../../../../src/utils/constants/headers';

// ===== MOCKING =====
vi.mock('../../../../src/core/http/api-client');

const E = MAESTRO_ENDPOINTS.CASE_APP;
const FOLDER_HEADERS = { headers: expect.objectContaining({ [FOLDER_KEY]: C.FOLDER_KEY }) };

type RequestSpec = { params?: Record<string, unknown>; headers?: Record<string, string> };

// ===== TEST SUITE =====
describe('CaseInstances Case App (v3) Unit Tests', () => {
  let caseInstances: CaseInstances;
  let mockApiClient: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    const { instance } = createServiceTestDependencies();
    mockApiClient = createMockApiClient();
    vi.mocked(ApiClient).mockImplementation(function () {
      return mockApiClient as unknown as ApiClient;
    });

    caseInstances = new CaseInstances(instance);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllForCaseApp', () => {
    it('should list instances from the v3 route under the folder header', async () => {
      mockApiClient.get.mockResolvedValue(createCaseAppInstanceListResponse());

      const result = await caseInstances.getAllForCaseApp(C.FOLDER_KEY);

      expect(mockApiClient.get).toHaveBeenCalledWith(E.GET_ALL, expect.objectContaining(FOLDER_HEADERS));
      expect(result.items).toHaveLength(2);
      expect(result.items[1].instanceId).toBe(C.INSTANCE_ID_ALT);
    });

    it('should rename the wire fields on listed instances', async () => {
      mockApiClient.get.mockResolvedValue(createCaseAppInstanceListResponse());

      const [instance] = (await caseInstances.getAllForCaseApp(C.FOLDER_KEY)).items;
      const [run] = instance.instanceRuns ?? [];

      expect(instance.startedTime).toBe(C.STARTED_TIME);
      expect(instance.createdTime).toBe(C.STARTED_TIME);
      expect(instance.caseId).toBe(C.CASE_ID);
      expect(run.completedTime).toBe(C.COMPLETED_TIME);
      expect((instance as unknown as Record<string, unknown>).startedTimeUtc).toBeUndefined();
      expect((instance as unknown as Record<string, unknown>).createdTimeUtc).toBeUndefined();
      expect((instance as unknown as Record<string, unknown>).externalId).toBeUndefined();
      expect((run as unknown as Record<string, unknown>).completedTimeUtc).toBeUndefined();
    });

    it('should send filters as the query parameters the API expects', async () => {
      mockApiClient.get.mockResolvedValue(createCaseAppInstanceListResponse());
      const startedTimeStart = new Date(C.STARTED_TIME);

      await caseInstances.getAllForCaseApp(C.FOLDER_KEY, {
        processKey: C.PROCESS_KEY,
        caseId: C.CASE_ID,
        statuses: [InstanceStatus.RUNNING, InstanceStatus.FAULTED],
        startedTimeStart,
        sortBy: CaseAppInstanceSortBy.StartedTime,
        order: CaseAppSortOrder.Asc,
      });

      const spec = mockApiClient.get.mock.calls[0][1] as RequestSpec;
      expect(spec.params).toMatchObject({
        processKey: C.PROCESS_KEY,
        externalId: C.CASE_ID,
        statuses: 'Running,Faulted',
        startedTimeUtcStart: startedTimeStart.toISOString(),
        sortBy: 'startedTimeUtc',
        order: 'Asc',
      });
      expect(spec.params).not.toHaveProperty('caseId');
      expect(spec.params).not.toHaveProperty('$processKey');
    });

    it('should page with pageSize and expose the next cursor', async () => {
      mockApiClient.get.mockResolvedValue(
        createCaseAppInstanceListResponse({ nextPage: C.NEXT_PAGE_TOKEN, hasMoreResults: true })
      );

      const result = await caseInstances.getAllForCaseApp(C.FOLDER_KEY, { pageSize: 10 });

      const spec = mockApiClient.get.mock.calls[0][1] as RequestSpec;
      expect(spec.params?.pageSize).toBe(10);
      expect(result.hasNextPage).toBe(true);
      expect(result.nextCursor).toBeDefined();
    });

    it('should propagate API errors', async () => {
      mockApiClient.get.mockRejectedValue(createMockError(C.ERROR_CASE_NOT_FOUND));

      await expect(caseInstances.getAllForCaseApp(C.FOLDER_KEY)).rejects.toThrow(C.ERROR_CASE_NOT_FOUND);
    });
  });

  describe('getStagesForCaseApp', () => {
    it('should return the stages response', async () => {
      const stages = {
        caseInstanceId: C.INSTANCE_ID,
        stages: [{ elementId: C.STAGE_ID, name: C.STAGE_NAME, latestStatus: 'InProgress', slaStatus: 'AtRisk' }],
      };
      mockApiClient.get.mockResolvedValue(stages);

      const result = await caseInstances.getStagesForCaseApp(C.INSTANCE_ID, C.FOLDER_KEY);

      expect(mockApiClient.get).toHaveBeenCalledWith(E.GET_STAGES(C.INSTANCE_ID), FOLDER_HEADERS);
      expect(result).toEqual(stages);
    });

    it('should propagate API errors', async () => {
      mockApiClient.get.mockRejectedValue(createMockError(C.ERROR_CASE_NOT_FOUND));

      await expect(caseInstances.getStagesForCaseApp(C.INSTANCE_ID, C.FOLDER_KEY)).rejects.toThrow(C.ERROR_CASE_NOT_FOUND);
    });
  });

  describe('getSlaSummaryForCaseApp', () => {
    it('should return the SLA summary with externalId renamed to caseId', async () => {
      const summary = { caseInstanceId: C.INSTANCE_ID, slaDueTime: C.SLA_DUE_TIME, slaStatus: 'OnTrack' };
      mockApiClient.get.mockResolvedValue({ ...summary, externalId: C.CASE_ID });

      const result = await caseInstances.getSlaSummaryForCaseApp(C.INSTANCE_ID, C.FOLDER_KEY);

      expect(mockApiClient.get).toHaveBeenCalledWith(E.GET_SLA_SUMMARY(C.INSTANCE_ID), FOLDER_HEADERS);
      expect(result).toEqual({ ...summary, caseId: C.CASE_ID });
      expect((result as unknown as Record<string, unknown>).externalId).toBeUndefined();
    });

    it('should propagate API errors', async () => {
      mockApiClient.get.mockRejectedValue(createMockError(C.ERROR_CASE_NOT_FOUND));

      await expect(caseInstances.getSlaSummaryForCaseApp(C.INSTANCE_ID, C.FOLDER_KEY)).rejects.toThrow(C.ERROR_CASE_NOT_FOUND);
    });
  });

  describe('getCaseJsonForCaseApp', () => {
    it('should return the case plan verbatim', async () => {
      const casePlan = { root: { Name: C.STAGE_NAME }, nodes: [{ Id: C.STAGE_ID }] };
      mockApiClient.get.mockResolvedValue(casePlan);

      const result = await caseInstances.getCaseJsonForCaseApp(C.INSTANCE_ID, C.FOLDER_KEY);

      expect(mockApiClient.get).toHaveBeenCalledWith(E.GET_CASE_JSON(C.INSTANCE_ID), FOLDER_HEADERS);
      expect(result).toEqual(casePlan);
    });

    it('should propagate API errors', async () => {
      mockApiClient.get.mockRejectedValue(createMockError(C.ERROR_CASE_NOT_FOUND));

      await expect(caseInstances.getCaseJsonForCaseApp(C.INSTANCE_ID, C.FOLDER_KEY)).rejects.toThrow(C.ERROR_CASE_NOT_FOUND);
    });
  });

  describe('getElementExecutionsForCaseApp', () => {
    it('should rename time fields on the envelope, executions and runs', async () => {
      mockApiClient.get.mockResolvedValue(createRawCaseAppGetElementExecutionsResponse());

      const result = await caseInstances.getElementExecutionsForCaseApp(C.INSTANCE_ID, C.FOLDER_KEY);
      const [execution] = result.elementExecutions;
      const [run] = execution.elementRuns;

      expect(result.startedTime).toBe(C.STARTED_TIME);
      expect(result.caseId).toBe(C.CASE_ID);
      expect((result as unknown as Record<string, unknown>).externalId).toBeUndefined();
      expect(execution.completedTime).toBe(C.COMPLETED_TIME);
      expect(run.startedTime).toBe(C.STARTED_TIME);
      expect((result as unknown as Record<string, unknown>).startedTimeUtc).toBeUndefined();
      expect((execution as unknown as Record<string, unknown>).completedTimeUtc).toBeUndefined();
      expect((run as unknown as Record<string, unknown>).startedTimeUtc).toBeUndefined();
    });

    it('should leave author-defined section details untouched', async () => {
      mockApiClient.get.mockResolvedValue(createRawCaseAppGetElementExecutionsResponse());

      const result = await caseInstances.getElementExecutionsForCaseApp(C.INSTANCE_ID, C.FOLDER_KEY);

      expect(result.sections?.[0].details).toEqual({ [C.SECTION_DETAIL_KEY]: C.SECTION_DETAIL_VALUE });
    });

    it('should send element types as a comma-separated query parameter', async () => {
      mockApiClient.get.mockResolvedValue(createRawCaseAppGetElementExecutionsResponse());

      await caseInstances.getElementExecutionsForCaseApp(C.INSTANCE_ID, C.FOLDER_KEY, {
        elementTypes: [CaseAppElementType.Hitl, CaseAppElementType.Agent],
      });

      expect(mockApiClient.get).toHaveBeenCalledWith(E.GET_ELEMENT_EXECUTIONS(C.INSTANCE_ID), {
        ...FOLDER_HEADERS,
        params: { elementTypes: 'hitl,agent' },
      });
    });

    it('should omit the element-type parameter when no filter is given', async () => {
      mockApiClient.get.mockResolvedValue(createRawCaseAppGetElementExecutionsResponse());

      await caseInstances.getElementExecutionsForCaseApp(C.INSTANCE_ID, C.FOLDER_KEY);

      const spec = mockApiClient.get.mock.calls[0][1] as RequestSpec;
      expect(spec.params).toEqual({});
    });

    it('should propagate API errors', async () => {
      mockApiClient.get.mockRejectedValue(createMockError(C.ERROR_CASE_NOT_FOUND));

      await expect(caseInstances.getElementExecutionsForCaseApp(C.INSTANCE_ID, C.FOLDER_KEY)).rejects.toThrow(
        C.ERROR_CASE_NOT_FOUND
      );
    });
  });

  describe('getIncidentsForCaseApp', () => {
    it('should rename the incident time fields', async () => {
      mockApiClient.get.mockResolvedValue([createRawCaseAppIncident()]);

      const [incident] = await caseInstances.getIncidentsForCaseApp(C.INSTANCE_ID, C.FOLDER_KEY);

      expect(mockApiClient.get).toHaveBeenCalledWith(E.GET_INCIDENTS(C.INSTANCE_ID), FOLDER_HEADERS);
      expect(incident.errorTime).toBe(C.ERROR_TIME);
      expect(incident.incidentUpdateTime).toBe(C.INCIDENT_UPDATE_TIME);
      expect((incident as unknown as Record<string, unknown>).errorTimeUtc).toBeUndefined();
      expect((incident as unknown as Record<string, unknown>).incidentUpdateTimeUtc).toBeUndefined();
    });

    it('should return an empty array when the API returns none', async () => {
      mockApiClient.get.mockResolvedValue([]);

      expect(await caseInstances.getIncidentsForCaseApp(C.INSTANCE_ID, C.FOLDER_KEY)).toEqual([]);
    });

    it('should propagate API errors', async () => {
      mockApiClient.get.mockRejectedValue(createMockError(C.ERROR_CASE_NOT_FOUND));

      await expect(caseInstances.getIncidentsForCaseApp(C.INSTANCE_ID, C.FOLDER_KEY)).rejects.toThrow(C.ERROR_CASE_NOT_FOUND);
    });
  });

  describe('getAdhocTasksForCaseApp', () => {
    it('should return the stages array unwrapped', async () => {
      const response = createCaseAppAdhocTasksResponse();
      mockApiClient.get.mockResolvedValue(response);

      const result = await caseInstances.getAdhocTasksForCaseApp(C.INSTANCE_ID, C.FOLDER_KEY);

      expect(mockApiClient.get).toHaveBeenCalledWith(E.GET_ADHOC_TASKS(C.INSTANCE_ID), FOLDER_HEADERS);
      expect(result).toEqual(response.stages);
      expect(result[0].tasks[0].taskName).toBe(C.TASK_NAME);
    });

    it('should propagate API errors', async () => {
      mockApiClient.get.mockRejectedValue(createMockError(C.ERROR_CASE_NOT_FOUND));

      await expect(caseInstances.getAdhocTasksForCaseApp(C.INSTANCE_ID, C.FOLDER_KEY)).rejects.toThrow(C.ERROR_CASE_NOT_FOUND);
    });
  });

  describe('triggerAdhocTaskForCaseApp', () => {
    it('should post only the task name when no input is given', async () => {
      mockApiClient.post.mockResolvedValue(undefined);

      await caseInstances.triggerAdhocTaskForCaseApp(C.INSTANCE_ID, C.FOLDER_KEY, C.TASK_NAME);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        E.TRIGGER_TASK(C.INSTANCE_ID),
        { taskName: C.TASK_NAME },
        FOLDER_HEADERS
      );
    });

    it('should forward the task input', async () => {
      mockApiClient.post.mockResolvedValue(undefined);
      const taskInput = { reason: C.COMMENT };

      await caseInstances.triggerAdhocTaskForCaseApp(C.INSTANCE_ID, C.FOLDER_KEY, C.TASK_NAME, { taskInput });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        E.TRIGGER_TASK(C.INSTANCE_ID),
        { taskName: C.TASK_NAME, taskInput },
        FOLDER_HEADERS
      );
    });

    it('should propagate API errors', async () => {
      mockApiClient.post.mockRejectedValue(createMockError(C.ERROR_TASK_NOT_FOUND));

      await expect(caseInstances.triggerAdhocTaskForCaseApp(C.INSTANCE_ID, C.FOLDER_KEY, C.TASK_NAME)).rejects.toThrow(
        C.ERROR_TASK_NOT_FOUND
      );
    });
  });

  describe('selectStageForCaseApp', () => {
    it('should post the stage name', async () => {
      mockApiClient.post.mockResolvedValue(undefined);

      await caseInstances.selectStageForCaseApp(C.INSTANCE_ID, C.FOLDER_KEY, C.STAGE_NAME);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        E.SELECT_STAGE(C.INSTANCE_ID),
        { stageName: C.STAGE_NAME },
        FOLDER_HEADERS
      );
    });

    it('should include the waiting stage id when given', async () => {
      mockApiClient.post.mockResolvedValue(undefined);

      await caseInstances.selectStageForCaseApp(C.INSTANCE_ID, C.FOLDER_KEY, C.STAGE_NAME, { waitingStageId: C.STAGE_ID_ALT });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        E.SELECT_STAGE(C.INSTANCE_ID),
        { stageName: C.STAGE_NAME, waitingStageId: C.STAGE_ID_ALT },
        FOLDER_HEADERS
      );
    });

    it('should propagate API errors', async () => {
      mockApiClient.post.mockRejectedValue(createMockError(C.ERROR_STAGE_NOT_FOUND));

      await expect(caseInstances.selectStageForCaseApp(C.INSTANCE_ID, C.FOLDER_KEY, C.STAGE_NAME)).rejects.toThrow(
        C.ERROR_STAGE_NOT_FOUND
      );
    });
  });

  describe('sendMessageForCaseApp', () => {
    it('should default the reference to the case and the item data to empty', async () => {
      mockApiClient.post.mockResolvedValue({ id: C.MESSAGE_ID, jobId: C.JOB_ID });

      const result = await caseInstances.sendMessageForCaseApp(C.INSTANCE_ID, C.FOLDER_KEY, CaseInstanceMessageName.UserAdhocTrigger);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        E.SEND_MESSAGE,
        { name: CaseInstanceMessageName.UserAdhocTrigger, reference: `case-${C.INSTANCE_ID}`, itemData: {} },
        FOLDER_HEADERS
      );
      expect(result).toEqual({ id: C.MESSAGE_ID, jobId: C.JOB_ID });
    });

    it('should send the given reference and item data', async () => {
      mockApiClient.post.mockResolvedValue({ id: C.MESSAGE_ID, jobId: C.JOB_ID });
      const itemData = { taskNames: [C.TASK_NAME] };

      await caseInstances.sendMessageForCaseApp(C.INSTANCE_ID, C.FOLDER_KEY, CaseInstanceMessageName.UserAdhocTrigger, {
        itemData,
        reference: C.STAGE_ID,
      });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        E.SEND_MESSAGE,
        { name: CaseInstanceMessageName.UserAdhocTrigger, reference: C.STAGE_ID, itemData },
        FOLDER_HEADERS
      );
    });

    it('should propagate API errors', async () => {
      mockApiClient.post.mockRejectedValue(createMockError(C.ERROR_CASE_NOT_FOUND));

      await expect(
        caseInstances.sendMessageForCaseApp(C.INSTANCE_ID, C.FOLDER_KEY, CaseInstanceMessageName.UserSelectStage)
      ).rejects.toThrow(C.ERROR_CASE_NOT_FOUND);
    });
  });

  describe('closeForCaseApp', () => {
    it('should post an empty body when no options are given', async () => {
      const response = { instanceId: C.INSTANCE_ID, status: 'Canceling', isCompleted: false };
      mockApiClient.post.mockResolvedValue(response);

      const result = await caseInstances.closeForCaseApp(C.INSTANCE_ID, C.FOLDER_KEY);

      expect(mockApiClient.post).toHaveBeenCalledWith(E.CLOSE(C.INSTANCE_ID), {}, FOLDER_HEADERS);
      expect(result).toEqual(response);
    });

    it('should send the comment and operation id', async () => {
      mockApiClient.post.mockResolvedValue({ instanceId: C.INSTANCE_ID, status: 'Canceling', isCompleted: false });

      await caseInstances.closeForCaseApp(C.INSTANCE_ID, C.FOLDER_KEY, { comment: C.COMMENT, operationId: C.OPERATION_ID });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        E.CLOSE(C.INSTANCE_ID),
        { comment: C.COMMENT, operationId: C.OPERATION_ID },
        FOLDER_HEADERS
      );
    });

    it('should propagate API errors', async () => {
      mockApiClient.post.mockRejectedValue(createMockError(C.ERROR_CASE_ALREADY_COMPLETED));

      await expect(caseInstances.closeForCaseApp(C.INSTANCE_ID, C.FOLDER_KEY)).rejects.toThrow(C.ERROR_CASE_ALREADY_COMPLETED);
    });
  });

  describe('reopenForCaseApp', () => {
    it('should post the start element and comment', async () => {
      const response = { instanceId: C.INSTANCE_ID, status: 'Running' };
      mockApiClient.post.mockResolvedValue(response);

      const result = await caseInstances.reopenForCaseApp(C.INSTANCE_ID, C.FOLDER_KEY, C.STAGE_ID, { comment: C.COMMENT });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        E.REOPEN(C.INSTANCE_ID),
        { startElementId: C.STAGE_ID, comment: C.COMMENT },
        FOLDER_HEADERS
      );
      expect(result).toEqual(response);
    });

    it('should propagate API errors', async () => {
      mockApiClient.post.mockRejectedValue(createMockError(C.ERROR_CASE_NOT_FOUND));

      await expect(caseInstances.reopenForCaseApp(C.INSTANCE_ID, C.FOLDER_KEY, C.STAGE_ID)).rejects.toThrow(C.ERROR_CASE_NOT_FOUND);
    });
  });
});
