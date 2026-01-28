import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createCaseInstanceWithMethods,
  CaseInstancesServiceModel
} from '../../../../src/models/maestro/case-instances.models';
import {
  MAESTRO_TEST_CONSTANTS,
  TEST_CONSTANTS,
  createMockOperationResponse,
  createMockCaseInstance,
  createMockCaseInstanceExecutionHistory,
  createMockCaseStage
} from '../../../utils/mocks';
import type {
  CaseInstanceOperationOptions,
  CaseInstanceReopenRequest,
} from '../../../../src/models/maestro/case-instances.types';

// ===== TEST SUITE =====
describe('Case Instance Models', () => {
  let mockService: CaseInstancesServiceModel;

  beforeEach(() => {
    // Create a mock service
    mockService = {
      getAll: vi.fn(),
      getById: vi.fn(),
      close: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      reopen: vi.fn(),
      getExecutionHistory: vi.fn(),
      getStages: vi.fn(),
      getActionTasks: vi.fn()
    } as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('bound methods on case instance', () => {
    describe('caseInstance.close()', () => {
      it('should call caseInstance.close with bound instanceId and folderKey', async () => {
        const mockInstanceData = createMockCaseInstance();
        const instance = createCaseInstanceWithMethods(mockInstanceData, mockService);
        
        const mockResponse = createMockOperationResponse({
          instanceId: MAESTRO_TEST_CONSTANTS.CASE_INSTANCE_ID,
          status: TEST_CONSTANTS.CANCELLED
        });
        mockService.close = vi.fn().mockResolvedValue(mockResponse);

        await instance.close();

        expect(mockService.close).toHaveBeenCalledWith(
          MAESTRO_TEST_CONSTANTS.CASE_INSTANCE_ID,
          MAESTRO_TEST_CONSTANTS.FOLDER_KEY,
          undefined
        );
      });

      it('should call caseInstance.close with bound parameters and options', async () => {
        const mockInstanceData = createMockCaseInstance();
        const instance = createCaseInstanceWithMethods(mockInstanceData, mockService);
        
        const mockResponse = createMockOperationResponse({
          instanceId: MAESTRO_TEST_CONSTANTS.CASE_INSTANCE_ID,
          status: TEST_CONSTANTS.CANCELLED
        });
        const options: CaseInstanceOperationOptions = { comment: MAESTRO_TEST_CONSTANTS.TEST_COMMENT };
        mockService.close = vi.fn().mockResolvedValue(mockResponse);

        await instance.close(options);

        expect(mockService.close).toHaveBeenCalledWith(
          MAESTRO_TEST_CONSTANTS.CASE_INSTANCE_ID,
          MAESTRO_TEST_CONSTANTS.FOLDER_KEY,
          options
        );
      });

      it('should throw error if instanceId is undefined', async () => {
        const mockInstanceData = createMockCaseInstance();
        const invalidInstanceData = { ...mockInstanceData, instanceId: undefined as any };
        const invalidInstance = createCaseInstanceWithMethods(invalidInstanceData, mockService);
        
        await expect(invalidInstance.close()).rejects.toThrow('Case instance ID is undefined');
      });

      it('should throw error if folderKey is undefined', async () => {
        const mockInstanceData = createMockCaseInstance();
        const invalidInstanceData = { ...mockInstanceData, folderKey: undefined as any };
        const invalidInstance = createCaseInstanceWithMethods(invalidInstanceData, mockService);
        
        await expect(invalidInstance.close()).rejects.toThrow('Case instance folder key is undefined');
      });
    });

    describe('caseInstance.pause()', () => {
      it('should call caseInstance.pause with bound instanceId and folderKey', async () => {
        const mockInstanceData = createMockCaseInstance();
        const instance = createCaseInstanceWithMethods(mockInstanceData, mockService);
        
        const mockResponse = createMockOperationResponse({
          instanceId: MAESTRO_TEST_CONSTANTS.CASE_INSTANCE_ID,
          status: MAESTRO_TEST_CONSTANTS.TASK_STATUS_PAUSED
        });
        mockService.pause = vi.fn().mockResolvedValue(mockResponse);
        
        await instance.pause();
        
        expect(mockService.pause).toHaveBeenCalledWith(
          MAESTRO_TEST_CONSTANTS.CASE_INSTANCE_ID,
          MAESTRO_TEST_CONSTANTS.FOLDER_KEY,
          undefined
        );
      });

      it('should call caseInstance.pause with bound parameters and options', async () => {
        const mockInstanceData = createMockCaseInstance();
        const instance = createCaseInstanceWithMethods(mockInstanceData, mockService);
        
        const mockResponse = createMockOperationResponse({
          instanceId: MAESTRO_TEST_CONSTANTS.CASE_INSTANCE_ID,
          status: MAESTRO_TEST_CONSTANTS.TASK_STATUS_PAUSED
        });
        const options: CaseInstanceOperationOptions = { comment: MAESTRO_TEST_CONSTANTS.TEST_COMMENT };
        mockService.pause = vi.fn().mockResolvedValue(mockResponse);
        
        await instance.pause(options);

        expect(mockService.pause).toHaveBeenCalledWith(
          MAESTRO_TEST_CONSTANTS.CASE_INSTANCE_ID,
          MAESTRO_TEST_CONSTANTS.FOLDER_KEY,
          options
        );
      });

      it('should throw error if instanceId is undefined', async () => {
        const mockInstanceData = createMockCaseInstance();
        const invalidInstanceData = { ...mockInstanceData, instanceId: undefined as any };
        const invalidInstance = createCaseInstanceWithMethods(invalidInstanceData, mockService);
        
        await expect(invalidInstance.pause()).rejects.toThrow('Case instance ID is undefined');
      });

      it('should throw error if folderKey is undefined', async () => {
        const mockInstanceData = createMockCaseInstance();
        const invalidInstanceData = { ...mockInstanceData, folderKey: undefined as any };
        const invalidInstance = createCaseInstanceWithMethods(invalidInstanceData, mockService);
        
        await expect(invalidInstance.pause()).rejects.toThrow('Case instance folder key is undefined');
      });
    });

    describe('caseInstance.resume()', () => {
      it('should call caseInstance.resume with bound instanceId and folderKey', async () => {
        const mockInstanceData = createMockCaseInstance();
        const instance = createCaseInstanceWithMethods(mockInstanceData, mockService);

        const mockResponse = createMockOperationResponse({
          instanceId: MAESTRO_TEST_CONSTANTS.CASE_INSTANCE_ID,
          status: TEST_CONSTANTS.RUNNING
        });
        mockService.resume = vi.fn().mockResolvedValue(mockResponse);

        await instance.resume();

        expect(mockService.resume).toHaveBeenCalledWith(
          MAESTRO_TEST_CONSTANTS.CASE_INSTANCE_ID,
          MAESTRO_TEST_CONSTANTS.FOLDER_KEY,
          undefined
        );
      });

      it('should call caseInstance.resume with bound parameters and options', async () => {
        const mockInstanceData = createMockCaseInstance();
        const instance = createCaseInstanceWithMethods(mockInstanceData, mockService);

        const mockResponse = createMockOperationResponse({
          instanceId: MAESTRO_TEST_CONSTANTS.CASE_INSTANCE_ID,
          status: TEST_CONSTANTS.RUNNING
        });
        const options: CaseInstanceOperationOptions = { comment: MAESTRO_TEST_CONSTANTS.TEST_COMMENT };
        mockService.resume = vi.fn().mockResolvedValue(mockResponse);

        await instance.resume(options);

        expect(mockService.resume).toHaveBeenCalledWith(
          MAESTRO_TEST_CONSTANTS.CASE_INSTANCE_ID,
          MAESTRO_TEST_CONSTANTS.FOLDER_KEY,
          options
        );
      });

      it('should throw error if instanceId is undefined', async () => {
        const mockInstanceData = createMockCaseInstance();
        const invalidInstanceData = { ...mockInstanceData, instanceId: undefined as any };
        const invalidInstance = createCaseInstanceWithMethods(invalidInstanceData, mockService);

        await expect(invalidInstance.resume()).rejects.toThrow('Case instance ID is undefined');
      });

      it('should throw error if folderKey is undefined', async () => {
        const mockInstanceData = createMockCaseInstance();
        const invalidInstanceData = { ...mockInstanceData, folderKey: undefined as any };
        const invalidInstance = createCaseInstanceWithMethods(invalidInstanceData, mockService);

        await expect(invalidInstance.resume()).rejects.toThrow('Case instance folder key is undefined');
      });
    });

    describe('caseInstance.reopen()', () => {
      it('should call caseInstance.reopen with bound instanceId, folderKey, and request', async () => {
        const mockInstanceData = createMockCaseInstance();
        const instance = createCaseInstanceWithMethods(mockInstanceData, mockService);

        const mockResponse = createMockOperationResponse({
          instanceId: MAESTRO_TEST_CONSTANTS.CASE_INSTANCE_ID,
          status: TEST_CONSTANTS.RUNNING
        });
        const request: CaseInstanceReopenRequest = {
          startElementId: MAESTRO_TEST_CONSTANTS.CASE_STAGE_ID,
          comment: 'Reopening case'
        };
        mockService.reopen = vi.fn().mockResolvedValue(mockResponse);

        await instance.reopen(request);

        expect(mockService.reopen).toHaveBeenCalledWith(
          MAESTRO_TEST_CONSTANTS.CASE_INSTANCE_ID,
          MAESTRO_TEST_CONSTANTS.FOLDER_KEY,
          request
        );
      });

      it('should call caseInstance.reopen with only startElementId', async () => {
        const mockInstanceData = createMockCaseInstance();
        const instance = createCaseInstanceWithMethods(mockInstanceData, mockService);

        const mockResponse = createMockOperationResponse({
          instanceId: MAESTRO_TEST_CONSTANTS.CASE_INSTANCE_ID,
          status: TEST_CONSTANTS.RUNNING
        });
        const request: CaseInstanceReopenRequest = {
          startElementId: MAESTRO_TEST_CONSTANTS.CASE_STAGE_ID
        };
        mockService.reopen = vi.fn().mockResolvedValue(mockResponse);

        const result = await instance.reopen(request);

        expect(mockService.reopen).toHaveBeenCalledWith(
          MAESTRO_TEST_CONSTANTS.CASE_INSTANCE_ID,
          MAESTRO_TEST_CONSTANTS.FOLDER_KEY,
          request
        );
        expect(result).toEqual(mockResponse);
      });

      it('should throw error if instanceId is undefined', async () => {
        const mockInstanceData = createMockCaseInstance();
        const invalidInstanceData = { ...mockInstanceData, instanceId: undefined as any };
        const invalidInstance = createCaseInstanceWithMethods(invalidInstanceData, mockService);

        const request: CaseInstanceReopenRequest = {
          startElementId: MAESTRO_TEST_CONSTANTS.CASE_STAGE_ID
        };

        await expect(invalidInstance.reopen(request)).rejects.toThrow('Case instance ID is undefined');
      });

      it('should throw error if folderKey is undefined', async () => {
        const mockInstanceData = createMockCaseInstance();
        const invalidInstanceData = { ...mockInstanceData, folderKey: undefined as any };
        const invalidInstance = createCaseInstanceWithMethods(invalidInstanceData, mockService);

        const request: CaseInstanceReopenRequest = {
          startElementId: MAESTRO_TEST_CONSTANTS.CASE_STAGE_ID
        };

        await expect(invalidInstance.reopen(request)).rejects.toThrow('Case instance folder key is undefined');
      });
    });

    describe('caseInstance.getExecutionHistory()', () => {
      it('should call caseInstance.getExecutionHistory with bound instanceId and folderKey', async () => {
        const mockInstanceData = createMockCaseInstance();
        const instance = createCaseInstanceWithMethods(mockInstanceData, mockService);
        
        const mockHistory = createMockCaseInstanceExecutionHistory();
        mockService.getExecutionHistory = vi.fn().mockResolvedValue(mockHistory);
        
        const result = await instance.getExecutionHistory();

        expect(mockService.getExecutionHistory).toHaveBeenCalledWith(
          MAESTRO_TEST_CONSTANTS.CASE_INSTANCE_ID,
          MAESTRO_TEST_CONSTANTS.FOLDER_KEY
        );
        expect(result).toEqual(mockHistory);
      });

      it('should throw error if instanceId is undefined', async () => {
        const mockInstanceData = createMockCaseInstance();
        const invalidInstanceData = { ...mockInstanceData, instanceId: undefined as any };
        const invalidInstance = createCaseInstanceWithMethods(invalidInstanceData, mockService);
        
        await expect(invalidInstance.getExecutionHistory()).rejects.toThrow('Case instance ID is undefined');
      });

      it('should throw error if folderKey is undefined', async () => {
        const mockInstanceData = createMockCaseInstance();
        const invalidInstanceData = { ...mockInstanceData, folderKey: undefined as any };
        const invalidInstance = createCaseInstanceWithMethods(invalidInstanceData, mockService);

        await expect(invalidInstance.getExecutionHistory()).rejects.toThrow('Case instance folder key is undefined');
      });
    });

    describe('caseInstance.getStages()', () => {
      it('should call caseInstance.getStages with bound instanceId and folderKey', async () => {
        const mockInstanceData = createMockCaseInstance();
        const instance = createCaseInstanceWithMethods(mockInstanceData, mockService);
        
        const mockStages = [createMockCaseStage()];
        mockService.getStages = vi.fn().mockResolvedValue(mockStages);
        
        const result = await instance.getStages();

        expect(mockService.getStages).toHaveBeenCalledWith(
          MAESTRO_TEST_CONSTANTS.CASE_INSTANCE_ID,
          MAESTRO_TEST_CONSTANTS.FOLDER_KEY
        );
        expect(result).toEqual(mockStages);
      });

      it('should throw error if instanceId is undefined', async () => {
        const mockInstanceData = createMockCaseInstance();
        const invalidInstanceData = { ...mockInstanceData, instanceId: undefined as any };
        const invalidInstance = createCaseInstanceWithMethods(invalidInstanceData, mockService);

        await expect(invalidInstance.getStages()).rejects.toThrow('Case instance ID is undefined');
      });

      it('should throw error if folderKey is undefined', async () => {
        const mockInstanceData = createMockCaseInstance();
        const invalidInstanceData = { ...mockInstanceData, folderKey: undefined as any };
        const invalidInstance = createCaseInstanceWithMethods(invalidInstanceData, mockService);

        await expect(invalidInstance.getStages()).rejects.toThrow('Case instance folder key is undefined');
      });
    });

    describe('caseInstance.getActionTasks()', () => {
      it('should call caseInstance.getActionTasks with bound instanceId', async () => {
        const mockInstanceData = createMockCaseInstance();
        const instance = createCaseInstanceWithMethods(mockInstanceData, mockService);
        
        const mockTasks = {
          items: [],
          totalCount: 0
        };
        mockService.getActionTasks = vi.fn().mockResolvedValue(mockTasks);
        
        const result = await instance.getActionTasks();

        expect(mockService.getActionTasks).toHaveBeenCalledWith(
          MAESTRO_TEST_CONSTANTS.CASE_INSTANCE_ID,
          undefined
        );
        expect(result).toEqual(mockTasks);
      });

      it('should call caseInstance.getActionTasks with bound parameters and options', async () => {
        const mockInstanceData = createMockCaseInstance();
        const instance = createCaseInstanceWithMethods(mockInstanceData, mockService);
        
        const mockTasks = {
          items: [],
          totalCount: 0
        };
        const options = { pageSize: 10 };
        mockService.getActionTasks = vi.fn().mockResolvedValue(mockTasks);
        
        const result = await instance.getActionTasks(options);

        expect(mockService.getActionTasks).toHaveBeenCalledWith(
          MAESTRO_TEST_CONSTANTS.CASE_INSTANCE_ID,
          options
        );
        expect(result).toEqual(mockTasks);
      });

      it('should throw error if instanceId is undefined', async () => {
        const mockInstanceData = createMockCaseInstance();
        const invalidInstanceData = { ...mockInstanceData, instanceId: undefined as any };
        const invalidInstance = createCaseInstanceWithMethods(invalidInstanceData, mockService);
        
        await expect(invalidInstance.getActionTasks()).rejects.toThrow('Case instance ID is undefined');
      });
    });
  });

  describe('createCaseInstanceWithMethods', () => {
    it('should create instance with all bound methods', () => {
      const mockInstanceData = createMockCaseInstance();

      const instance = createCaseInstanceWithMethods(mockInstanceData, mockService);

      expect(instance).toHaveProperty('instanceId', MAESTRO_TEST_CONSTANTS.CASE_INSTANCE_ID);
      expect(instance).toHaveProperty('folderKey', MAESTRO_TEST_CONSTANTS.FOLDER_KEY);
      expect(typeof instance.close).toBe('function');
      expect(typeof instance.pause).toBe('function');
      expect(typeof instance.resume).toBe('function');
      expect(typeof instance.reopen).toBe('function');
      expect(typeof instance.getExecutionHistory).toBe('function');
      expect(typeof instance.getStages).toBe('function');
      expect(typeof instance.getActionTasks).toBe('function');
    });

    it('should preserve all original instance data', () => {
      const mockInstanceData = createMockCaseInstance();
      
      const instance = createCaseInstanceWithMethods(mockInstanceData, mockService);

      expect(instance.instanceId).toBe(mockInstanceData.instanceId);
      expect(instance.packageId).toBe(mockInstanceData.packageId);
      expect(instance.caseType).toBe(mockInstanceData.caseType);
      expect(instance.caseTitle).toBe(mockInstanceData.caseTitle);
    });

  });
});