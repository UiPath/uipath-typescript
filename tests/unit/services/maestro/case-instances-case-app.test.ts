// ===== IMPORTS =====
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  CaseInstances,
  CaseInstanceElementType,
  CaseInstanceSortBy,
  CaseInstanceSortOrder,
  CaseInstanceMessageName,
  InstanceStatus,
} from '../../../../src/services/maestro/cases';
import { ApiClient } from '../../../../src/core/http/api-client';
import { ValidationError } from '../../../../src/core/errors';
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
const CASE_JSON = {
  root: { name: C.STAGE_NAME_ALT },
  nodes: [{ id: C.STAGE_ID, type: 'case-management:Stage', data: { label: C.STAGE_NAME } }],
};

type RequestSpec = { params?: Record<string, unknown>; headers?: Record<string, string> };

// ===== TEST SUITE =====
describe('CaseInstances with Case App routes Unit Tests', () => {
  let caseInstances: CaseInstances;
  let v1CaseInstances: CaseInstances;
  let mockApiClient: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    const { instance } = createServiceTestDependencies();
    mockApiClient = createMockApiClient();
    vi.mocked(ApiClient).mockImplementation(function () {
      return mockApiClient as unknown as ApiClient;
    });

    caseInstances = new CaseInstances(instance, { useCaseAppRoutes: true });
    v1CaseInstances = new CaseInstances(instance);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /** Answers the list route with instances and the case-json route with a case plan */
  const mockListAndCaseJson = (listResponse = createCaseAppInstanceListResponse()) => {
    mockApiClient.get.mockImplementation(async (url: string) =>
      url === E.GET_CASE_JSON(C.INSTANCE_ID) || url === E.GET_CASE_JSON(C.INSTANCE_ID_ALT) ? CASE_JSON : listResponse
    );
  };

  describe('getAll', () => {
    it('should list instances from the Case App route under the folder header', async () => {
      mockListAndCaseJson();

      const result = await caseInstances.getAll({ folderKey: C.FOLDER_KEY });

      expect(mockApiClient.get).toHaveBeenCalledWith(E.GET_ALL, expect.objectContaining(FOLDER_HEADERS));
      expect(result.items).toHaveLength(2);
      expect(result.items[1].instanceId).toBe(C.INSTANCE_ID_ALT);
    });

    it('should reject a missing folderKey without calling the API', async () => {
      await expect(caseInstances.getAll()).rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.get).not.toHaveBeenCalled();
    });

    it('should rename the wire fields on listed instances and their runs', async () => {
      mockListAndCaseJson();

      const [instance] = (await caseInstances.getAll({ folderKey: C.FOLDER_KEY })).items;
      const [run] = instance.instanceRuns;

      expect(instance.startedTime).toBe(C.STARTED_TIME);
      expect(instance.createdTime).toBe(C.STARTED_TIME);
      expect(instance.caseId).toBe(C.CASE_ID);
      expect(run.completedTime).toBe(C.COMPLETED_TIME);
      expect((instance as unknown as Record<string, unknown>).startedTimeUtc).toBeUndefined();
      expect((instance as unknown as Record<string, unknown>).createdTimeUtc).toBeUndefined();
      expect((instance as unknown as Record<string, unknown>).externalId).toBeUndefined();
      expect((run as unknown as Record<string, unknown>).completedTimeUtc).toBeUndefined();
    });

    it('should enrich instances from the Case App case-json route', async () => {
      mockListAndCaseJson();

      const [instance] = (await caseInstances.getAll({ folderKey: C.FOLDER_KEY })).items;

      expect(mockApiClient.get).toHaveBeenCalledWith(E.GET_CASE_JSON(C.INSTANCE_ID), FOLDER_HEADERS);
      expect(instance.caseType).toBe(C.STAGE_NAME_ALT);
    });

    it('should send filters as the query parameters the API expects, without processType', async () => {
      mockListAndCaseJson();
      const startedTimeStart = new Date(C.STARTED_TIME);

      await caseInstances.getAll({
        folderKey: C.FOLDER_KEY,
        processKey: C.PROCESS_KEY,
        caseId: C.CASE_ID,
        statuses: [InstanceStatus.RUNNING, InstanceStatus.FAULTED],
        startedTimeStart,
        sortBy: CaseInstanceSortBy.StartedTime,
        order: CaseInstanceSortOrder.Asc,
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
      expect(spec.params).not.toHaveProperty('folderKey');
      expect(spec.params).not.toHaveProperty('processType');
      expect(spec.params).not.toHaveProperty('$processKey');
    });

    it('should send the same filters to the v1 route alongside processType', async () => {
      mockApiClient.get.mockResolvedValue({ instances: [], nextPage: null, hasMoreResults: false });

      await v1CaseInstances.getAll({ caseId: C.CASE_ID, statuses: [InstanceStatus.RUNNING] });

      const [url, spec] = mockApiClient.get.mock.calls[0] as [string, RequestSpec];
      expect(url).toBe(MAESTRO_ENDPOINTS.INSTANCES.GET_ALL);
      expect(spec.params).toMatchObject({ externalId: C.CASE_ID, statuses: 'Running', processType: 'CaseManagement' });
    });

    it('should page with pageSize and expose the next cursor', async () => {
      mockListAndCaseJson(createCaseAppInstanceListResponse({ nextPage: C.NEXT_PAGE_TOKEN, hasMoreResults: true }));

      const result = await caseInstances.getAll({ folderKey: C.FOLDER_KEY, pageSize: 10 });

      const spec = mockApiClient.get.mock.calls[0][1] as RequestSpec;
      expect(spec.params?.pageSize).toBe(10);
      expect(result.hasNextPage).toBe(true);
      expect(result.nextCursor).toBeDefined();
    });

    it('should bind instance methods that keep using the Case App routes', async () => {
      mockListAndCaseJson();
      mockApiClient.post.mockResolvedValue({ instanceId: C.INSTANCE_ID, status: 'Canceling', isCompleted: false });

      const [instance] = (await caseInstances.getAll({ folderKey: C.FOLDER_KEY })).items;
      await instance.close();

      expect(mockApiClient.post).toHaveBeenCalledWith(E.CLOSE(C.INSTANCE_ID), {}, FOLDER_HEADERS);
    });

    it('should propagate API errors', async () => {
      mockApiClient.get.mockRejectedValue(createMockError(C.ERROR_CASE_NOT_FOUND));

      await expect(caseInstances.getAll({ folderKey: C.FOLDER_KEY })).rejects.toThrow(C.ERROR_CASE_NOT_FOUND);
    });
  });

  describe('getExecutionHistory', () => {
    it('should rename time fields on the envelope, executions and runs', async () => {
      mockApiClient.get.mockResolvedValue(createRawCaseAppGetElementExecutionsResponse());

      const result = await caseInstances.getExecutionHistory(C.INSTANCE_ID, C.FOLDER_KEY);
      const [execution] = result.elementExecutions;
      const [run] = execution.elementRuns;

      expect(mockApiClient.get).toHaveBeenCalledWith(E.GET_ELEMENT_EXECUTIONS(C.INSTANCE_ID), expect.objectContaining(FOLDER_HEADERS));
      expect(result.startedTime).toBe(C.STARTED_TIME);
      expect(result.caseId).toBe(C.CASE_ID);
      expect(execution.completedTime).toBe(C.COMPLETED_TIME);
      expect(run.startedTime).toBe(C.STARTED_TIME);
      expect((result as unknown as Record<string, unknown>).externalId).toBeUndefined();
      expect((result as unknown as Record<string, unknown>).startedTimeUtc).toBeUndefined();
      expect((execution as unknown as Record<string, unknown>).completedTimeUtc).toBeUndefined();
      expect((run as unknown as Record<string, unknown>).startedTimeUtc).toBeUndefined();
    });

    it('should leave author-defined section details untouched', async () => {
      mockApiClient.get.mockResolvedValue(createRawCaseAppGetElementExecutionsResponse());

      const result = await caseInstances.getExecutionHistory(C.INSTANCE_ID, C.FOLDER_KEY);

      expect(result.sections?.[0].details).toEqual({ [C.SECTION_DETAIL_KEY]: C.SECTION_DETAIL_VALUE });
    });

    it('should send element types as a comma-separated query parameter', async () => {
      mockApiClient.get.mockResolvedValue(createRawCaseAppGetElementExecutionsResponse());

      await caseInstances.getExecutionHistory(C.INSTANCE_ID, C.FOLDER_KEY, {
        elementTypes: [CaseInstanceElementType.Hitl, CaseInstanceElementType.Agent],
      });

      expect(mockApiClient.get).toHaveBeenCalledWith(E.GET_ELEMENT_EXECUTIONS(C.INSTANCE_ID), {
        ...FOLDER_HEADERS,
        params: { elementTypes: 'hitl,agent' },
      });
    });

    it('should send element types to the v1 route too', async () => {
      mockApiClient.get.mockResolvedValue(createRawCaseAppGetElementExecutionsResponse());

      await v1CaseInstances.getExecutionHistory(C.INSTANCE_ID, C.FOLDER_KEY, {
        elementTypes: [CaseInstanceElementType.Rpa],
      });

      expect(mockApiClient.get).toHaveBeenCalledWith(MAESTRO_ENDPOINTS.CASES.GET_ELEMENT_EXECUTIONS(C.INSTANCE_ID), {
        ...FOLDER_HEADERS,
        params: { elementTypes: 'rpa' },
      });
    });

    it('should omit the element-type parameter when no filter is given', async () => {
      mockApiClient.get.mockResolvedValue(createRawCaseAppGetElementExecutionsResponse());

      await caseInstances.getExecutionHistory(C.INSTANCE_ID, C.FOLDER_KEY);

      const spec = mockApiClient.get.mock.calls[0][1] as RequestSpec;
      expect(spec.params).toBeUndefined();
    });

    it('should propagate API errors', async () => {
      mockApiClient.get.mockRejectedValue(createMockError(C.ERROR_CASE_NOT_FOUND));

      await expect(caseInstances.getExecutionHistory(C.INSTANCE_ID, C.FOLDER_KEY)).rejects.toThrow(C.ERROR_CASE_NOT_FOUND);
    });
  });

  describe('getStages', () => {
    it('should build stages from the Case App element-executions and case-json routes', async () => {
      mockApiClient.get.mockImplementation(async (url: string) =>
        url === E.GET_CASE_JSON(C.INSTANCE_ID)
          ? CASE_JSON
          : createRawCaseAppGetElementExecutionsResponse({
              elementExecutions: [{ elementId: C.STAGE_ID, status: 'Completed', elementRuns: [] }],
            })
      );

      const [stage] = await caseInstances.getStages(C.INSTANCE_ID, C.FOLDER_KEY);

      expect(mockApiClient.get).toHaveBeenCalledWith(E.GET_ELEMENT_EXECUTIONS(C.INSTANCE_ID), expect.objectContaining(FOLDER_HEADERS));
      expect(mockApiClient.get).toHaveBeenCalledWith(E.GET_CASE_JSON(C.INSTANCE_ID), FOLDER_HEADERS);
      expect(stage).toMatchObject({ id: C.STAGE_ID, name: C.STAGE_NAME, status: 'Completed' });
    });
  });

  describe('close', () => {
    it('should post an empty body to the Case App route when no options are given', async () => {
      const response = { instanceId: C.INSTANCE_ID, status: 'Canceling', isCompleted: false };
      mockApiClient.post.mockResolvedValue(response);

      const result = await caseInstances.close(C.INSTANCE_ID, C.FOLDER_KEY);

      expect(mockApiClient.post).toHaveBeenCalledWith(E.CLOSE(C.INSTANCE_ID), {}, FOLDER_HEADERS);
      expect(result).toEqual({ success: true, data: response });
    });

    it('should send the comment', async () => {
      mockApiClient.post.mockResolvedValue({ instanceId: C.INSTANCE_ID, status: 'Canceling', isCompleted: false });

      await caseInstances.close(C.INSTANCE_ID, C.FOLDER_KEY, { comment: C.COMMENT });

      expect(mockApiClient.post).toHaveBeenCalledWith(E.CLOSE(C.INSTANCE_ID), { comment: C.COMMENT }, FOLDER_HEADERS);
    });

    it('should propagate API errors', async () => {
      mockApiClient.post.mockRejectedValue(createMockError(C.ERROR_CASE_ALREADY_COMPLETED));

      await expect(caseInstances.close(C.INSTANCE_ID, C.FOLDER_KEY)).rejects.toThrow(C.ERROR_CASE_ALREADY_COMPLETED);
    });
  });

  describe('reopen', () => {
    it('should post the start element and comment to the Case App route', async () => {
      const response = { instanceId: C.INSTANCE_ID, status: 'Running' };
      mockApiClient.post.mockResolvedValue(response);

      const result = await caseInstances.reopen(C.INSTANCE_ID, C.FOLDER_KEY, { stageId: C.STAGE_ID, comment: C.COMMENT });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        E.REOPEN(C.INSTANCE_ID),
        { StartElementId: C.STAGE_ID, Comment: C.COMMENT },
        FOLDER_HEADERS
      );
      expect(result).toEqual({ success: true, data: response });
    });

    it('should propagate API errors', async () => {
      mockApiClient.post.mockRejectedValue(createMockError(C.ERROR_CASE_NOT_FOUND));

      await expect(caseInstances.reopen(C.INSTANCE_ID, C.FOLDER_KEY, { stageId: C.STAGE_ID })).rejects.toThrow(
        C.ERROR_CASE_NOT_FOUND
      );
    });
  });

  describe('sendMessage', () => {
    it('should default the reference to the case and the item data to empty', async () => {
      mockApiClient.post.mockResolvedValue({ id: C.MESSAGE_ID, jobId: C.JOB_ID });

      await caseInstances.sendMessage(C.INSTANCE_ID, C.FOLDER_KEY, CaseInstanceMessageName.UserAdhocTrigger);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        E.SEND_MESSAGE,
        { name: CaseInstanceMessageName.UserAdhocTrigger, reference: `case-${C.INSTANCE_ID}`, itemData: {} },
        FOLDER_HEADERS
      );
    });

    it('should send the given reference and item data', async () => {
      mockApiClient.post.mockResolvedValue({ id: C.MESSAGE_ID, jobId: C.JOB_ID });
      const itemData = { taskNames: [C.TASK_NAME] };

      await caseInstances.sendMessage(C.INSTANCE_ID, C.FOLDER_KEY, CaseInstanceMessageName.UserAdhocTrigger, {
        itemData,
        reference: C.STAGE_ID,
      });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        E.SEND_MESSAGE,
        { name: CaseInstanceMessageName.UserAdhocTrigger, reference: C.STAGE_ID, itemData },
        FOLDER_HEADERS
      );
    });

    it('should still omit the item data on the v1 route', async () => {
      mockApiClient.post.mockResolvedValue(undefined);

      await v1CaseInstances.sendMessage(C.INSTANCE_ID, C.FOLDER_KEY, CaseInstanceMessageName.UserSelectStage);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        MAESTRO_ENDPOINTS.INSTANCES.SEND_MESSAGE,
        { name: CaseInstanceMessageName.UserSelectStage, reference: `case-${C.INSTANCE_ID}` },
        FOLDER_HEADERS
      );
    });

    it('should propagate API errors', async () => {
      mockApiClient.post.mockRejectedValue(createMockError(C.ERROR_CASE_NOT_FOUND));

      await expect(
        caseInstances.sendMessage(C.INSTANCE_ID, C.FOLDER_KEY, CaseInstanceMessageName.UserSelectStage)
      ).rejects.toThrow(C.ERROR_CASE_NOT_FOUND);
    });
  });

  describe('methods without a Case App route', () => {
    it('should reject getById', async () => {
      await expect(caseInstances.getById(C.INSTANCE_ID, C.FOLDER_KEY)).rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.get).not.toHaveBeenCalled();
    });

    it('should reject pause', async () => {
      await expect(caseInstances.pause(C.INSTANCE_ID, C.FOLDER_KEY)).rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.post).not.toHaveBeenCalled();
    });

    it('should reject resume', async () => {
      await expect(caseInstances.resume(C.INSTANCE_ID, C.FOLDER_KEY)).rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.post).not.toHaveBeenCalled();
    });

    it('should reject getVariables', async () => {
      await expect(caseInstances.getVariables(C.INSTANCE_ID, C.FOLDER_KEY)).rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.get).not.toHaveBeenCalled();
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
});
