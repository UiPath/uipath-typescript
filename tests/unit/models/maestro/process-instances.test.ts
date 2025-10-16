import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  createProcessInstanceWithMethods,
  ProcessInstancesServiceModel
} from '../../../../src/models/maestro/process-instances.models';
import { 
  MAESTRO_TEST_CONSTANTS,
  TEST_CONSTANTS,
  createMockOperationResponse,
  createMockProcessInstance,
  createMockExecutionHistory,
  createMockProcessVariables,
  createMockBpmnWithVariables
} from '../../../utils/mocks';
import type { 
  ProcessInstanceOperationOptions,
  ProcessInstanceGetVariablesOptions,
} from '../../../../src/models/maestro/process-instances.types';

// ===== TEST SUITE =====
describe('Process Instance Models', () => {
  let mockService: ProcessInstancesServiceModel;

  beforeEach(() => {
    // Create a mock service
    mockService = {
      getAll: vi.fn(),
      getById: vi.fn(),
      getExecutionHistory: vi.fn(),
      getBpmn: vi.fn(),
      cancel: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      getVariables: vi.fn()
    } as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('bound methods on process instance', () => {
    describe('processInstance.cancel()', () => {
      it('should call processInstance.cancel with bound instanceId and folderKey', async () => {
        const mockInstanceData = createMockProcessInstance();
        const instance = createProcessInstanceWithMethods(mockInstanceData, mockService);
        
        const mockResponse = createMockOperationResponse({
          instanceId: MAESTRO_TEST_CONSTANTS.INSTANCE_ID,
          status: TEST_CONSTANTS.CANCELLED
        });
        mockService.cancel = vi.fn().mockResolvedValue(mockResponse);

        
        await instance.cancel();

        
        expect(mockService.cancel).toHaveBeenCalledWith(
          MAESTRO_TEST_CONSTANTS.INSTANCE_ID,
          MAESTRO_TEST_CONSTANTS.FOLDER_KEY,
          undefined
        );
      });

      it('should call processInstance.cancel with bound parameters and options', async () => {
        const mockInstanceData = createMockProcessInstance();
        const instance = createProcessInstanceWithMethods(mockInstanceData, mockService);
        
        const mockResponse = createMockOperationResponse({
          instanceId: MAESTRO_TEST_CONSTANTS.INSTANCE_ID,
          status: TEST_CONSTANTS.CANCELLED
        });
        const options: ProcessInstanceOperationOptions = { comment: 'Test cancellation' };
        mockService.cancel = vi.fn().mockResolvedValue(mockResponse);

        
        await instance.cancel(options);

        
        expect(mockService.cancel).toHaveBeenCalledWith(
          MAESTRO_TEST_CONSTANTS.INSTANCE_ID,
          MAESTRO_TEST_CONSTANTS.FOLDER_KEY,
          options
        );
      });

      it('should throw error if instanceId is undefined', async () => {
        const mockInstanceData = createMockProcessInstance();
        const invalidInstanceData = { ...mockInstanceData, instanceId: undefined as any };
        const invalidInstance = createProcessInstanceWithMethods(invalidInstanceData, mockService);

        
        await expect(invalidInstance.cancel()).rejects.toThrow('Process instance ID is undefined');
      });

      it('should throw error if folderKey is undefined', async () => {
        const mockInstanceData = createMockProcessInstance();
        const invalidInstanceData = { ...mockInstanceData, folderKey: undefined as any };
        const invalidInstance = createProcessInstanceWithMethods(invalidInstanceData, mockService);

        
        await expect(invalidInstance.cancel()).rejects.toThrow('Process instance folder key is undefined');
      });
    });

    describe('processInstance.pause()', () => {
      it('should call processInstance.pause with bound instanceId and folderKey', async () => {
        const mockInstanceData = createMockProcessInstance();
        const instance = createProcessInstanceWithMethods(mockInstanceData, mockService);
        
        const mockResponse = createMockOperationResponse({
          instanceId: MAESTRO_TEST_CONSTANTS.INSTANCE_ID,
          status: TEST_CONSTANTS.CANCELLED
        });
        mockService.pause = vi.fn().mockResolvedValue(mockResponse);

        
        await instance.pause();

        
        expect(mockService.pause).toHaveBeenCalledWith(
          MAESTRO_TEST_CONSTANTS.INSTANCE_ID,
          MAESTRO_TEST_CONSTANTS.FOLDER_KEY,
          undefined
        );
      });

      it('should call processInstance.pause with bound parameters and options', async () => {
        const mockInstanceData = createMockProcessInstance();
        const instance = createProcessInstanceWithMethods(mockInstanceData, mockService);
        
        const mockResponse = createMockOperationResponse({
          instanceId: MAESTRO_TEST_CONSTANTS.INSTANCE_ID,
          status: TEST_CONSTANTS.CANCELLED
        });
        const options: ProcessInstanceOperationOptions = { comment: 'Test pause' };
        mockService.pause = vi.fn().mockResolvedValue(mockResponse);

        
        await instance.pause(options);

        
        expect(mockService.pause).toHaveBeenCalledWith(
          MAESTRO_TEST_CONSTANTS.INSTANCE_ID,
          MAESTRO_TEST_CONSTANTS.FOLDER_KEY,
          options
        );
      });

      it('should throw error if instanceId is undefined', async () => {
        const mockInstanceData = createMockProcessInstance();
        const invalidInstanceData = { ...mockInstanceData, instanceId: undefined as any };
        const invalidInstance = createProcessInstanceWithMethods(invalidInstanceData, mockService);

        
        await expect(invalidInstance.pause()).rejects.toThrow('Process instance ID is undefined');
      });

      it('should throw error if folderKey is undefined', async () => {
        const mockInstanceData = createMockProcessInstance();
        const invalidInstanceData = { ...mockInstanceData, folderKey: undefined as any };
        const invalidInstance = createProcessInstanceWithMethods(invalidInstanceData, mockService);

        
        await expect(invalidInstance.pause()).rejects.toThrow('Process instance folder key is undefined');
      });
    });

    describe('processInstance.resume()', () => {
      it('should call processInstance.resume with bound instanceId and folderKey', async () => {
        const mockInstanceData = createMockProcessInstance();
        const instance = createProcessInstanceWithMethods(mockInstanceData, mockService);
        
        const mockResponse = createMockOperationResponse({
          instanceId: MAESTRO_TEST_CONSTANTS.INSTANCE_ID,
          status: TEST_CONSTANTS.CANCELLED
        });
        mockService.resume = vi.fn().mockResolvedValue(mockResponse);

        
        await instance.resume();

        
        expect(mockService.resume).toHaveBeenCalledWith(
          MAESTRO_TEST_CONSTANTS.INSTANCE_ID,
          MAESTRO_TEST_CONSTANTS.FOLDER_KEY,
          undefined
        );
      });

      it('should call service.resume with bound parameters and options', async () => {
        const mockInstanceData = createMockProcessInstance();
        const instance = createProcessInstanceWithMethods(mockInstanceData, mockService);
        
        const mockResponse = createMockOperationResponse({
          instanceId: MAESTRO_TEST_CONSTANTS.INSTANCE_ID,
          status: TEST_CONSTANTS.CANCELLED
        });
        const options: ProcessInstanceOperationOptions = { comment: 'Test resume' };
        mockService.resume = vi.fn().mockResolvedValue(mockResponse);

        
        await instance.resume(options);

        
        expect(mockService.resume).toHaveBeenCalledWith(
          MAESTRO_TEST_CONSTANTS.INSTANCE_ID,
          MAESTRO_TEST_CONSTANTS.FOLDER_KEY,
          options
        );
      });

      it('should throw error if instanceId is undefined', async () => {
        const mockInstanceData = createMockProcessInstance();
        const invalidInstanceData = { ...mockInstanceData, instanceId: undefined as any };
        const invalidInstance = createProcessInstanceWithMethods(invalidInstanceData, mockService);

        
        await expect(invalidInstance.resume()).rejects.toThrow('Process instance ID is undefined');
      });

      it('should throw error if folderKey is undefined', async () => {
        const mockInstanceData = createMockProcessInstance();
        const invalidInstanceData = { ...mockInstanceData, folderKey: undefined as any };
        const invalidInstance = createProcessInstanceWithMethods(invalidInstanceData, mockService);

        
        await expect(invalidInstance.resume()).rejects.toThrow('Process instance folder key is undefined');
      });
    });

    describe('processInstance.getExecutionHistory()', () => {
      it('should call processInstance.getExecutionHistory with bound instanceId', async () => {
        const mockInstanceData = createMockProcessInstance();
        const instance = createProcessInstanceWithMethods(mockInstanceData, mockService);
        
        const mockHistory = [createMockExecutionHistory()];
        mockService.getExecutionHistory = vi.fn().mockResolvedValue(mockHistory);

        
        const result = await instance.getExecutionHistory();

        
        expect(mockService.getExecutionHistory).toHaveBeenCalledWith(
          MAESTRO_TEST_CONSTANTS.INSTANCE_ID
        );
        expect(result).toEqual(mockHistory);
      });

      it('should throw error if instanceId is undefined', async () => {
        const mockInstanceData = createMockProcessInstance();
        const invalidInstanceData = { ...mockInstanceData, instanceId: undefined as any };
        const invalidInstance = createProcessInstanceWithMethods(invalidInstanceData, mockService);

        
        await expect(invalidInstance.getExecutionHistory()).rejects.toThrow('Process instance ID is undefined');
      });
    });

    describe('processInstance.getBpmn()', () => {
      it('should call processInstance.getBpmn with bound instanceId and folderKey', async () => {
        const mockInstanceData = createMockProcessInstance();
        const instance = createProcessInstanceWithMethods(mockInstanceData, mockService);
        
        const mockBpmn = createMockBpmnWithVariables({ processId: 'SimpleProcess' });
        mockService.getBpmn = vi.fn().mockResolvedValue(mockBpmn);

        
        const result = await instance.getBpmn();

        
        expect(mockService.getBpmn).toHaveBeenCalledWith(
          MAESTRO_TEST_CONSTANTS.INSTANCE_ID,
          MAESTRO_TEST_CONSTANTS.FOLDER_KEY
        );
        expect(result).toBe(mockBpmn);
      });

      it('should throw error if instanceId is undefined', async () => {
        const mockInstanceData = createMockProcessInstance();
        const invalidInstanceData = { ...mockInstanceData, instanceId: undefined as any };
        const invalidInstance = createProcessInstanceWithMethods(invalidInstanceData, mockService);

        
        await expect(invalidInstance.getBpmn()).rejects.toThrow('Process instance ID is undefined');
      });

      it('should throw error if folderKey is undefined', async () => {
        const mockInstanceData = createMockProcessInstance();
        const invalidInstanceData = { ...mockInstanceData, folderKey: undefined as any };
        const invalidInstance = createProcessInstanceWithMethods(invalidInstanceData, mockService);

        
        await expect(invalidInstance.getBpmn()).rejects.toThrow('Process instance folder key is undefined');
      });
    });

    describe('processInstance.getVariables()', () => {
      it('should call processInstance.getVariables with bound instanceId and folderKey', async () => {
        const mockInstanceData = createMockProcessInstance();
        const instance = createProcessInstanceWithMethods(mockInstanceData, mockService);
        
        const mockVariables = createMockProcessVariables();
        mockService.getVariables = vi.fn().mockResolvedValue(mockVariables);

        
        const result = await instance.getVariables();

        
        expect(mockService.getVariables).toHaveBeenCalledWith(
          MAESTRO_TEST_CONSTANTS.INSTANCE_ID,
          MAESTRO_TEST_CONSTANTS.FOLDER_KEY,
          undefined
        );
        expect(result).toEqual(mockVariables);
      });

      it('should call service.getVariables with bound parameters and options', async () => {
        const mockInstanceData = createMockProcessInstance();
        const instance = createProcessInstanceWithMethods(mockInstanceData, mockService);
        
        const mockVariables = {
          elements: [],
          globalVariables: [],
          instanceId: MAESTRO_TEST_CONSTANTS.INSTANCE_ID,
          parentElementId: MAESTRO_TEST_CONSTANTS.PARENT_ELEMENT_ID
        };
        const options: ProcessInstanceGetVariablesOptions = { parentElementId: MAESTRO_TEST_CONSTANTS.PARENT_ELEMENT_ID };
        mockService.getVariables = vi.fn().mockResolvedValue(mockVariables);

        
        const result = await instance.getVariables(options);

        
        expect(mockService.getVariables).toHaveBeenCalledWith(
          MAESTRO_TEST_CONSTANTS.INSTANCE_ID,
          MAESTRO_TEST_CONSTANTS.FOLDER_KEY,
          options
        );
        expect(result).toEqual(mockVariables);
      });

      it('should throw error if instanceId is undefined', async () => {
        const mockInstanceData = createMockProcessInstance();
        const invalidInstanceData = { ...mockInstanceData, instanceId: undefined as any };
        const invalidInstance = createProcessInstanceWithMethods(invalidInstanceData, mockService);

        
        await expect(invalidInstance.getVariables()).rejects.toThrow('Process instance ID is undefined');
      });

      it('should throw error if folderKey is undefined', async () => {
        const mockInstanceData = createMockProcessInstance();
        const invalidInstanceData = { ...mockInstanceData, folderKey: undefined as any };
        const invalidInstance = createProcessInstanceWithMethods(invalidInstanceData, mockService);

        
        await expect(invalidInstance.getVariables()).rejects.toThrow('Process instance folder key is undefined');
      });
    });
  });

  describe('createProcessInstanceWithMethods', () => {
    it('should create instance with all bound methods', () => {
      const mockInstanceData = createMockProcessInstance();
      
      const instance = createProcessInstanceWithMethods(mockInstanceData, mockService);

      
      expect(instance).toHaveProperty('instanceId', MAESTRO_TEST_CONSTANTS.INSTANCE_ID);
      expect(instance).toHaveProperty('folderKey', MAESTRO_TEST_CONSTANTS.FOLDER_KEY);
      expect(instance).toHaveProperty('cancel');
      expect(instance).toHaveProperty('pause');
      expect(instance).toHaveProperty('resume');
      expect(instance).toHaveProperty('getExecutionHistory');
      expect(instance).toHaveProperty('getBpmn');
      expect(instance).toHaveProperty('getVariables');
    });

    it('should preserve all original instance data', () => {
      const mockInstanceData = createMockProcessInstance();
      
      const instance = createProcessInstanceWithMethods(mockInstanceData, mockService);

      
      expect(instance.instanceId).toBe(mockInstanceData.instanceId);
      expect(instance.packageId).toBe(mockInstanceData.packageId);
      expect(instance.processKey).toBe(mockInstanceData.processKey);
      expect(instance.folderKey).toBe(mockInstanceData.folderKey);
      expect(instance.latestRunStatus).toBe(mockInstanceData.latestRunStatus);
    });

  });
});