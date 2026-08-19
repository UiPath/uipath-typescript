// ===== IMPORTS =====
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTaskWithMethods } from '../../../../src/models/action-center/tasks.models';
import type { TaskServiceModel } from '../../../../src/models/action-center/tasks.models';
import { TaskType, TaskPriority, TaskAssignmentCriteria } from '../../../../src/models/action-center/tasks.types';
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
      saveData: vi.fn(),
      saveTags: vi.fn(),
      editMetadata: vi.fn(),
      getComments: vi.fn(),
      createComment: vi.fn(),
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
        // No criteria supplied — the key must be omitted, not forwarded as undefined.
        expect(vi.mocked(mockService.assign).mock.calls[0][0]).not.toHaveProperty('assignmentCriteria');
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

      it('should forward assignmentCriteria for group assignment', async () => {
        const taskData = createBasicTask();
        const task = createTaskWithMethods(taskData, mockService);

        const mockResponse = createMockOperationResponse([
          { taskId: TASK_TEST_CONSTANTS.TASK_ID, userId: TASK_TEST_CONSTANTS.USER_ID }
        ]);
        mockService.assign = vi.fn().mockResolvedValue(mockResponse);

        const result = await task.assign({
          userId: TASK_TEST_CONSTANTS.USER_ID,
          assignmentCriteria: TaskAssignmentCriteria.AllUsers
        });

        expect(mockService.assign).toHaveBeenCalledWith({
          taskId: TASK_TEST_CONSTANTS.TASK_ID,
          userId: TASK_TEST_CONSTANTS.USER_ID,
          assignmentCriteria: TaskAssignmentCriteria.AllUsers
        });
        expect(result).toEqual(mockResponse);
      });

      it('should forward assignmentCriteria when assigning by email to a group', async () => {
        const taskData = createBasicTask();
        const task = createTaskWithMethods(taskData, mockService);

        const mockResponse = createMockOperationResponse([
          { taskId: TASK_TEST_CONSTANTS.TASK_ID, userNameOrEmail: TASK_TEST_CONSTANTS.USER_EMAIL }
        ]);
        mockService.assign = vi.fn().mockResolvedValue(mockResponse);

        const result = await task.assign({
          userNameOrEmail: TASK_TEST_CONSTANTS.USER_EMAIL,
          assignmentCriteria: TaskAssignmentCriteria.AllUsers
        });

        expect(mockService.assign).toHaveBeenCalledWith({
          taskId: TASK_TEST_CONSTANTS.TASK_ID,
          userNameOrEmail: TASK_TEST_CONSTANTS.USER_EMAIL,
          assignmentCriteria: TaskAssignmentCriteria.AllUsers
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

      it('should forward assignmentCriteria for group reassignment', async () => {
        const taskData = createBasicTask();
        const task = createTaskWithMethods(taskData, mockService);

        const mockResponse = createMockOperationResponse([
          { taskId: TASK_TEST_CONSTANTS.TASK_ID, userId: TASK_TEST_CONSTANTS.USER_ID }
        ]);
        mockService.reassign = vi.fn().mockResolvedValue(mockResponse);

        const result = await task.reassign({
          userId: TASK_TEST_CONSTANTS.USER_ID,
          assignmentCriteria: TaskAssignmentCriteria.AllUsers
        });

        expect(mockService.reassign).toHaveBeenCalledWith({
          taskId: TASK_TEST_CONSTANTS.TASK_ID,
          userId: TASK_TEST_CONSTANTS.USER_ID,
          assignmentCriteria: TaskAssignmentCriteria.AllUsers
        });
        expect(result).toEqual(mockResponse);
      });

      it('should forward assignmentCriteria when reassigning by email to a group', async () => {
        const taskData = createBasicTask();
        const task = createTaskWithMethods(taskData, mockService);

        const mockResponse = createMockOperationResponse([
          { taskId: TASK_TEST_CONSTANTS.TASK_ID, userNameOrEmail: TASK_TEST_CONSTANTS.USER_EMAIL }
        ]);
        mockService.reassign = vi.fn().mockResolvedValue(mockResponse);

        const result = await task.reassign({
          userNameOrEmail: TASK_TEST_CONSTANTS.USER_EMAIL,
          assignmentCriteria: TaskAssignmentCriteria.AllUsers
        });

        expect(mockService.reassign).toHaveBeenCalledWith({
          taskId: TASK_TEST_CONSTANTS.TASK_ID,
          userNameOrEmail: TASK_TEST_CONSTANTS.USER_EMAIL,
          assignmentCriteria: TaskAssignmentCriteria.AllUsers
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

    describe('task.saveData()', () => {
      it('should call service.saveData with the task id and default folder', async () => {
        const task = createTaskWithMethods(createBasicTask({ folderId: TEST_CONSTANTS.FOLDER_ID }), mockService);
        mockService.saveData = vi.fn().mockResolvedValue(undefined);

        await task.saveData({ amount: 1200 });

        expect(mockService.saveData).toHaveBeenCalledWith(
          TASK_TEST_CONSTANTS.TASK_ID,
          { amount: 1200 },
          { folderId: TEST_CONSTANTS.FOLDER_ID, type: TaskType.External },
        );
      });

      it('should inject the task\'s own type so it routes to the right endpoint', async () => {
        const task = createTaskWithMethods(
          createBasicTask({ folderId: TEST_CONSTANTS.FOLDER_ID, type: TaskType.App }),
          mockService,
        );
        mockService.saveData = vi.fn().mockResolvedValue(undefined);

        await task.saveData({ amount: 1 });

        expect(mockService.saveData).toHaveBeenCalledWith(
          TASK_TEST_CONSTANTS.TASK_ID,
          { amount: 1 },
          expect.objectContaining({ type: TaskType.App }),
        );
      });

      it('should throw error if taskId is undefined', async () => {
        const task = createTaskWithMethods(createBasicTask({ id: undefined }), mockService);
        await expect(task.saveData({})).rejects.toThrow('Task ID is undefined');
      });
    });

    describe('task.saveTags()', () => {
      it('should call service.saveTags with the task id and default folder', async () => {
        const task = createTaskWithMethods(createBasicTask({ folderId: TEST_CONSTANTS.FOLDER_ID }), mockService);
        mockService.saveTags = vi.fn().mockResolvedValue(undefined);
        const tags = [{ name: 'urgent', displayName: 'Urgent', displayValue: 'yes' }];

        await task.saveTags(tags);

        expect(mockService.saveTags).toHaveBeenCalledWith(
          TASK_TEST_CONSTANTS.TASK_ID,
          tags,
          { folderId: TEST_CONSTANTS.FOLDER_ID },
        );
      });

      it('should throw error if taskId is undefined', async () => {
        const task = createTaskWithMethods(createBasicTask({ id: undefined }), mockService);
        await expect(task.saveTags([])).rejects.toThrow('Task ID is undefined');
      });
    });

    describe('task.editMetadata()', () => {
      it('should call service.editMetadata with the task id and default folder', async () => {
        const task = createTaskWithMethods(createBasicTask({ folderId: TEST_CONSTANTS.FOLDER_ID }), mockService);
        mockService.editMetadata = vi.fn().mockResolvedValue(undefined);

        await task.editMetadata({ title: 'Renamed' });

        expect(mockService.editMetadata).toHaveBeenCalledWith(
          TASK_TEST_CONSTANTS.TASK_ID,
          { title: 'Renamed', folderId: TEST_CONSTANTS.FOLDER_ID },
        );
      });

      it('should respect an explicit folder override instead of the task folder', async () => {
        const task = createTaskWithMethods(createBasicTask({ folderId: TEST_CONSTANTS.FOLDER_ID }), mockService);
        mockService.editMetadata = vi.fn().mockResolvedValue(undefined);

        await task.editMetadata({ title: 'Renamed', folderKey: 'other-folder' });

        expect(mockService.editMetadata).toHaveBeenCalledWith(
          TASK_TEST_CONSTANTS.TASK_ID,
          { title: 'Renamed', folderKey: 'other-folder' },
        );
      });

      it('should throw error if taskId is undefined', async () => {
        const task = createTaskWithMethods(createBasicTask({ id: undefined }), mockService);
        await expect(task.editMetadata({ title: 'x' })).rejects.toThrow('Task ID is undefined');
      });
    });

    describe('task.getComments()', () => {
      it('should call service.getComments with the task id and default folder', async () => {
        const task = createTaskWithMethods(createBasicTask({ folderId: TEST_CONSTANTS.FOLDER_ID }), mockService);
        const mockResponse = { items: [], totalCount: 0 };
        mockService.getComments = vi.fn().mockResolvedValue(mockResponse);

        const result = await task.getComments();

        expect(mockService.getComments).toHaveBeenCalledWith(
          TASK_TEST_CONSTANTS.TASK_ID,
          { folderId: TEST_CONSTANTS.FOLDER_ID },
        );
        expect(result).toEqual(mockResponse);
      });

      it('should throw error if taskId is undefined', () => {
        const task = createTaskWithMethods(createBasicTask({ id: undefined }), mockService);
        expect(() => task.getComments()).toThrow('Task ID is undefined');
      });
    });

    describe('task.createComment()', () => {
      it('should call service.createComment with the task id, text and default folder', async () => {
        const task = createTaskWithMethods(createBasicTask({ folderId: TEST_CONSTANTS.FOLDER_ID }), mockService);
        const mockComment = { id: 1, text: 'Escalated' };
        mockService.createComment = vi.fn().mockResolvedValue(mockComment);

        const result = await task.createComment('Escalated');

        expect(mockService.createComment).toHaveBeenCalledWith(
          TASK_TEST_CONSTANTS.TASK_ID,
          'Escalated',
          { folderId: TEST_CONSTANTS.FOLDER_ID },
        );
        expect(result).toEqual(mockComment);
      });

      it('should throw error if taskId is undefined', async () => {
        const task = createTaskWithMethods(createBasicTask({ id: undefined }), mockService);
        await expect(task.createComment('x')).rejects.toThrow('Task ID is undefined');
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
      expect(typeof task.saveData).toBe('function');
      expect(typeof task.saveTags).toBe('function');
      expect(typeof task.editMetadata).toBe('function');
      expect(typeof task.getComments).toBe('function');
      expect(typeof task.createComment).toBe('function');
    });
  });
});

