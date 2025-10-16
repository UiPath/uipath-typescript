// ===== IMPORTS =====
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTaskWithMethods } from '../../../../src/models/action-center/tasks.models';
import type { TaskServiceModel } from '../../../../src/models/action-center/tasks.models';
import { TaskType, TaskPriority} from '../../../../src/models/action-center/tasks.types';
import { createBasicTask } from '../../../utils/mocks/tasks';
import { createMockOperationResponse } from '../../../utils/mocks/core';
import { TASK_TEST_CONSTANTS } from '../../../utils/constants/tasks';
import { TEST_CONSTANTS } from '../../../utils/constants/common';

// ===== TEST SUITE =====
describe('Task Models', () => {
  let mockService: TaskServiceModel;

  beforeEach(() => {
    // Create a mock service
    mockService = {
      assign: vi.fn(),
      reassign: vi.fn(),
      unassign: vi.fn(),
      complete: vi.fn(),
      create: vi.fn(),
      getAll: vi.fn(),
      getById: vi.fn(),
      getUsers: vi.fn(),
    } as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('bound methods on task', () => {
    describe('task.assign()', () => {
      it('should call task.assign with userId', async () => {
        const taskData = createBasicTask();
        const task = createTaskWithMethods(taskData, mockService);

        const mockResponse = createMockOperationResponse([
          { taskId: TASK_TEST_CONSTANTS.TASK_ID, userId: TASK_TEST_CONSTANTS.USER_ID }
        ]);
        mockService.assign = vi.fn().mockResolvedValue(mockResponse);

        
        const result = await task.assign({ userId: TASK_TEST_CONSTANTS.USER_ID });

        
        expect(mockService.assign).toHaveBeenCalledWith({
          taskId: TASK_TEST_CONSTANTS.TASK_ID,
          userId: TASK_TEST_CONSTANTS.USER_ID
        });
        expect(result).toEqual(mockResponse);
      });

      it('should call task.assign with userNameOrEmail', async () => {
        const taskData = createBasicTask();
        const task = createTaskWithMethods(taskData, mockService);

        const mockResponse = createMockOperationResponse([
          { taskId: TASK_TEST_CONSTANTS.TASK_ID, userNameOrEmail: TASK_TEST_CONSTANTS.USER_EMAIL }
        ]);
        mockService.assign = vi.fn().mockResolvedValue(mockResponse);

        
        const result = await task.assign({ userNameOrEmail: TASK_TEST_CONSTANTS.USER_EMAIL });

        
        expect(mockService.assign).toHaveBeenCalledWith({
          taskId: TASK_TEST_CONSTANTS.TASK_ID,
          userNameOrEmail: TASK_TEST_CONSTANTS.USER_EMAIL
        });
        expect(result).toEqual(mockResponse);
      });

      it('should throw error if taskId is undefined', async () => {
        const taskData = createBasicTask({ id: undefined });
        const task = createTaskWithMethods(taskData, mockService);

        
        await expect(task.assign({ userId: TASK_TEST_CONSTANTS.USER_ID })).rejects.toThrow('Task ID is undefined');
      });
    });

    describe('task.reassign()', () => {
      it('should call task.reassign with userId', async () => {
        const taskData = createBasicTask();
        const task = createTaskWithMethods(taskData, mockService);

        const mockResponse = createMockOperationResponse([
          { taskId: TASK_TEST_CONSTANTS.TASK_ID, userId: TASK_TEST_CONSTANTS.USER_ID }
        ]);
        mockService.reassign = vi.fn().mockResolvedValue(mockResponse);

        
        const result = await task.reassign({ userId: TASK_TEST_CONSTANTS.USER_ID });

        
        expect(mockService.reassign).toHaveBeenCalledWith({
          taskId: TASK_TEST_CONSTANTS.TASK_ID,
          userId: TASK_TEST_CONSTANTS.USER_ID
        });
        expect(result).toEqual(mockResponse);
      });

      it('should call task.reassign with userNameOrEmail', async () => {
        const taskData = createBasicTask();
        const task = createTaskWithMethods(taskData, mockService);

        const mockResponse = createMockOperationResponse([
          { taskId: TASK_TEST_CONSTANTS.TASK_ID, userNameOrEmail: TASK_TEST_CONSTANTS.USER_EMAIL }
        ]);
        mockService.reassign = vi.fn().mockResolvedValue(mockResponse);

        
        const result = await task.reassign({ userNameOrEmail: TASK_TEST_CONSTANTS.USER_EMAIL });

        
        expect(mockService.reassign).toHaveBeenCalledWith({
          taskId: TASK_TEST_CONSTANTS.TASK_ID,
          userNameOrEmail: TASK_TEST_CONSTANTS.USER_EMAIL
        });
        expect(result).toEqual(mockResponse);
      });

      it('should throw error if taskId is undefined', async () => {
        const taskData = createBasicTask({ id: undefined });
        const task = createTaskWithMethods(taskData, mockService);

        
        await expect(task.reassign({ userId: TASK_TEST_CONSTANTS.USER_ID })).rejects.toThrow('Task ID is undefined');
      });
    });

    describe('task.unassign()', () => {
      it('should call task.unassign', async () => {
        const taskData = createBasicTask();
        const task = createTaskWithMethods(taskData, mockService);

        const mockResponse = createMockOperationResponse([
          { taskId: TASK_TEST_CONSTANTS.TASK_ID }
        ]);
        mockService.unassign = vi.fn().mockResolvedValue(mockResponse);

        
        const result = await task.unassign();

        
        expect(mockService.unassign).toHaveBeenCalledWith(TASK_TEST_CONSTANTS.TASK_ID);
        expect(result).toEqual(mockResponse);
      });

      it('should throw error if taskId is undefined', async () => {
        const taskData = createBasicTask({ id: undefined });
        const task = createTaskWithMethods(taskData, mockService);

        
        await expect(task.unassign()).rejects.toThrow('Task ID is undefined');
      });
    });

    describe('task.complete()', () => {
      it('should call task.complete for external task', async () => {
        const taskData = createBasicTask({ folderId: TEST_CONSTANTS.FOLDER_ID, type: TaskType.External });
        const task = createTaskWithMethods(taskData, mockService);

        const mockResponse = createMockOperationResponse({
          type: TaskType.External,
          taskId: TASK_TEST_CONSTANTS.TASK_ID
        });
        mockService.complete = vi.fn().mockResolvedValue(mockResponse);

        
        const result = await task.complete({
          type: TaskType.External
        });

        
        expect(mockService.complete).toHaveBeenCalledWith(
          {
            type: TaskType.External,
            taskId: TASK_TEST_CONSTANTS.TASK_ID,
            data: undefined,
            action: undefined
          },
          TEST_CONSTANTS.FOLDER_ID
        );
        expect(result).toEqual(mockResponse);
      });

      it('should call task.complete for app task', async () => {
        const taskData = createBasicTask({ folderId: TEST_CONSTANTS.FOLDER_ID, type: TaskType.App });
        const task = createTaskWithMethods(taskData, mockService);

        const mockResponse = createMockOperationResponse({
          type: TaskType.App,
          taskId: TASK_TEST_CONSTANTS.TASK_ID,
          data: {},
          action: TASK_TEST_CONSTANTS.ACTION_APPROVE
        });
        mockService.complete = vi.fn().mockResolvedValue(mockResponse);

        
        const result = await task.complete({
          type: TaskType.App,
          data: TASK_TEST_CONSTANTS.APP_TASK_DATA,
          action: TASK_TEST_CONSTANTS.ACTION_APPROVE
        });

        
        expect(mockService.complete).toHaveBeenCalledWith(
          {
            type: TaskType.App,
            taskId: TASK_TEST_CONSTANTS.TASK_ID,
            data: TASK_TEST_CONSTANTS.APP_TASK_DATA,
            action: TASK_TEST_CONSTANTS.ACTION_APPROVE
          },
          TEST_CONSTANTS.FOLDER_ID
        );
        expect(result).toEqual(mockResponse);
      });

      it('should call task.complete for form task', async () => {
        const taskData = createBasicTask({ folderId: TEST_CONSTANTS.FOLDER_ID, type: TaskType.Form });
        const task = createTaskWithMethods(taskData, mockService);

        const mockResponse = createMockOperationResponse({
          type: TaskType.Form,
          taskId: TASK_TEST_CONSTANTS.TASK_ID,
          data: TASK_TEST_CONSTANTS.FORM_DATA,
          action: TASK_TEST_CONSTANTS.ACTION_SUBMIT
        });
        mockService.complete = vi.fn().mockResolvedValue(mockResponse);

        
        const result = await task.complete({
          type: TaskType.Form,
          data: TASK_TEST_CONSTANTS.FORM_DATA,
          action: TASK_TEST_CONSTANTS.ACTION_SUBMIT
        });

        
        expect(mockService.complete).toHaveBeenCalledWith(
          {
            type: TaskType.Form,
            taskId: TASK_TEST_CONSTANTS.TASK_ID,
            data: TASK_TEST_CONSTANTS.FORM_DATA,
            action: TASK_TEST_CONSTANTS.ACTION_SUBMIT
          },
          TEST_CONSTANTS.FOLDER_ID
        );
        expect(result).toEqual(mockResponse);
      });

      it('should throw error if taskId is undefined', async () => {
        const taskData = createBasicTask({ id: undefined });
        const task = createTaskWithMethods(taskData, mockService);

        
        await expect(task.complete({
          type: TaskType.External,
          data: {},
          action: TASK_TEST_CONSTANTS.ACTION_SUBMIT
        })).rejects.toThrow('Task ID is undefined');
      });

      it('should throw error if folderId is undefined', async () => {
        const taskData = createBasicTask({ folderId: undefined });
        const task = createTaskWithMethods(taskData, mockService);

        
        await expect(task.complete({
          type: TaskType.External,
          data: {},
          action: TASK_TEST_CONSTANTS.ACTION_SUBMIT
        })).rejects.toThrow('Folder ID is required');
      });
    });
  });

  describe('Task data and methods are combined correctly', () => {
    it('should preserve all task properties', () => {
      const taskData = createBasicTask();
      const task = createTaskWithMethods(taskData, mockService);

      expect(task.id).toBe(TASK_TEST_CONSTANTS.TASK_ID);
      expect(task.title).toBe(TASK_TEST_CONSTANTS.TASK_TITLE);
      expect(task.type).toBe(TaskType.External);
      expect(task.priority).toBe(TaskPriority.Medium);
      expect(task.folderId).toBe(TEST_CONSTANTS.FOLDER_ID);
      expect(task.key).toBe(TASK_TEST_CONSTANTS.TASK_KEY);
    });

    it('should have all methods available', () => {
      const taskData = createBasicTask();
      const task = createTaskWithMethods(taskData, mockService);

      expect(typeof task.assign).toBe('function');
      expect(typeof task.reassign).toBe('function');
      expect(typeof task.unassign).toBe('function');
      expect(typeof task.complete).toBe('function');
    });
  });
});

