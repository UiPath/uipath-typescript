// ===== IMPORTS =====
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CasesService } from '../../../../src/services/maestro/cases';
import { MAESTRO_ENDPOINTS } from '../../../../src/utils/constants/endpoints';
import { ApiClient } from '../../../../src/core/http/api-client';
import {
  MAESTRO_TEST_CONSTANTS,
  TEST_CONSTANTS,
  createMockCase,
  createMockCasesGetAllApiResponse,
  createMockTopRunCountResponse,
  createMockInstanceStatusTimeline,
  createMockIncidentTimelineResponse,
  createMockTopFaultedCountResponse,
  createMockTopDurationResponse,
  createMockTopElementFailedCountResponse,
  createMockError,
  createRawExploreColumn,
  createRawExploreColumns,
  createRawExplorePagedResponse
} from '../../../utils/mocks';
import { CASE_EXPLORE_TEST_CONSTANTS as EXPLORE, PAGINATION_TEST_CONSTANTS } from '../../../utils/constants';
import { CaseExploreFilterKind, CaseExploreSortDirection } from '../../../../src/models/maestro/case-explore.types';
import type { CaseExploreQuery } from '../../../../src/models/maestro/case-explore.types';
import type { PaginationCursor } from '../../../../src/utils/pagination';
import { createServiceTestDependencies, createMockApiClient } from '../../../utils/setup';
import { ProcessType } from '../../../../src/models/maestro/cases.internal-types';

// ===== MOCKING =====
// Mock the dependencies
vi.mock('../../../../src/core/http/api-client');

// ===== TEST SUITE =====
describe('CasesService', () => {
  let service: CasesService;
  let mockApiClient: any;

  beforeEach(async () => {
    // Create mock instances using centralized setup
    const { instance } = createServiceTestDependencies();
    mockApiClient = createMockApiClient();

    // Mock the ApiClient constructor
    vi.mocked(ApiClient).mockImplementation(function () { return mockApiClient; });

    service = new CasesService(instance);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getAll', () => {
    it('should return all case management processes with instance statistics', async () => {

      const mockApiResponse = createMockCasesGetAllApiResponse([
        createMockCase(),
        createMockCase({
          processKey: MAESTRO_TEST_CONSTANTS.CASE_PROCESS_KEY,
          packageId: MAESTRO_TEST_CONSTANTS.CASE_PACKAGE_ID,
          name: MAESTRO_TEST_CONSTANTS.CASE_NAME
        })
      ]);
      mockApiClient.get.mockResolvedValue(mockApiResponse);


      const result = await service.getAll();


      expect(mockApiClient.get).toHaveBeenCalledWith(
        MAESTRO_ENDPOINTS.PROCESSES.GET_ALL,
        {
          params: {
            processType: ProcessType.CaseManagement
          }
        }
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        processKey: MAESTRO_TEST_CONSTANTS.CASE_PROCESS_KEY,
        packageId: MAESTRO_TEST_CONSTANTS.CASE_PACKAGE_ID,
        name: MAESTRO_TEST_CONSTANTS.EXTRACTED_NAME_DEFAULT, // Service extracts name from packageId
        folderKey: MAESTRO_TEST_CONSTANTS.FOLDER_KEY,
        folderName: TEST_CONSTANTS.FOLDER_NAME
      });

      expect(result[1]).toMatchObject({
        processKey: MAESTRO_TEST_CONSTANTS.CASE_PROCESS_KEY,
        packageId: MAESTRO_TEST_CONSTANTS.CASE_PACKAGE_ID,
        name: MAESTRO_TEST_CONSTANTS.EXTRACTED_NAME_DEFAULT, // Service extracts name from packageId
        folderKey: MAESTRO_TEST_CONSTANTS.FOLDER_KEY,
        folderName: TEST_CONSTANTS.FOLDER_NAME
      });
    });

    it('should handle empty cases array', async () => {

      const mockApiResponse = { processes: [] };
      mockApiClient.get.mockResolvedValue(mockApiResponse);


      const result = await service.getAll();

      expect(result).toEqual([]);
      expect(mockApiClient.get).toHaveBeenCalledWith(
        MAESTRO_ENDPOINTS.PROCESSES.GET_ALL,
        {
          params: {
            processType: ProcessType.CaseManagement
          }
        }
      );
    });

    it('should handle response without processes property', async () => {

      const mockApiResponse = {
        // Response has data but no processes property
        someOtherProperty: MAESTRO_TEST_CONSTANTS.OTHER_PROPERTY,
      };
      mockApiClient.get.mockResolvedValue(mockApiResponse);

      const result = await service.getAll();

      expect(mockApiClient.get).toHaveBeenCalledWith(
        MAESTRO_ENDPOINTS.PROCESSES.GET_ALL,
        {
          params: {
            processType: ProcessType.CaseManagement
          }
        }
      );
      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });

    it('should handle API errors', async () => {

      const error = createMockError(TEST_CONSTANTS.ERROR_MESSAGE);
      mockApiClient.get.mockRejectedValue(error);


      await expect(service.getAll()).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });

    it('should forward filter options alongside the pinned processType and convert dates to ISO strings', async () => {
      const startTime = new Date('2026-04-01T00:00:00Z');
      const endTime = new Date('2026-05-01T00:00:00Z');
      mockApiClient.get.mockResolvedValue({ processes: [] });

      await service.getAll({
        processKey: MAESTRO_TEST_CONSTANTS.CASE_PROCESS_KEY,
        packageId: MAESTRO_TEST_CONSTANTS.CASE_PACKAGE_ID,
        startTime,
        endTime,
      });

      expect(mockApiClient.get).toHaveBeenCalledWith(
        MAESTRO_ENDPOINTS.PROCESSES.GET_ALL,
        {
          params: {
            processType: ProcessType.CaseManagement,
            processKey: MAESTRO_TEST_CONSTANTS.CASE_PROCESS_KEY,
            packageId: MAESTRO_TEST_CONSTANTS.CASE_PACKAGE_ID,
            startedTimeUtcStart: startTime.toISOString(),
            startedTimeUtcEnd: endTime.toISOString(),
          },
        }
      );
    });

    it('should omit undefined filters while keeping processType', async () => {
      mockApiClient.get.mockResolvedValue({ processes: [] });

      await service.getAll({ packageId: MAESTRO_TEST_CONSTANTS.CASE_PACKAGE_ID });

      expect(mockApiClient.get).toHaveBeenCalledWith(
        MAESTRO_ENDPOINTS.PROCESSES.GET_ALL,
        {
          params: {
            processType: ProcessType.CaseManagement,
            packageId: MAESTRO_TEST_CONSTANTS.CASE_PACKAGE_ID,
          },
        }
      );
    });

    it('should extract case name from packageId with CaseManagement prefix', async () => {

      const mockApiResponse = createMockCasesGetAllApiResponse([
        createMockCase({
          processKey: MAESTRO_TEST_CONSTANTS.CASE_PROCESS_KEY,
          packageId: MAESTRO_TEST_CONSTANTS.PACKAGE_NAME_WITH_PREFIX
        })
      ]);

      mockApiClient.get.mockResolvedValue(mockApiResponse);


      const result = await service.getAll();

      expect(result[0].name).toBe(MAESTRO_TEST_CONSTANTS.EXTRACTED_NAME_WITH_PREFIX);
    });

    it('should extract case name from packageId without CaseManagement prefix', async () => {

      const mockApiResponse = createMockCasesGetAllApiResponse([
        createMockCase({
          processKey: MAESTRO_TEST_CONSTANTS.CASE_PROCESS_KEY,
          packageId: MAESTRO_TEST_CONSTANTS.PACKAGE_NAME_WITHOUT_PREFIX
        })
      ]);

      mockApiClient.get.mockResolvedValue(mockApiResponse);


      const result = await service.getAll();

      expect(result[0].name).toBe(MAESTRO_TEST_CONSTANTS.EXTRACTED_NAME_WITHOUT_PREFIX);
    });
  });

  describe('getTopRunCount', () => {
    const mockResponse = [
      createMockTopRunCountResponse({
        packageId: MAESTRO_TEST_CONSTANTS.CASE_PACKAGE_ID,
        runCount: MAESTRO_TEST_CONSTANTS.RUN_COUNT_CASE,
        processKey: MAESTRO_TEST_CONSTANTS.CASE_PROCESS_KEY
      })
    ];

    it('should retrieve top case processes by run count with isCaseManagement true', async () => {
      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await service.getTopRunCount(
        new Date('2026-04-01T00:00:00Z'),
        new Date('2026-05-01T00:00:00Z')
      );

      expect(result).toHaveLength(1);
      expect(result[0].packageId).toBe(MAESTRO_TEST_CONSTANTS.CASE_PACKAGE_ID);
      expect(result[0].name).toBe(MAESTRO_TEST_CONSTANTS.EXTRACTED_NAME_DEFAULT);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          commonParams: expect.objectContaining({ isCaseManagement: true })
        }),
        {}
      );
    });

    it('should handle API errors', async () => {
      mockApiClient.post.mockRejectedValue(new Error(TEST_CONSTANTS.ERROR_MESSAGE));

      await expect(
        service.getTopRunCount(new Date(), new Date())
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe('getInstanceStatusTimeline', () => {
    it('should call InstanceStatusByDate with isCaseManagement true', async () => {
      mockApiClient.post.mockResolvedValue([createMockInstanceStatusTimeline()]);

      const result = await service.getInstanceStatusTimeline(
        new Date('2026-04-01T00:00:00Z'),
        new Date('2026-05-01T00:00:00Z'),
      );

      expect(result).toHaveLength(1);
      expect(result[0].startTime).toBe(MAESTRO_TEST_CONSTANTS.INSIGHTS_DATE_1);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        MAESTRO_ENDPOINTS.INSIGHTS.INSTANCE_STATUS_BY_DATE,
        expect.objectContaining({
          commonParams: expect.objectContaining({ isCaseManagement: true }),
        }),
        {},
      );
    });
  });

  describe('getIncidentsTimeline', () => {
    it('should call IncidentsByTimeWindow with isCaseManagement true and unwrap dataPoints', async () => {
      mockApiClient.post.mockResolvedValue({
        dataPoints: [createMockIncidentTimelineResponse()],
      });

      const result = await service.getIncidentsTimeline(
        new Date('2026-04-01T00:00:00Z'),
        new Date('2026-05-01T00:00:00Z'),
      );

      expect(result).toHaveLength(1);
      expect(result[0].startTime).toBe(MAESTRO_TEST_CONSTANTS.INSIGHTS_INCIDENT_BUCKET_START_1);
      expect(result[0].endTime).toBe(MAESTRO_TEST_CONSTANTS.INSIGHTS_INCIDENT_BUCKET_END_1);
      expect(result[0].count).toBe(MAESTRO_TEST_CONSTANTS.INSIGHTS_INCIDENT_COUNT_1);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        MAESTRO_ENDPOINTS.INSIGHTS.INCIDENTS_BY_TIME_WINDOW,
        expect.objectContaining({
          commonParams: expect.objectContaining({ isCaseManagement: true }),
        }),
        {},
      );
    });

    it('should handle API errors', async () => {
      mockApiClient.post.mockRejectedValue(
        createMockError(MAESTRO_TEST_CONSTANTS.ERROR_INCIDENTS_TIMELINE_FAILED),
      );

      await expect(
        service.getIncidentsTimeline(new Date(), new Date()),
      ).rejects.toThrow(MAESTRO_TEST_CONSTANTS.ERROR_INCIDENTS_TIMELINE_FAILED);
    });
  });

  describe('getTopFaultedCount', () => {
    it('should retrieve top case processes by failure count with isCaseManagement true', async () => {
      mockApiClient.post.mockResolvedValue([
        createMockTopFaultedCountResponse({
          packageId: MAESTRO_TEST_CONSTANTS.CASE_PACKAGE_ID,
          runCount: MAESTRO_TEST_CONSTANTS.FAULTED_COUNT_CASE,
        })
      ]);

      const result = await service.getTopFaultedCount(
        new Date('2026-04-01T00:00:00Z'),
        new Date('2026-05-01T00:00:00Z'),
        { packageId: MAESTRO_TEST_CONSTANTS.CASE_PACKAGE_ID }
      );

      expect(result).toHaveLength(1);
      expect(result[0].packageId).toBe(MAESTRO_TEST_CONSTANTS.CASE_PACKAGE_ID);
      expect(result[0].name).toBe(MAESTRO_TEST_CONSTANTS.EXTRACTED_NAME_DEFAULT);
      expect(result[0].faultedCount).toBe(MAESTRO_TEST_CONSTANTS.FAULTED_COUNT_CASE);
      expect((result[0] as any).runCount).toBeUndefined();
      expect(mockApiClient.post).toHaveBeenCalledWith(
        MAESTRO_ENDPOINTS.INSIGHTS.TOP_PROCESSES_WITH_FAILURE,
        expect.objectContaining({
          commonParams: expect.objectContaining({
            isCaseManagement: true,
            packageId: MAESTRO_TEST_CONSTANTS.CASE_PACKAGE_ID,
          })
        }),
        {}
      );
    });

    it('should handle API errors', async () => {
      mockApiClient.post.mockRejectedValue(new Error(TEST_CONSTANTS.ERROR_MESSAGE));

      await expect(
        service.getTopFaultedCount(new Date(), new Date())
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe('getTopElementFailedCount', () => {
    it('should retrieve top elements by failure count with isCaseManagement true', async () => {
      mockApiClient.post.mockResolvedValue([createMockTopElementFailedCountResponse()]);

      const result = await service.getTopElementFailedCount(
        new Date('2026-04-01T00:00:00Z'),
        new Date('2026-05-01T00:00:00Z'),
        { processKey: MAESTRO_TEST_CONSTANTS.CASE_PROCESS_KEY }
      );

      expect(result).toHaveLength(1);
      expect(result[0].elementName).toBe(MAESTRO_TEST_CONSTANTS.ELEMENT_NAME_1);
      expect(result[0].failedCount).toBe(MAESTRO_TEST_CONSTANTS.ELEMENT_FAILED_COUNT_1);
      expect((result[0] as any).count).toBeUndefined();
      expect(result[0].elementType).toBe(MAESTRO_TEST_CONSTANTS.ELEMENT_TYPE_1);
      expect(result[0].processKey).toBe(MAESTRO_TEST_CONSTANTS.PROCESS_KEY);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        MAESTRO_ENDPOINTS.INSIGHTS.TOP_ELEMENTS_WITH_FAILURE,
        expect.objectContaining({
          commonParams: expect.objectContaining({
            isCaseManagement: true,
            processKey: MAESTRO_TEST_CONSTANTS.CASE_PROCESS_KEY,
          })
        }),
        {}
      );
    });

    it('should handle API errors', async () => {
      mockApiClient.post.mockRejectedValue(new Error(TEST_CONSTANTS.ERROR_MESSAGE));

      await expect(
        service.getTopElementFailedCount(new Date(), new Date())
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe('getTopExecutionDuration', () => {
    const mockResponse = [
      createMockTopDurationResponse({
        packageId: MAESTRO_TEST_CONSTANTS.CASE_PACKAGE_ID,
        duration: MAESTRO_TEST_CONSTANTS.DURATION_CASE,
        processKey: MAESTRO_TEST_CONSTANTS.CASE_PROCESS_KEY
      })
    ];

    it('should retrieve top case processes by duration with isCaseManagement true', async () => {
      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await service.getTopExecutionDuration(
        new Date('2026-04-01T00:00:00Z'),
        new Date('2026-05-01T00:00:00Z'),
        { packageId: MAESTRO_TEST_CONSTANTS.CASE_PACKAGE_ID }
      );

      expect(result).toHaveLength(1);
      expect(result[0].packageId).toBe(MAESTRO_TEST_CONSTANTS.CASE_PACKAGE_ID);
      expect(result[0].name).toBe(MAESTRO_TEST_CONSTANTS.EXTRACTED_NAME_DEFAULT);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          commonParams: expect.objectContaining({
            isCaseManagement: true,
            packageId: MAESTRO_TEST_CONSTANTS.CASE_PACKAGE_ID,
          })
        }),
        {}
      );
    });
  });

  describe('getElementStats', () => {
    it('should retrieve element stats for case instances', async () => {
      mockApiClient.post.mockResolvedValue([...MAESTRO_TEST_CONSTANTS.MOCK_ELEMENT_STATS]);

      const result = await service.getElementStats({
        processKey: MAESTRO_TEST_CONSTANTS.CASE_PROCESS_KEY,
        packageId: MAESTRO_TEST_CONSTANTS.CASE_PACKAGE_ID,
        packageVersion: MAESTRO_TEST_CONSTANTS.PACKAGE_VERSION,
        startTime: new Date('2026-04-01T00:00:00Z'),
        endTime: new Date('2026-05-01T00:00:00Z'),
      });

      expect(result).toHaveLength(2);
      expect(result[0].elementId).toBe('Event_start');
      expect(result[0].successCount).toBe(2);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        MAESTRO_ENDPOINTS.INSIGHTS.ELEMENT_COUNT_BY_STATUS,
        expect.objectContaining({
          commonParams: expect.objectContaining({
            processKey: MAESTRO_TEST_CONSTANTS.CASE_PROCESS_KEY,
            packageId: MAESTRO_TEST_CONSTANTS.CASE_PACKAGE_ID,
          })
        }),
        {}
      );
    });
  });

  describe('getInstanceStats', () => {
    it('should retrieve instance stats for case instances', async () => {
      mockApiClient.post.mockResolvedValue(MAESTRO_TEST_CONSTANTS.MOCK_INSTANCE_STATS);

      const result = await service.getInstanceStats({
        processKey: MAESTRO_TEST_CONSTANTS.CASE_PROCESS_KEY,
        packageId: MAESTRO_TEST_CONSTANTS.CASE_PACKAGE_ID,
        packageVersion: MAESTRO_TEST_CONSTANTS.PACKAGE_VERSION,
        startTime: new Date('2026-04-01T00:00:00Z'),
        endTime: new Date('2026-05-01T00:00:00Z'),
      });

      expect(result.totalCount).toBe(276);
      expect(result.completedCount).toBe(275);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        MAESTRO_ENDPOINTS.INSIGHTS.INSTANCE_COUNT_BY_STATUS,
        expect.objectContaining({
          commonParams: expect.objectContaining({
            processKey: MAESTRO_TEST_CONSTANTS.CASE_PROCESS_KEY,
            packageId: MAESTRO_TEST_CONSTANTS.CASE_PACKAGE_ID,
          })
        }),
        {}
      );
    });
  });

  describe('explore', () => {
    const query: CaseExploreQuery = {
      groupBy: [EXPLORE.FIELD_CASE_ID, EXPLORE.FIELD_STATUS],
      filters: [[{ kind: CaseExploreFilterKind.Value, field: EXPLORE.FIELD_IS_LATEST, values: [EXPLORE.IS_LATEST] }]],
    };

    it('should post the query and zip the columnar result into rows', async () => {
      mockApiClient.post.mockResolvedValue(createRawExploreColumns());

      const result = await service.explore(query);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        MAESTRO_ENDPOINTS.INSIGHTS.CASE_EXPLORE,
        {
          groupBy: [EXPLORE.FIELD_CASE_ID, EXPLORE.FIELD_STATUS],
          aggregates: [],
          filters: [[{ Kind: 'ValueFilter', Type: 'StringValues', Dimension: EXPLORE.FIELD_IS_LATEST, Values: [EXPLORE.IS_LATEST] }]],
          sort: [],
        },
        {}
      );
      expect(result.items).toEqual([
        { [EXPLORE.FIELD_CASE_ID]: EXPLORE.CASE_ID_1, [EXPLORE.FIELD_STATUS]: EXPLORE.STATUS_RUNNING },
        { [EXPLORE.FIELD_CASE_ID]: EXPLORE.CASE_ID_2, [EXPLORE.FIELD_STATUS]: EXPLORE.STATUS_COMPLETED },
      ]);
      expect('hasNextPage' in result).toBe(false);
    });

    it('should drop the engine marker columns from rows', async () => {
      mockApiClient.post.mockResolvedValue(createRawExploreColumns());

      const result = await service.explore(query);

      expect(result.items[0][EXPLORE.MARKER_COLUMN]).toBeUndefined();
    });

    it('should map search filters, aggregates, sort and limit to the wire shape', async () => {
      mockApiClient.post.mockResolvedValue({});

      await service.explore({
        groupBy: [EXPLORE.FIELD_STATUS],
        aggregates: [{ id: EXPLORE.AGGREGATE_ID, measureRef: EXPLORE.MEASURE_CASE_COUNT }],
        filters: [
          [{ kind: CaseExploreFilterKind.Search, field: EXPLORE.FIELD_CASE_TITLE, pattern: EXPLORE.TITLE_PREFIX }],
          [{ kind: CaseExploreFilterKind.Value, field: EXPLORE.FIELD_PROCESS_KEY, values: [EXPLORE.PROCESS_KEY] }],
        ],
        sort: [{ field: EXPLORE.AGGREGATE_ID, direction: CaseExploreSortDirection.Descending }],
        limit: EXPLORE.LIMIT,
      });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        MAESTRO_ENDPOINTS.INSIGHTS.CASE_EXPLORE,
        {
          groupBy: [EXPLORE.FIELD_STATUS],
          aggregates: [{ id: EXPLORE.AGGREGATE_ID, measureRef: EXPLORE.MEASURE_CASE_COUNT }],
          filters: [
            [{ Kind: 'SearchFilter', Dimension: EXPLORE.FIELD_CASE_TITLE, Pattern: EXPLORE.TITLE_PREFIX, FilterType: 'StartsWith' }],
            [{ Kind: 'ValueFilter', Type: 'StringValues', Dimension: EXPLORE.FIELD_PROCESS_KEY, Values: [EXPLORE.PROCESS_KEY] }],
          ],
          sort: [{ Field: EXPLORE.AGGREGATE_ID, Direction: 'desc' }],
          limit: EXPLORE.LIMIT,
        },
        {}
      );
    });

    it('should keep numeric aggregate values', async () => {
      mockApiClient.post.mockResolvedValue({
        [EXPLORE.FIELD_STATUS]: createRawExploreColumn([EXPLORE.STATUS_RUNNING, EXPLORE.STATUS_COMPLETED]),
        [EXPLORE.AGGREGATE_ID]: createRawExploreColumn([EXPLORE.COUNT_1, EXPLORE.COUNT_2]),
      });

      const result = await service.explore({ groupBy: [EXPLORE.FIELD_STATUS] });

      expect(result.items.map(row => row[EXPLORE.AGGREGATE_ID])).toEqual([EXPLORE.COUNT_1, EXPLORE.COUNT_2]);
    });

    it('should fill null for a column shorter than the others or with no values', async () => {
      mockApiClient.post.mockResolvedValue(createRawExploreColumns({
        [EXPLORE.FIELD_SLA_STATUS]: createRawExploreColumn([EXPLORE.SLA_ON_TRACK]),
        [EXPLORE.FIELD_PROCESS_KEY]: createRawExploreColumn(null),
      }));

      const result = await service.explore(query);

      expect(result.items).toHaveLength(2);
      expect(result.items[1][EXPLORE.FIELD_SLA_STATUS]).toBeNull();
      expect(result.items[0][EXPLORE.FIELD_PROCESS_KEY]).toBeNull();
    });

    it('should return no rows for an empty result', async () => {
      mockApiClient.post.mockResolvedValue({});

      const result = await service.explore(query);

      expect(result.items).toEqual([]);
    });

    it('should send page and pageSize as query params and return a paginated response', async () => {
      mockApiClient.post.mockResolvedValue(createRawExplorePagedResponse());

      const result = await service.explore({ ...query, limit: EXPLORE.LIMIT }, { pageSize: EXPLORE.PAGE_SIZE });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        MAESTRO_ENDPOINTS.INSIGHTS.CASE_EXPLORE,
        expect.objectContaining({ limit: EXPLORE.PAGE_SIZE }),
        { params: { page: 1, pageSize: EXPLORE.PAGE_SIZE } }
      );
      expect(result.items).toHaveLength(2);
      expect(result.hasNextPage).toBe(true);
      expect(result.nextCursor).toBeDefined();
      expect(result.previousCursor).toBeUndefined();
      expect(result.currentPage).toBe(1);
      expect(result.supportsPageJump).toBe(true);
      expect(result.totalCount).toBeUndefined();
    });

    it('should fetch the next page from the cursor at the page size the engine reported', async () => {
      mockApiClient.post.mockResolvedValueOnce(createRawExplorePagedResponse({ pageSize: EXPLORE.SERVER_PAGE_SIZE }));
      const first = await service.explore(query, { pageSize: EXPLORE.PAGE_SIZE });

      mockApiClient.post.mockResolvedValueOnce(createRawExplorePagedResponse({ page: 2, pageSize: EXPLORE.SERVER_PAGE_SIZE, hasNextPage: false, hasPreviousPage: true }));
      const second = await service.explore(query, { cursor: first.nextCursor as PaginationCursor });

      expect(mockApiClient.post).toHaveBeenLastCalledWith(
        MAESTRO_ENDPOINTS.INSIGHTS.CASE_EXPLORE,
        expect.objectContaining({ limit: EXPLORE.SERVER_PAGE_SIZE }),
        { params: { page: 2, pageSize: EXPLORE.SERVER_PAGE_SIZE } }
      );
      expect(second.hasNextPage).toBe(false);
      expect(second.nextCursor).toBeUndefined();
      expect(second.previousCursor).toBeDefined();
      expect(second.currentPage).toBe(2);
    });

    it('should request the page given by jumpToPage', async () => {
      mockApiClient.post.mockResolvedValue(createRawExplorePagedResponse({ page: EXPLORE.JUMP_TO_PAGE }));

      await service.explore(query, { pageSize: EXPLORE.PAGE_SIZE, jumpToPage: EXPLORE.JUMP_TO_PAGE });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        MAESTRO_ENDPOINTS.INSIGHTS.CASE_EXPLORE,
        expect.any(Object),
        { params: { page: EXPLORE.JUMP_TO_PAGE, pageSize: EXPLORE.PAGE_SIZE } }
      );
    });

    it('should treat a bare empty answer to a paginated request as the last page', async () => {
      mockApiClient.post.mockResolvedValue({});

      const result = await service.explore(query, { pageSize: EXPLORE.PAGE_SIZE });

      expect(result.items).toEqual([]);
      expect(result.hasNextPage).toBe(false);
      expect(result.nextCursor).toBeUndefined();
    });

    it('should treat a malformed pagination envelope as an empty last page', async () => {
      mockApiClient.post.mockResolvedValue({ data: null, pagination: { hasNextPage: true } });

      const result = await service.explore(query, { pageSize: EXPLORE.PAGE_SIZE });

      expect(result.items).toEqual([]);
      expect(result.hasNextPage).toBe(false);
    });

    it('should reject an invalid page size before calling the API', async () => {
      await expect(service.explore(query, { pageSize: 0 })).rejects.toThrow(PAGINATION_TEST_CONSTANTS.ERROR_PAGE_SIZE_POSITIVE);
      expect(mockApiClient.post).not.toHaveBeenCalled();
    });

    it('should handle API errors', async () => {
      mockApiClient.post.mockRejectedValue(new Error(TEST_CONSTANTS.ERROR_MESSAGE));

      await expect(service.explore(query)).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });

    it('should handle API errors on a paginated request', async () => {
      mockApiClient.post.mockRejectedValue(new Error(TEST_CONSTANTS.ERROR_MESSAGE));

      await expect(service.explore(query, { pageSize: EXPLORE.PAGE_SIZE })).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });
});
