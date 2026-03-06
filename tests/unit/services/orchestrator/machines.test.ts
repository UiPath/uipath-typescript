// ===== IMPORTS =====
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MachineService } from '../../../../src/services/orchestrator/machines';
import { ApiClient } from '../../../../src/core/http/api-client';
import { PaginationHelpers } from '../../../../src/utils/pagination/helpers';
import {
  createMockRawMachine,
  createMockTransformedMachineCollection
} from '../../../utils/mocks/machines';
import { createServiceTestDependencies, createMockApiClient } from '../../../utils/setup';
import { createMockError } from '../../../utils/mocks/core';
import {
  MachineGetAllOptions,
  MachineGetByIdOptions
} from '../../../../src/models/orchestrator/machines.types';
import { MACHINE_TEST_CONSTANTS } from '../../../utils/constants/machines';
import { TEST_CONSTANTS } from '../../../utils/constants/common';
import { MACHINE_ENDPOINTS } from '../../../../src/utils/constants/endpoints';

// ===== MOCKING =====
// Mock the dependencies
vi.mock('../../../../src/core/http/api-client');

// Import mock objects using vi.hoisted() - this ensures they're available before vi.mock() calls
const mocks = vi.hoisted(() => {
  return import('../../../utils/mocks/core');
});

// Setup mocks at module level
// NOTE: We do NOT mock transformData - we want to test the actual transformation logic!
vi.mock('../../../../src/utils/pagination/helpers', async () => (await mocks).mockPaginationHelpers);

// ===== TEST SUITE =====
describe('MachineService Unit Tests', () => {
  let machineService: MachineService;
  let mockApiClient: any;

  beforeEach(() => {
    const { instance } = createServiceTestDependencies();
    mockApiClient = createMockApiClient();

    vi.mocked(ApiClient).mockImplementation(() => mockApiClient);
    vi.mocked(PaginationHelpers.getAll).mockReset();

    machineService = new MachineService(instance);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getAll', () => {
    it('should return all machines without pagination options', async () => {
      const mockResponse = createMockTransformedMachineCollection();

      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(mockResponse);

      const result = await machineService.getAll();

      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceAccess: expect.any(Object),
          getEndpoint: expect.toSatisfy((fn: Function) => fn() === MACHINE_ENDPOINTS.GET_ALL),
          transformFn: expect.any(Function),
          pagination: expect.any(Object)
        }),
        undefined
      );

      expect(result).toEqual(mockResponse);
    });

    it('should return paginated machines when pagination options provided', async () => {
      const mockResponse = createMockTransformedMachineCollection(10, {
        totalCount: 100,
        hasNextPage: true,
        nextCursor: TEST_CONSTANTS.NEXT_CURSOR,
        previousCursor: null,
        currentPage: 1,
        totalPages: 10
      });

      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(mockResponse);

      const options: MachineGetAllOptions = { pageSize: TEST_CONSTANTS.PAGE_SIZE };
      const result = await machineService.getAll(options) as any;

      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ pageSize: TEST_CONSTANTS.PAGE_SIZE })
      );

      expect(result).toEqual(mockResponse);
      expect(result.hasNextPage).toBe(true);
      expect(result.nextCursor).toBe(TEST_CONSTANTS.NEXT_CURSOR);
    });

    it('should handle filter option', async () => {
      const mockResponse = createMockTransformedMachineCollection();

      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(mockResponse);

      const options: MachineGetAllOptions = { filter: "name eq 'BuildServer01'" };
      await machineService.getAll(options);

      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ filter: "name eq 'BuildServer01'" })
      );
    });

    it('should handle API errors', async () => {
      const error = createMockError(TEST_CONSTANTS.ERROR_MESSAGE);
      vi.mocked(PaginationHelpers.getAll).mockRejectedValue(error);

      await expect(machineService.getAll()).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe('getById', () => {
    it('should get machine by ID successfully with all fields mapped correctly', async () => {
      const mockMachine = createMockRawMachine();
      mockApiClient.get.mockResolvedValue(mockMachine);

      const result = await machineService.getById(MACHINE_TEST_CONSTANTS.MACHINE_ID);

      expect(result).toBeDefined();
      expect(result.id).toBe(MACHINE_TEST_CONSTANTS.MACHINE_ID);
      expect(result.name).toBe(MACHINE_TEST_CONSTANTS.MACHINE_NAME);
      expect(result.isOnline).toBe(MACHINE_TEST_CONSTANTS.IS_ONLINE);
      expect(result.unattendedSlots).toBe(MACHINE_TEST_CONSTANTS.UNATTENDED_SLOTS);
      expect(result.status).toBe(MACHINE_TEST_CONSTANTS.STATUS);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        MACHINE_ENDPOINTS.GET_BY_ID(MACHINE_TEST_CONSTANTS.MACHINE_ID),
        expect.objectContaining({
          params: expect.any(Object)
        })
      );
    });

    it('should get machine by ID with options', async () => {
      const mockMachine = createMockRawMachine();
      mockApiClient.get.mockResolvedValue(mockMachine);

      const options: MachineGetByIdOptions = { select: MACHINE_TEST_CONSTANTS.ODATA_SELECT_FIELDS };
      await machineService.getById(MACHINE_TEST_CONSTANTS.MACHINE_ID, options);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        MACHINE_ENDPOINTS.GET_BY_ID(MACHINE_TEST_CONSTANTS.MACHINE_ID),
        expect.objectContaining({
          params: expect.objectContaining({
            '$select': MACHINE_TEST_CONSTANTS.ODATA_SELECT_FIELDS
          })
        })
      );
    });

    it('should handle API errors', async () => {
      const error = createMockError(MACHINE_TEST_CONSTANTS.ERROR_MACHINE_NOT_FOUND);
      mockApiClient.get.mockRejectedValue(error);

      await expect(machineService.getById(MACHINE_TEST_CONSTANTS.MACHINE_ID))
        .rejects.toThrow(MACHINE_TEST_CONSTANTS.ERROR_MACHINE_NOT_FOUND);
    });
  });
});
