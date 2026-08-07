// ===== IMPORTS =====
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TaskService } from '../../../../src/services/action-center/tasks';
import {
  TaskType,
  TaskPriority,
  TaskStatus,
  TaskAssignmentCriteria,
  TaskAssignmentOptions,
  TaskCompletionOptions,
  TaskCreateOptions,
  TaskGetAllOptions,
  TaskGetUsersOptions
} from '../../../../src/models/action-center/tasks.types';
import { PaginationHelpers } from '../../../../src/utils/pagination/helpers';
import { ApiClient } from '../../../../src/core/http/api-client';
import { createServiceTestDependencies, createMockApiClient } from '../../../utils/setup';
import { 
  createMockTaskResponse, 
  createMockTaskGetResponse, 
  createMockTasks, 
  createMockUsers 
} from '../../../utils/mocks/tasks';
import { createMockError, createMockBaseResponse, createMockCollection } from '../../../utils/mocks/core';
import { DEFAULT_TASK_EXPAND, TaskMap } from '../../../../src/models/action-center/tasks.constants';
import { transformOptions, transformData, pascalToCamelCaseKeys, camelToPascalCaseKeys, addPrefixToKeys, applyDataTransforms } from '../../../../src/utils/transform';
import { TASK_TEST_CONSTANTS } from '../../../utils/constants/tasks';
import { TEST_CONSTANTS } from '../../../utils/constants/common';
import { TASK_ENDPOINTS, TASK_NOTE_ENDPOINTS } from '../../../../src/utils/constants/endpoints';
import { FOLDER_ID, FOLDER_KEY, FOLDER_PATH_ENCODED } from '../../../../src/utils/constants/headers';
import { ValidationError } from '../../../../src/core/errors';

// ===== MOCKING =====
// Mock the dependencies
vi.mock('../../../../src/core/http/api-client');

// Import mock objects using vi.hoisted() - this ensures they're available before vi.mock() calls
const mocks = vi.hoisted(() => {
  // Import/re-export the mock utilities from core
  return import('../../../utils/mocks/core');
});

// Setup all mocks at module level
vi.mock('../../../../src/utils/transform', async () => (await mocks).mockTransformUtils);
vi.mock('../../../../src/utils/pagination/helpers', async () => (await mocks).mockPaginationHelpers);

// ===== TEST SUITE =====
describe('TaskService Unit Tests', () => {
  let taskService: TaskService;
  let mockApiClient: any;

  beforeEach(() => {
    // Create mock instances using centralized setup
    const { instance } = createServiceTestDependencies();
    mockApiClient = createMockApiClient();

    // Mock the ApiClient constructor
    vi.mocked(ApiClient).mockImplementation(function () { return mockApiClient; });

    // Reset pagination helpers mock before each test
    vi.mocked(PaginationHelpers.getAll).mockReset();

    taskService = new TaskService(instance);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create a task successfully with all fields mapped correctly', async () => {
      const taskInput = {
        title: TASK_TEST_CONSTANTS.TASK_TITLE,
        priority: TaskPriority.High
      } as TaskCreateOptions;

      const mockResponse = createMockTaskResponse({
        title: TASK_TEST_CONSTANTS.TASK_TITLE,
        priority: TaskPriority.High
      });

      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await taskService.create(taskInput, TEST_CONSTANTS.FOLDER_ID);

      // Verify the result
      expect(result).toBeDefined();
      expect(result.title).toBe(TASK_TEST_CONSTANTS.TASK_TITLE);
      expect(result.priority).toBe(TaskPriority.High);

      // Verify the API call has correct endpoint, body, and headers
      expect(mockApiClient.post).toHaveBeenCalledWith(
        TASK_ENDPOINTS.CREATE_GENERIC_TASK,
        expect.objectContaining({
          title: TASK_TEST_CONSTANTS.TASK_TITLE,
          priority: TaskPriority.High,
          type: TaskType.External // SDK adds this automatically
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            [FOLDER_ID]: TEST_CONSTANTS.FOLDER_ID.toString()
          })
        })
      );
    });

    it('should handle optional data field with nested objects', async () => {
      const taskInput = {
        title: TASK_TEST_CONSTANTS.TASK_TITLE_COMPLEX,
        priority: TaskPriority.Critical,
        data: TASK_TEST_CONSTANTS.CUSTOM_DATA
      } as TaskCreateOptions;

      const mockResponse = createMockTaskResponse({
        priority: TaskPriority.Critical,
        data: taskInput.data
      });

      mockApiClient.post.mockResolvedValue(mockResponse);

      await taskService.create(taskInput, TEST_CONSTANTS.FOLDER_ID);

      // Verify complex data structures are passed through
      expect(mockApiClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          data: TASK_TEST_CONSTANTS.CUSTOM_DATA
        }),
        expect.any(Object)
      );
    });

    it('should handle API errors', async () => {
      const taskInput = {
        title: TASK_TEST_CONSTANTS.TASK_TITLE,
        priority: TaskPriority.High
      } as TaskCreateOptions;

      const error = createMockError(TEST_CONSTANTS.ERROR_MESSAGE);
      mockApiClient.post.mockRejectedValue(error);

      await expect(taskService.create(taskInput, TEST_CONSTANTS.FOLDER_ID)).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe('assign', () => {
    it('should assign a single task successfully', async () => {
      const assignment = {
        taskId: TASK_TEST_CONSTANTS.TASK_ID,
        userId: TASK_TEST_CONSTANTS.USER_ID
      } as TaskAssignmentOptions;

      const mockResponse = {
        value: [] // Empty array means success
      };

      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await taskService.assign(assignment);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([assignment]);
      
      expect(mockApiClient.post).toHaveBeenCalledWith(
        TASK_ENDPOINTS.ASSIGN_TASKS,
        expect.objectContaining({
          taskAssignments: expect.arrayContaining([
            expect.objectContaining({
              taskId: assignment.taskId,
              userId: assignment.userId
            })
          ])
        }),
        expect.any(Object)
      );
    });

    it('should assign multiple tasks successfully', async () => {
      const assignments = [
        { taskId: TASK_TEST_CONSTANTS.TASK_ID, userId: TASK_TEST_CONSTANTS.USER_ID },
        { taskId: TASK_TEST_CONSTANTS.TASK_ID_2, userId: TASK_TEST_CONSTANTS.USER_ID_2 }
      ] as TaskAssignmentOptions[];

      const mockResponse = {
        value: []
      };

      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await taskService.assign(assignments);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(assignments);
      
      expect(mockApiClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          taskAssignments: expect.arrayContaining([
            expect.objectContaining({ taskId: TASK_TEST_CONSTANTS.TASK_ID, userId: TASK_TEST_CONSTANTS.USER_ID }),
            expect.objectContaining({ taskId: TASK_TEST_CONSTANTS.TASK_ID_2, userId: TASK_TEST_CONSTANTS.USER_ID_2 })
          ])
        }),
        expect.any(Object)
      );
    });

    it('should support assignment with email', async () => {
      const assignment = {
        taskId: TASK_TEST_CONSTANTS.TASK_ID,
        userNameOrEmail: TASK_TEST_CONSTANTS.USER_EMAIL
      } as TaskAssignmentOptions;

      const mockResponse = {
        value: []
      };

      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await taskService.assign(assignment);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([assignment]);
      
      expect(mockApiClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          taskAssignments: expect.arrayContaining([
            expect.objectContaining({
              taskId: TASK_TEST_CONSTANTS.TASK_ID,
              userNameOrEmail: TASK_TEST_CONSTANTS.USER_EMAIL
            })
          ])
        }),
        expect.any(Object)
      );
    });

    it('should include assignmentCriteria when assigning to a group', async () => {
      const assignment = {
        taskId: TASK_TEST_CONSTANTS.TASK_ID,
        userId: TASK_TEST_CONSTANTS.USER_ID,
        assignmentCriteria: TaskAssignmentCriteria.AllUsers
      } as TaskAssignmentOptions;

      mockApiClient.post.mockResolvedValue({ value: [] });

      const result = await taskService.assign(assignment);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([assignment]);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        TASK_ENDPOINTS.ASSIGN_TASKS,
        expect.objectContaining({
          taskAssignments: expect.arrayContaining([
            expect.objectContaining({
              taskId: assignment.taskId,
              userId: assignment.userId,
              assignmentCriteria: TaskAssignmentCriteria.AllUsers
            })
          ])
        }),
        expect.any(Object)
      );
    });
  });

  describe('reassign', () => {
    it('should reassign a single task successfully', async () => {
      const assignment = {
        taskId: TASK_TEST_CONSTANTS.TASK_ID,
        userId: TASK_TEST_CONSTANTS.USER_ID
      } as TaskAssignmentOptions;

      const mockResponse = {
        value: []
      };

      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await taskService.reassign(assignment);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([assignment]);
      
      expect(mockApiClient.post).toHaveBeenCalledWith(
        TASK_ENDPOINTS.REASSIGN_TASKS,
        expect.objectContaining({
          taskAssignments: expect.arrayContaining([
            expect.objectContaining({
              taskId: assignment.taskId,
              userId: assignment.userId
            })
          ])
        }),
        expect.any(Object)
      );
    });

    it('should reassign multiple tasks successfully', async () => {
      const assignments = [
        { taskId: TASK_TEST_CONSTANTS.TASK_ID, userId: TASK_TEST_CONSTANTS.USER_ID },
        { taskId: TASK_TEST_CONSTANTS.TASK_ID_2, userId: TASK_TEST_CONSTANTS.USER_ID_2 }
      ] as TaskAssignmentOptions[];

      const mockResponse = {
        value: []
      };

      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await taskService.reassign(assignments);

      // Verify complete OperationResponse structure
      expect(result.success).toBe(true);
      expect(result.data).toEqual(assignments);

      // Verify API call
      expect(mockApiClient.post).toHaveBeenCalledWith(
        TASK_ENDPOINTS.REASSIGN_TASKS,
        expect.objectContaining({
          taskAssignments: expect.arrayContaining([
            expect.objectContaining({ taskId: TASK_TEST_CONSTANTS.TASK_ID, userId: TASK_TEST_CONSTANTS.USER_ID }),
            expect.objectContaining({ taskId: TASK_TEST_CONSTANTS.TASK_ID_2, userId: TASK_TEST_CONSTANTS.USER_ID_2 })
          ])
        }),
        expect.any(Object)
      );
    });

    it('should reassign task with email address', async () => {
      const assignment = {
        taskId: TASK_TEST_CONSTANTS.TASK_ID,
        userNameOrEmail: TASK_TEST_CONSTANTS.USER_EMAIL
      } as TaskAssignmentOptions;

      const mockResponse = {
        value: []
      };

      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await taskService.reassign(assignment);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([assignment]);

      // Verify email is passed to API
      expect(mockApiClient.post).toHaveBeenCalledWith(
        TASK_ENDPOINTS.REASSIGN_TASKS,
        expect.objectContaining({
          taskAssignments: expect.arrayContaining([
            expect.objectContaining({
              taskId: TASK_TEST_CONSTANTS.TASK_ID,
              userNameOrEmail: TASK_TEST_CONSTANTS.USER_EMAIL
            })
          ])
        }),
        expect.any(Object)
      );
    });

    it('should include assignmentCriteria when reassigning to a group', async () => {
      const assignment = {
        taskId: TASK_TEST_CONSTANTS.TASK_ID,
        userId: TASK_TEST_CONSTANTS.USER_ID,
        assignmentCriteria: TaskAssignmentCriteria.AllUsers
      } as TaskAssignmentOptions;

      mockApiClient.post.mockResolvedValue({ value: [] });

      const result = await taskService.reassign(assignment);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([assignment]);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        TASK_ENDPOINTS.REASSIGN_TASKS,
        expect.objectContaining({
          taskAssignments: expect.arrayContaining([
            expect.objectContaining({
              taskId: assignment.taskId,
              userId: assignment.userId,
              assignmentCriteria: TaskAssignmentCriteria.AllUsers
            })
          ])
        }),
        expect.any(Object)
      );
    });
  });

  describe('unassign', () => {
    it('should unassign a single task successfully', async () => {
      const taskId = TASK_TEST_CONSTANTS.TASK_ID;

      const mockResponse = {
        value: []
      };

      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await taskService.unassign(taskId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([{ taskId: taskId }]);
      
      expect(mockApiClient.post).toHaveBeenCalledWith(
        TASK_ENDPOINTS.UNASSIGN_TASKS,
        expect.objectContaining({
          taskIds: [taskId]
        }),
        expect.any(Object)
      );
    });

    it('should unassign multiple tasks successfully', async () => {
      const taskIds = [TASK_TEST_CONSTANTS.TASK_ID, TASK_TEST_CONSTANTS.TASK_ID_2, TASK_TEST_CONSTANTS.TASK_ID_3];

      const mockResponse = {
        value: []
      };

      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await taskService.unassign(taskIds);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(taskIds.map(taskId => ({ taskId })));
      
      expect(mockApiClient.post).toHaveBeenCalledWith(
        TASK_ENDPOINTS.UNASSIGN_TASKS,
        expect.objectContaining({
          taskIds
        }),
        expect.any(Object)
      );
    });

    it('should handle unassignment failure for invalid task ID', async () => {
      const invalidTaskId = 9999;

      const mockErrorResponse = {
        value: [{
          taskId: invalidTaskId,
          userId: null,
          errorCode: 1002,
          errorMessage: 'Action does not exist.',
          userNameOrEmail: null
        }]
      };

      mockApiClient.post.mockResolvedValue(mockErrorResponse);

      const result = await taskService.unassign(invalidTaskId);

      expect(result.success).toBe(false);
      expect(result.data).toEqual(mockErrorResponse.value);
      expect(result.data[0]).toHaveProperty('taskId', invalidTaskId);
      expect(result.data[0]).toHaveProperty('errorCode', 1002);
      expect(result.data[0]).toHaveProperty('errorMessage', 'Action does not exist.');
    });
  });

  describe('complete', () => {
    it('should complete a generic task successfully', async () => {
      const completionOptions = {
        type: TaskType.External,
        taskId: TASK_TEST_CONSTANTS.TASK_ID
      } as TaskCompletionOptions;
      
      const folderId = TEST_CONSTANTS.FOLDER_ID;

      mockApiClient.post.mockResolvedValue(undefined);

      const result = await taskService.complete(completionOptions, folderId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(completionOptions);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        TASK_ENDPOINTS.COMPLETE_GENERIC_TASK,
        completionOptions,
        expect.objectContaining({
          headers: expect.any(Object)
        })
      );
    });

    it('should complete a form task successfully', async () => {
      const completionOptions = {
        type: TaskType.Form,
        taskId: TASK_TEST_CONSTANTS.TASK_ID,
        data: TASK_TEST_CONSTANTS.FORM_DATA,
        action: TASK_TEST_CONSTANTS.ACTION_SUBMIT
      } as TaskCompletionOptions;
      
      const folderId = TEST_CONSTANTS.FOLDER_ID;

      mockApiClient.post.mockResolvedValue(undefined);

      const result = await taskService.complete(completionOptions, folderId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(completionOptions);
      
      expect(mockApiClient.post).toHaveBeenCalledWith(
        TASK_ENDPOINTS.COMPLETE_FORM_TASK,
        completionOptions,
        expect.any(Object)
      );
    });

    it('should complete an app task successfully', async () => {
      const completionOptions = {
        type: TaskType.App,
        taskId: TASK_TEST_CONSTANTS.TASK_ID,
        action: TASK_TEST_CONSTANTS.ACTION_APPROVE,
        data: TASK_TEST_CONSTANTS.APP_TASK_DATA
      } as TaskCompletionOptions;
      
      const folderId = TEST_CONSTANTS.FOLDER_ID;

      mockApiClient.post.mockResolvedValue(undefined);

      const result = await taskService.complete(completionOptions, folderId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(completionOptions);
      
      expect(mockApiClient.post).toHaveBeenCalledWith(
        TASK_ENDPOINTS.COMPLETE_APP_TASK,
        completionOptions,
        expect.any(Object)
      );
    });

    it('should include folderId in headers', async () => {
      const completionOptions = {
        type: TaskType.External,
        taskId: TASK_TEST_CONSTANTS.TASK_ID
      } as TaskCompletionOptions;
      
      const folderId = TEST_CONSTANTS.FOLDER_ID;

      mockApiClient.post.mockResolvedValue(undefined);

      await taskService.complete(completionOptions, folderId);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.objectContaining({
          headers: expect.objectContaining({
            [FOLDER_ID]: folderId.toString()
          })
        })
      );
    });
  });

  describe('getById', () => {
    it('should get a task by ID successfully', async () => {
      const taskId = TASK_TEST_CONSTANTS.TASK_ID;
      const folderId = TEST_CONSTANTS.FOLDER_ID;
      const mockResponse = createMockTaskGetResponse({
        id: taskId,
        title: TASK_TEST_CONSTANTS.TASK_TITLE
      });

      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await taskService.getById(taskId, {}, folderId);

      expect(result.id).toBe(taskId);
      expect(result.title).toBe(TASK_TEST_CONSTANTS.TASK_TITLE);
      expect(mockApiClient.get).toHaveBeenCalledWith(
        expect.stringContaining(taskId.toString()),
        expect.any(Object)
      );
    });

    it('should include folderId in headers', async () => {
      const taskId = TASK_TEST_CONSTANTS.TASK_ID;
      const folderId = TEST_CONSTANTS.FOLDER_ID;
      const mockResponse = createMockTaskGetResponse({
        id: taskId,
        folderId: folderId
      });

      mockApiClient.get.mockResolvedValue(mockResponse);

      await taskService.getById(taskId, {}, folderId);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            [FOLDER_ID]: folderId.toString()
          })
        })
      );
    });

    it('should handle form tasks by calling getFormTaskById with provided folderId', async () => {
      const taskId = TASK_TEST_CONSTANTS.TASK_ID;
      const folderId = TEST_CONSTANTS.FOLDER_ID;

      const mockTaskResponse = createMockTaskGetResponse({
        id: taskId,
        title: TASK_TEST_CONSTANTS.TASK_TITLE_FORM,
        type: TaskType.Form,
        folderId: folderId
      });

      const mockFormTaskResponse = createMockTaskGetResponse({
        id: taskId,
        title: TASK_TEST_CONSTANTS.TASK_TITLE_FORM,
        type: TaskType.Form,
        folderId: folderId,
        formLayout: { /* form-specific data */ },
        actionLabel: TASK_TEST_CONSTANTS.ACTION_SUBMIT
      });

      mockApiClient.get
        .mockResolvedValueOnce(mockTaskResponse)
        .mockResolvedValueOnce(mockFormTaskResponse);

      await taskService.getById(taskId, {}, folderId);

      expect(mockApiClient.get).toHaveBeenCalledTimes(2);
      expect(mockApiClient.get).toHaveBeenNthCalledWith(
        2,
        TASK_ENDPOINTS.GET_TASK_FORM_BY_ID,
        expect.any(Object)
      );
    });

    it('should skip GET_BY_ID and call getFormTaskById directly when taskType is Form', async () => {
      const taskId = TASK_TEST_CONSTANTS.TASK_ID;
      const folderId = TEST_CONSTANTS.FOLDER_ID;

      const mockFormTaskResponse = createMockTaskGetResponse({
        id: taskId,
        title: TASK_TEST_CONSTANTS.TASK_TITLE_FORM,
        type: TaskType.Form,
        folderId: folderId,
        formLayout: {},
        actionLabel: TASK_TEST_CONSTANTS.ACTION_SUBMIT
      });

      mockApiClient.get.mockResolvedValueOnce(mockFormTaskResponse);

      await taskService.getById(taskId, { taskType: TaskType.Form }, folderId);

      // Should only call GET once (getFormTaskById), not GET_BY_ID first
      expect(mockApiClient.get).toHaveBeenCalledTimes(1);
      expect(mockApiClient.get).toHaveBeenCalledWith(
        TASK_ENDPOINTS.GET_TASK_FORM_BY_ID,
        expect.any(Object)
      );
    });

    it('should skip GET_BY_ID and call getByTaskType directly when taskType is DocumentValidation', async () => {
      const taskId = TASK_TEST_CONSTANTS.TASK_ID;
      const folderId = TEST_CONSTANTS.FOLDER_ID;

      const mockDocValidationResponse = createMockTaskGetResponse({
        id: taskId,
        title: 'Document Validation Task',
        type: TaskType.DocumentValidation,
        folderId: folderId
      });

      mockApiClient.get.mockResolvedValueOnce(mockDocValidationResponse);

      await taskService.getById(taskId, { taskType: TaskType.DocumentValidation }, folderId);

      // Should only call GET once (getByTaskType), not GET_BY_ID first
      expect(mockApiClient.get).toHaveBeenCalledTimes(1);
      expect(mockApiClient.get).toHaveBeenCalledWith(
        TASK_ENDPOINTS.GET_GENERIC_TASK_BY_ID,
        expect.objectContaining({
          params: expect.objectContaining({
            taskId: taskId,
          }),
          headers: expect.objectContaining({
            [FOLDER_ID]: folderId.toString()
          })
        })
      );
    });

    it('should auto-detect DocumentValidation type from GET_BY_ID response and call getByTaskType', async () => {
      const taskId = TASK_TEST_CONSTANTS.TASK_ID;
      const folderId = TEST_CONSTANTS.FOLDER_ID;

      const mockTaskResponse = createMockTaskGetResponse({
        id: taskId,
        title: 'Document Validation Task',
        type: TaskType.DocumentValidation,
        folderId: folderId
      });

      const mockDocValidationResponse = createMockTaskGetResponse({
        id: taskId,
        title: 'Document Validation Task',
        type: TaskType.DocumentValidation,
        folderId: folderId
      });

      mockApiClient.get
        .mockResolvedValueOnce(mockTaskResponse)
        .mockResolvedValueOnce(mockDocValidationResponse);

      await taskService.getById(taskId, {}, folderId);

      expect(mockApiClient.get).toHaveBeenCalledTimes(2);
      expect(mockApiClient.get).toHaveBeenNthCalledWith(
        2,
        TASK_ENDPOINTS.GET_GENERIC_TASK_BY_ID,
        expect.any(Object)
      );
    });

    it('should skip GET_BY_ID and call getAppTaskById directly when taskType is App', async () => {
      const taskId = TASK_TEST_CONSTANTS.TASK_ID;
      const folderId = TEST_CONSTANTS.FOLDER_ID;

      const mockAppTaskResponse = createMockTaskGetResponse({
        id: taskId,
        title: 'App Task',
        type: TaskType.App,
        folderId: folderId
      });

      mockApiClient.get.mockResolvedValueOnce(mockAppTaskResponse);

      await taskService.getById(taskId, { taskType: TaskType.App }, folderId);

      // Should only call GET once (getAppTaskById), not GET_BY_ID first
      expect(mockApiClient.get).toHaveBeenCalledTimes(1);
      expect(mockApiClient.get).toHaveBeenCalledWith(
        TASK_ENDPOINTS.GET_APP_TASK_BY_ID,
        expect.objectContaining({
          params: expect.objectContaining({
            taskId: taskId,
          }),
          headers: expect.objectContaining({
            [FOLDER_ID]: folderId.toString()
          })
        })
      );
    });

    it('should auto-detect App type from GET_BY_ID response and call getAppTaskById', async () => {
      const taskId = TASK_TEST_CONSTANTS.TASK_ID;
      const folderId = TEST_CONSTANTS.FOLDER_ID;

      const mockTaskResponse = createMockTaskGetResponse({
        id: taskId,
        title: 'App Task',
        type: TaskType.App,
        folderId: folderId
      });

      const mockAppTaskResponse = createMockTaskGetResponse({
        id: taskId,
        title: 'App Task',
        type: TaskType.App,
        folderId: folderId
      });

      mockApiClient.get
        .mockResolvedValueOnce(mockTaskResponse)
        .mockResolvedValueOnce(mockAppTaskResponse);

      await taskService.getById(taskId, {}, folderId);

      expect(mockApiClient.get).toHaveBeenCalledTimes(2);
      expect(mockApiClient.get).toHaveBeenNthCalledWith(
        2,
        TASK_ENDPOINTS.GET_APP_TASK_BY_ID,
        expect.any(Object)
      );
    });

    it('should skip GET_BY_ID and call getGenericTaskById directly when taskType is External', async () => {
      const taskId = TASK_TEST_CONSTANTS.TASK_ID;
      const folderId = TEST_CONSTANTS.FOLDER_ID;

      const mockResponse = createMockTaskGetResponse({
        id: taskId,
        title: 'External Task',
        type: TaskType.External,
        folderId: folderId
      });

      mockApiClient.get.mockResolvedValueOnce(mockResponse);

      await taskService.getById(taskId, { taskType: TaskType.External }, folderId);

      expect(mockApiClient.get).toHaveBeenCalledTimes(1);
      expect(mockApiClient.get).toHaveBeenCalledWith(
        TASK_ENDPOINTS.GET_GENERIC_TASK_BY_ID,
        expect.objectContaining({
          params: expect.objectContaining({
            taskId: taskId,
          }),
          headers: expect.objectContaining({
            [FOLDER_ID]: folderId.toString()
          })
        })
      );
    });

    it('should send expandOnFormLayout param for Form tasks', async () => {
      const taskId = TASK_TEST_CONSTANTS.TASK_ID;
      const folderId = TEST_CONSTANTS.FOLDER_ID;

      const mockFormTaskResponse = createMockTaskGetResponse({
        id: taskId,
        title: TASK_TEST_CONSTANTS.TASK_TITLE_FORM,
        type: TaskType.Form,
        folderId: folderId,
        formLayout: {},
        actionLabel: TASK_TEST_CONSTANTS.ACTION_SUBMIT
      });

      mockApiClient.get.mockResolvedValueOnce(mockFormTaskResponse);

      await taskService.getById(taskId, { taskType: TaskType.Form }, folderId);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        TASK_ENDPOINTS.GET_TASK_FORM_BY_ID,
        expect.objectContaining({
          params: expect.objectContaining({
            taskId: taskId,
            expandOnFormLayout: true
          })
        })
      );
    });

    it('should resolve folderId from response when not provided', async () => {
      const taskId = TASK_TEST_CONSTANTS.TASK_ID;
      const taskFolderId = TEST_CONSTANTS.FOLDER_ID;

      const mockTaskResponse = createMockTaskGetResponse({
        id: taskId,
        title: 'App Task',
        type: TaskType.App,
        folderId: taskFolderId
      });

      const mockAppTaskResponse = createMockTaskGetResponse({
        id: taskId,
        title: 'App Task',
        type: TaskType.App,
        folderId: taskFolderId
      });

      mockApiClient.get
        .mockResolvedValueOnce(mockTaskResponse)
        .mockResolvedValueOnce(mockAppTaskResponse);

      // Call without folderId — should resolve from response
      await taskService.getById(taskId);

      expect(mockApiClient.get).toHaveBeenCalledTimes(2);
      expect(mockApiClient.get).toHaveBeenNthCalledWith(
        2,
        TASK_ENDPOINTS.GET_APP_TASK_BY_ID,
        expect.objectContaining({
          headers: expect.objectContaining({
            [FOLDER_ID]: taskFolderId.toString()
          })
        })
      );
    });

    it('should throw ValidationError when taskType is provided without folderId', async () => {
      const taskId = TASK_TEST_CONSTANTS.TASK_ID;

      await expect(
        taskService.getById(taskId, { taskType: TaskType.External })
      ).rejects.toThrow(ValidationError);

      expect(mockApiClient.get).not.toHaveBeenCalled();
    });

    it('should merge custom expand with default expand parameters', async () => {
      const taskId = TASK_TEST_CONSTANTS.TASK_ID;
      const mockResponse = createMockTaskGetResponse({
        id: taskId,
        title: TASK_TEST_CONSTANTS.TASK_TITLE
      });

      mockApiClient.get.mockResolvedValue(mockResponse);

      // Test with custom expand parameter
      await taskService.getById(taskId, { expand: 'CustomField' }, TEST_CONSTANTS.FOLDER_ID);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        expect.stringContaining(taskId.toString()),
        expect.objectContaining({
          params: expect.objectContaining({
            expand: `${DEFAULT_TASK_EXPAND},CustomField`
          })
        })
      );
    });

    it('should run options through transformOptions with TaskMap before prefixing for OData', async () => {
      const taskId = 123;
      const mockTask = createMockTasks(1)[0];
      mockApiClient.get.mockResolvedValue(mockTask);
      vi.mocked(transformOptions).mockClear();

      await taskService.getById(
        taskId,
        { select: 'title,createdTime,completedTime' },
        TEST_CONSTANTS.FOLDER_ID,
      );

      // transformOptions is invoked with the default-expand-augmented options
      // + TaskMap so SDK names in select get rewritten to API names before
      // addPrefixToKeys runs.
      expect(transformOptions).toHaveBeenCalledWith(
        expect.objectContaining({
          select: 'title,createdTime,completedTime',
          expand: DEFAULT_TASK_EXPAND,
        }),
        TaskMap,
      );
    });
  });

  describe('getAll', () => {
    beforeEach(() => {
      // Reset the mock before each test
      vi.mocked(PaginationHelpers.getAll).mockReset();
    });

    it('should return all tasks without pagination', async () => {
      // Mock the pagination helper to return our test data
      const mockTasks = createMockTasks(3);
      const mockResponse = {
        items: mockTasks,
        totalCount: 3
      };

      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(mockResponse);

      const result = await taskService.getAll();

      // Verify PaginationHelpers.getAll was called with correct parameters
      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceAccess: expect.any(Object),
          getEndpoint: expect.any(Function),
          transformFn: expect.any(Function),
          pagination: expect.any(Object)
        }),
        undefined
      );

      expect(result).toEqual(mockResponse);
    });

    it('should return paginated tasks when pagination options provided', async () => {
      // Mock the pagination helper to return our test data
      const mockTasks = createMockTasks(10);
      const mockResponse = {
        items: mockTasks,
        totalCount: 100,
        hasNextPage: true,
        nextCursor: TASK_TEST_CONSTANTS.CURSOR_NEXT,
        previousCursor: null,
        currentPage: 1,
        totalPages: 10
      };

      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(mockResponse);

      const options = {
        pageSize: TEST_CONSTANTS.PAGE_SIZE,
        jumpToPage: 1
      } as TaskGetAllOptions;

      const result = await taskService.getAll(options);

      // Verify PaginationHelpers.getAll was called with correct parameters
      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceAccess: expect.any(Object),
          getEndpoint: expect.any(Function),
          transformFn: expect.any(Function),
          pagination: expect.any(Object)
        }),
        expect.objectContaining({
          pageSize: TEST_CONSTANTS.PAGE_SIZE,
          jumpToPage: 1
        })
      );

      expect(result).toEqual(mockResponse);
    });

    it('should handle filtering options', async () => {
      // Mock the pagination helper to return our test data
      const mockTasks = createMockTasks(2);
      const mockResponse = {
        items: mockTasks,
        totalCount: 2
      };

      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(mockResponse);

      const options = {
        filter: "status eq 'Pending'"
      } as TaskGetAllOptions;

      await taskService.getAll(options);

      // Verify PaginationHelpers.getAll was called with correct parameters
      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceAccess: expect.any(Object),
          getEndpoint: expect.any(Function),
          transformFn: expect.any(Function),
          pagination: expect.any(Object)
        }),
        expect.objectContaining({
          filter: "status eq 'Pending'"
        })
      );
    });

    it('should call processParametersFn with folderId when provided', async () => {
      const mockTasks = createMockTasks(1);
      const mockResponse = {
        items: mockTasks,
        totalCount: 1
      };

      // Mock PaginationHelpers.getAll and capture the processParametersFn
      let capturedProcessParametersFn: ((options: any, folderId?: number) => any) | undefined;
      vi.mocked(PaginationHelpers.getAll).mockImplementation(async (config: any) => {
        capturedProcessParametersFn = config.processParametersFn;
        return mockResponse;
      });

      await taskService.getAll({ folderId: TEST_CONSTANTS.FOLDER_ID });

      // Verify the process parameters function was captured
      expect(capturedProcessParametersFn).toBeDefined();

      // Test processParametersFn with folderId and no existing filter
      const optionsWithoutFilter = { select: 'id,title' };
      const processedWithoutFilter = capturedProcessParametersFn!(optionsWithoutFilter, TEST_CONSTANTS.FOLDER_ID);
      expect(processedWithoutFilter).toHaveProperty('filter', `organizationUnitId eq ${TEST_CONSTANTS.FOLDER_ID}`);
      expect(processedWithoutFilter).toHaveProperty('expand');

      // Test processParametersFn with folderId and existing filter
      const optionsWithFilter = { filter: 'status eq "Pending"' };
      const processedWithFilter = capturedProcessParametersFn!(optionsWithFilter, TEST_CONSTANTS.FOLDER_ID);
      expect(processedWithFilter.filter).toBe(`status eq "Pending" and organizationUnitId eq ${TEST_CONSTANTS.FOLDER_ID}`);

      // Test processParametersFn without folderId
      const optionsNoFolder = { select: 'id' };
      const processedNoFolder = capturedProcessParametersFn!(optionsNoFolder);
      expect(processedNoFolder.filter).toBeUndefined();
    });

    it('should use admin endpoint when asTaskAdmin is true', async () => {
      const mockTasks = createMockTasks(2);
      const mockResponse = {
        items: mockTasks,
        totalCount: 2
      };

      // Mock PaginationHelpers.getAll and capture the getEndpoint function
      let capturedEndpoint: string | undefined;
      vi.mocked(PaginationHelpers.getAll).mockImplementation(async (config: any) => {
        capturedEndpoint = config.getEndpoint();
        return mockResponse;
      });

      await taskService.getAll({ asTaskAdmin: true });

      // Verify the admin endpoint was used
      expect(capturedEndpoint).toBe(TASK_ENDPOINTS.GET_TASKS_ACROSS_FOLDERS_ADMIN);
    });

    it('should use non-admin endpoint when asTaskAdmin is not provided', async () => {
      const mockTasks = createMockTasks(2);
      const mockResponse = {
        items: mockTasks,
        totalCount: 2
      };

      // Mock PaginationHelpers.getAll and capture the getEndpoint function
      let capturedEndpoint: string | undefined;
      vi.mocked(PaginationHelpers.getAll).mockImplementation(async (config: any) => {
        capturedEndpoint = config.getEndpoint();
        return mockResponse;
      });

      await taskService.getAll();

      // Verify the non-admin endpoint was used (default behavior)
      expect(capturedEndpoint).toBe(TASK_ENDPOINTS.GET_TASKS_ACROSS_FOLDERS);
    });

    it('should run options through transformOptions with TaskMap before delegating', async () => {
      vi.mocked(PaginationHelpers.getAll).mockResolvedValue({
        items: createMockTasks(0),
        totalCount: 0,
      });
      vi.mocked(transformOptions).mockClear();

      const options = {
        filter: "createdTime gt 2026-01-01 and folderId eq 7",
        orderby: 'completedTime desc',
      };
      await taskService.getAll(options);

      // transformOptions is invoked with the user's options + TaskMap so SDK
      // field names like createdTime / folderId / completedTime are rewritten
      // to API names before the request is built.
      expect(transformOptions).toHaveBeenCalledWith(options, TaskMap);
    });
  });

  describe('getUsers', () => {
    beforeEach(() => {
      // Reset the mock before each test
      vi.mocked(PaginationHelpers.getAll).mockReset();
    });

    it('should return all users without pagination', async () => {
      // Mock the pagination helper to return our test data
      const folderId = TEST_CONSTANTS.FOLDER_ID;
      const mockUsers = createMockUsers(3);
      const mockResponse = {
        items: mockUsers,
        totalCount: 3
      };

      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(mockResponse);

      const result = await taskService.getUsers(folderId);

      // Verify PaginationHelpers.getAll was called with correct parameters
      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceAccess: expect.any(Object),
          getEndpoint: expect.any(Function),
          transformFn: expect.any(Function),
          pagination: expect.any(Object)
        }),
        expect.objectContaining({
          folderId: folderId
        })
      );

      expect(result).toEqual(mockResponse);
    });

    it('should return paginated users when pagination options provided', async () => {
      // Mock the pagination helper to return our test data
      const folderId = TEST_CONSTANTS.FOLDER_ID;
      const mockUsers = createMockUsers(10);
      const mockResponse = {
        items: mockUsers,
        totalCount: 50,
        hasNextPage: true,
        nextCursor: TASK_TEST_CONSTANTS.CURSOR_NEXT,
        previousCursor: null,
        currentPage: 1,
        totalPages: 5
      };

      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(mockResponse);

      const options = {
        pageSize: TEST_CONSTANTS.PAGE_SIZE
      } as TaskGetUsersOptions;

      const result = await taskService.getUsers(folderId, options);

      // Verify PaginationHelpers.getAll was called with correct parameters
      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceAccess: expect.any(Object),
          getEndpoint: expect.any(Function),
          transformFn: expect.any(Function),
          pagination: expect.any(Object)
        }),
        expect.objectContaining({
          folderId: folderId,
          pageSize: TEST_CONSTANTS.PAGE_SIZE
        })
      );

      expect(result).toEqual(mockResponse);
    });

    it('should handle filtering options', async () => {
      // Mock the pagination helper to return our test data
      const folderId = TEST_CONSTANTS.FOLDER_ID;
      const mockUsers = createMockUsers(1);
      const mockResponse = {
        items: mockUsers,
        totalCount: 1
      };

      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(mockResponse);

      const options = {
        filter: "name eq 'abc'"
      } as TaskGetUsersOptions;

      await taskService.getUsers(folderId, options);

      // Verify PaginationHelpers.getAll was called with correct parameters
      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceAccess: expect.any(Object),
          getEndpoint: expect.any(Function),
          transformFn: expect.any(Function),
          pagination: expect.any(Object)
        }),
        expect.objectContaining({
          folderId: folderId,
          filter: "name eq 'abc'"
        })
      );
    });

    it('should handle API errors', async () => {
      const error = createMockError(TEST_CONSTANTS.ERROR_MESSAGE);
      vi.mocked(PaginationHelpers.getAll).mockRejectedValue(error);

      await expect(taskService.getUsers(TEST_CONSTANTS.FOLDER_ID)).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });
});

// ===== Extended + comment method suites =====
// These suites exercise the real transform pipeline, so they swap the module-level
// identity transform mocks for the real implementations, and restore identity afterwards
// so the suites above (which rely on identity transforms) remain unaffected.
async function useRealTransforms() {
  const actual = await vi.importActual<typeof import('../../../../src/utils/transform')>('../../../../src/utils/transform');
  vi.mocked(transformData).mockImplementation(actual.transformData);
  vi.mocked(pascalToCamelCaseKeys).mockImplementation(actual.pascalToCamelCaseKeys);
  vi.mocked(camelToPascalCaseKeys).mockImplementation(actual.camelToPascalCaseKeys);
  vi.mocked(addPrefixToKeys).mockImplementation(actual.addPrefixToKeys);
  vi.mocked(applyDataTransforms).mockImplementation(actual.applyDataTransforms);
  vi.mocked(transformOptions).mockImplementation(actual.transformOptions);
}

const identityTransform = (value: any) => value;

function useIdentityTransforms() {
  const identity = identityTransform;
  vi.mocked(transformData).mockImplementation(identity);
  vi.mocked(pascalToCamelCaseKeys).mockImplementation(identity);
  vi.mocked(camelToPascalCaseKeys).mockImplementation(identity);
  vi.mocked(addPrefixToKeys).mockImplementation(identity);
  vi.mocked(applyDataTransforms).mockImplementation(identity);
  vi.mocked(transformOptions).mockImplementation(identity);
}

const EXT_TASK = { ID: 5001, FOLDER: TEST_CONSTANTS.FOLDER_ID, CREATED: '2026-04-01T00:00:00.000Z' };

// The GenericTasks getData endpoint returns camelCase, with the user payload under `data`.
const createMockRawTaskData = (overrides: Partial<any> = {}): any =>
  createMockBaseResponse({
    id: EXT_TASK.ID,
    key: '33333333-3333-3333-3333-333333333333',
    title: 'Approve invoice',
    type: TaskType.External,
    status: 1, // numeric -> TaskStatus.Pending
    priority: TaskPriority.Medium,
    organizationUnitId: EXT_TASK.FOLDER,
    data: { amount: 1200 },
    action: null,
    creationTime: EXT_TASK.CREATED,
    lastModificationTime: null,
    tags: [],
  }, overrides);

const NOTE = {
  ID: 900,
  KEY: '22222222-2222-2222-2222-222222222222',
  TASK_ID: 5001,
  TEXT: 'Escalated to finance',
  CREATED_TIME: '2026-03-01T00:00:00.000Z',
};

const createMockRawNote = (overrides: Partial<any> = {}): any =>
  createMockBaseResponse({
    Id: NOTE.ID,
    Key: NOTE.KEY,
    TaskId: NOTE.TASK_ID,
    OrganizationUnitId: TEST_CONSTANTS.FOLDER_ID,
    Text: NOTE.TEXT,
    CreatorUserId: TEST_CONSTANTS.USER_ID,
    CreationTime: NOTE.CREATED_TIME,
  }, overrides);

const createMockNoteCollection = (count = 1): any => {
  const items = createMockCollection(count, (index) => ({
    id: NOTE.ID + index,
    key: `${index}-${NOTE.KEY}`,
    taskId: NOTE.TASK_ID,
    folderId: TEST_CONSTANTS.FOLDER_ID,
    text: `${NOTE.TEXT} ${index}`,
    createdTime: NOTE.CREATED_TIME,
  }));
  return createMockBaseResponse({ items, totalCount: count });
};

describe('TaskService (extended: getDataById/getDataByKey/saveData/saveTags/editMetadata)', () => {
  let service: TaskService;
  let mockApiClient: any;

  beforeEach(async () => {
    const { instance } = createServiceTestDependencies();
    mockApiClient = createMockApiClient();
    vi.mocked(ApiClient).mockImplementation(function () { return mockApiClient; });
    await useRealTransforms();
    service = new TaskService(instance);
  });

  afterEach(() => {
    vi.clearAllMocks();
    useIdentityTransforms();
  });

  describe('getDataById', () => {
    it('should throw ValidationError when taskId or folder is missing', async () => {
      await expect(service.getDataById(0, { folderId: EXT_TASK.FOLDER })).rejects.toBeInstanceOf(ValidationError);
      await expect(service.getDataById(EXT_TASK.ID)).rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.get).not.toHaveBeenCalled();
    });

    it('should GET by id with folder header and transform the response', async () => {
      mockApiClient.get.mockResolvedValue(createMockRawTaskData());

      const result = await service.getDataById(EXT_TASK.ID, { folderId: EXT_TASK.FOLDER });

      expect(mockApiClient.get).toHaveBeenCalledWith(
        TASK_ENDPOINTS.GET_GENERIC_TASK_BY_ID,
        expect.objectContaining({
          params: expect.objectContaining({ taskId: EXT_TASK.ID }),
          headers: expect.objectContaining({ [FOLDER_ID]: EXT_TASK.FOLDER.toString() }),
        }),
      );

      expect(result.id).toBe(EXT_TASK.ID);
      expect(result.status).toBe(TaskStatus.Pending); // numeric 1 -> enum
      expect(result.folderId).toBe(EXT_TASK.FOLDER);
      expect((result as any).organizationUnitId).toBeUndefined(); // renamed to folderId
      expect(result.createdTime).toBe(EXT_TASK.CREATED);
      expect((result as any).creationTime).toBeUndefined(); // renamed to createdTime
      expect(result.data).toEqual({ amount: 1200 });
    });

    it('should route folderKey to the folder-key header', async () => {
      mockApiClient.get.mockResolvedValue(createMockRawTaskData());

      await service.getDataById(EXT_TASK.ID, { folderKey: 'my-folder-key' });

      const [, spec] = mockApiClient.get.mock.calls[0];
      expect(spec.headers[FOLDER_KEY]).toBe('my-folder-key');
      expect(spec.headers[FOLDER_ID]).toBeUndefined();
    });

    it('should route folderPath to the encoded folder-path header', async () => {
      mockApiClient.get.mockResolvedValue(createMockRawTaskData());

      await service.getDataById(EXT_TASK.ID, { folderPath: 'Shared' });

      const [, spec] = mockApiClient.get.mock.calls[0];
      expect(spec.headers[FOLDER_PATH_ENCODED]).toBeDefined();
      expect(spec.headers[FOLDER_ID]).toBeUndefined();
    });

    it('should preserve user-defined Data payload keys verbatim (no case conversion)', async () => {
      mockApiClient.get.mockResolvedValue(createMockRawTaskData({ data: { InvoiceNumber: '123', VendorName: 'Acme', nested: { LineTotal: 5 } } }));

      const result = await service.getDataById(EXT_TASK.ID, { folderId: EXT_TASK.FOLDER });

      expect(result.folderId).toBe(EXT_TASK.FOLDER);
      expect(result.data).toEqual({ InvoiceNumber: '123', VendorName: 'Acme', nested: { LineTotal: 5 } });
    });

    it('should return data as null when the task has no Data payload', async () => {
      mockApiClient.get.mockResolvedValue(createMockRawTaskData({ data: null }));

      const result = await service.getDataById(EXT_TASK.ID, { folderId: EXT_TASK.FOLDER });

      expect(result.data).toBeNull();
    });

    it('should propagate API errors', async () => {
      mockApiClient.get.mockRejectedValue(createMockError(TEST_CONSTANTS.ERROR_MESSAGE));
      await expect(service.getDataById(EXT_TASK.ID, { folderId: EXT_TASK.FOLDER })).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe('getDataByKey', () => {
    const TASK_KEY = '11111111-1111-1111-1111-111111111111';

    it('should throw ValidationError when key or folder is missing', async () => {
      await expect(service.getDataByKey('', { folderId: EXT_TASK.FOLDER })).rejects.toBeInstanceOf(ValidationError);
      await expect(service.getDataByKey(TASK_KEY)).rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.get).not.toHaveBeenCalled();
    });

    it('should GET by key with folder header and transform the response', async () => {
      mockApiClient.get.mockResolvedValue(createMockRawTaskData());

      const result = await service.getDataByKey(TASK_KEY, { folderId: EXT_TASK.FOLDER });

      expect(mockApiClient.get).toHaveBeenCalledWith(
        TASK_ENDPOINTS.GET_GENERIC_TASK_BY_KEY,
        expect.objectContaining({
          params: expect.objectContaining({ taskKey: TASK_KEY }),
          headers: expect.objectContaining({ [FOLDER_ID]: EXT_TASK.FOLDER.toString() }),
        }),
      );

      expect(result.id).toBe(EXT_TASK.ID);
      expect(result.folderId).toBe(EXT_TASK.FOLDER);
      expect((result as any).organizationUnitId).toBeUndefined();
      expect(result.createdTime).toBe(EXT_TASK.CREATED);
      expect((result as any).creationTime).toBeUndefined(); // renamed to createdTime
      expect(result.data).toEqual({ amount: 1200 });
    });

    it('should propagate API errors', async () => {
      mockApiClient.get.mockRejectedValue(createMockError(TEST_CONSTANTS.ERROR_MESSAGE));
      await expect(service.getDataByKey(TASK_KEY, { folderId: EXT_TASK.FOLDER })).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe('saveData', () => {
    it('should throw ValidationError when taskId or folder is missing', async () => {
      await expect(service.saveData(0, {}, { folderId: EXT_TASK.FOLDER })).rejects.toBeInstanceOf(ValidationError);
      await expect(service.saveData(EXT_TASK.ID, {})).rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.put).not.toHaveBeenCalled();
    });

    it('should PUT { TaskId, Data } with the folder header and leave data keys untouched', async () => {
      mockApiClient.put.mockResolvedValue(createMockBaseResponse({}));

      const data = { line_total: 5, isApproved: true };
      const result = await service.saveData(EXT_TASK.ID, data, { folderId: EXT_TASK.FOLDER });

      expect(result).toBeUndefined();
      const [url, body, spec] = mockApiClient.put.mock.calls[0];
      expect(url).toBe(TASK_ENDPOINTS.SAVE_TASK_DATA);
      expect(body.TaskId).toBe(EXT_TASK.ID);
      expect(body.Data).toEqual({ line_total: 5, isApproved: true }); // keys not case-converted
      expect(spec.headers[FOLDER_ID]).toBe(EXT_TASK.FOLDER.toString());
    });

    it('should propagate API errors', async () => {
      mockApiClient.put.mockRejectedValue(createMockError(TEST_CONSTANTS.ERROR_MESSAGE));
      await expect(service.saveData(EXT_TASK.ID, {}, { folderId: EXT_TASK.FOLDER })).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe('saveTags', () => {
    it('should throw ValidationError when taskId or folder is missing', async () => {
      await expect(service.saveTags(0, [], { folderId: EXT_TASK.FOLDER })).rejects.toBeInstanceOf(ValidationError);
      await expect(service.saveTags(EXT_TASK.ID, [])).rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.put).not.toHaveBeenCalled();
    });

    it('should PUT { TaskId, Tags } in PascalCase with the folder header', async () => {
      mockApiClient.put.mockResolvedValue(createMockBaseResponse({}));

      await service.saveTags(EXT_TASK.ID, [{ name: 'priority', displayName: 'Priority', displayValue: 'High' }], { folderId: EXT_TASK.FOLDER });

      const [url, body, spec] = mockApiClient.put.mock.calls[0];
      expect(url).toBe(TASK_ENDPOINTS.SAVE_TASK_TAGS);
      expect(body.TaskId).toBe(EXT_TASK.ID);
      expect(body.Tags).toEqual([{ Name: 'priority', DisplayName: 'Priority', DisplayValue: 'High' }]);
      expect(spec.headers[FOLDER_ID]).toBe(EXT_TASK.FOLDER.toString());
    });

    it('should propagate API errors', async () => {
      mockApiClient.put.mockRejectedValue(createMockError(TEST_CONSTANTS.ERROR_MESSAGE));
      await expect(service.saveTags(EXT_TASK.ID, [], { folderId: EXT_TASK.FOLDER })).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe('editMetadata', () => {
    it('should throw ValidationError when taskId or folder is missing', async () => {
      await expect(service.editMetadata(0, { folderId: EXT_TASK.FOLDER })).rejects.toBeInstanceOf(ValidationError);
      await expect(service.editMetadata(EXT_TASK.ID)).rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.post).not.toHaveBeenCalled();
    });

    it('should POST the metadata edit in PascalCase with the folder header', async () => {
      mockApiClient.post.mockResolvedValue(createMockBaseResponse({}));

      await service.editMetadata(EXT_TASK.ID, { title: 'Review invoice', priority: TaskPriority.High, folderId: EXT_TASK.FOLDER });

      const [url, body, spec] = mockApiClient.post.mock.calls[0];
      expect(url).toBe(TASK_ENDPOINTS.EDIT_TASK_METADATA);
      expect(body).toEqual(expect.objectContaining({ TaskId: EXT_TASK.ID, Title: 'Review invoice', Priority: TaskPriority.High }));
      expect(body.FolderId).toBeUndefined();
      expect(spec.headers[FOLDER_ID]).toBe(EXT_TASK.FOLDER.toString());
    });

    it('should include UnsetTaskCatalog in body when unlinkTaskCatalog is true', async () => {
      mockApiClient.post.mockResolvedValue(createMockBaseResponse({}));
      await service.editMetadata(EXT_TASK.ID, { unlinkTaskCatalog: true, folderId: EXT_TASK.FOLDER });
      const [, body] = mockApiClient.post.mock.calls[0];
      expect(body.UnsetTaskCatalog).toBe(true);
    });

    it('should include UnsetTaskCatalog: false in body when unlinkTaskCatalog is false', async () => {
      mockApiClient.post.mockResolvedValue(createMockBaseResponse({}));
      await service.editMetadata(EXT_TASK.ID, { unlinkTaskCatalog: false, folderId: EXT_TASK.FOLDER });
      const [, body] = mockApiClient.post.mock.calls[0];
      expect(body.UnsetTaskCatalog).toBe(false);
    });

    it('should omit UnsetTaskCatalog from body when unlinkTaskCatalog is undefined', async () => {
      mockApiClient.post.mockResolvedValue(createMockBaseResponse({}));
      await service.editMetadata(EXT_TASK.ID, { title: 'x', folderId: EXT_TASK.FOLDER });
      const [, body] = mockApiClient.post.mock.calls[0];
      expect(body.UnsetTaskCatalog).toBeUndefined();
    });

    it('should not leak expand/select into the request body', async () => {
      mockApiClient.post.mockResolvedValue(createMockBaseResponse({}));
      await service.editMetadata(EXT_TASK.ID, { title: 'x', folderId: EXT_TASK.FOLDER, expand: 'Tags', select: 'title' });
      const [, body] = mockApiClient.post.mock.calls[0];
      expect(body.Expand).toBeUndefined();
      expect(body.Select).toBeUndefined();
    });

    it('should propagate API errors', async () => {
      mockApiClient.post.mockRejectedValue(createMockError(TEST_CONSTANTS.ERROR_MESSAGE));
      await expect(service.editMetadata(EXT_TASK.ID, { folderId: EXT_TASK.FOLDER })).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });
});

describe('TaskService - Task Comment methods', () => {
  let service: TaskService;
  let mockApiClient: any;

  beforeEach(async () => {
    const { instance } = createServiceTestDependencies();
    mockApiClient = createMockApiClient();
    vi.mocked(ApiClient).mockImplementation(function () { return mockApiClient; });
    vi.mocked(PaginationHelpers.getAll).mockReset();
    await useRealTransforms();
    service = new TaskService(instance);
  });

  afterEach(() => {
    vi.clearAllMocks();
    useIdentityTransforms();
  });

  describe('getComments', () => {
    it('should throw ValidationError when taskId is missing', async () => {
      await expect(service.getComments(0, { folderId: TEST_CONSTANTS.FOLDER_ID })).rejects.toBeInstanceOf(ValidationError);
      expect(PaginationHelpers.getAll).not.toHaveBeenCalled();
    });

    it('should throw ValidationError when no folder is provided', async () => {
      await expect(service.getComments(NOTE.TASK_ID)).rejects.toBeInstanceOf(ValidationError);
      expect(PaginationHelpers.getAll).not.toHaveBeenCalled();
    });

    it('should list comments for a task (folderId routed to org-unit header)', async () => {
      const mockResponse = createMockNoteCollection(2);
      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(mockResponse);

      const result = await service.getComments(NOTE.TASK_ID, { folderId: TEST_CONSTANTS.FOLDER_ID });

      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceAccess: expect.any(Object),
          getEndpoint: expect.toSatisfy((fn: Function) => fn() === TASK_NOTE_ENDPOINTS.GET_BY_TASK_ID(NOTE.TASK_ID)),
          headers: expect.objectContaining({ [FOLDER_ID]: TEST_CONSTANTS.FOLDER_ID.toString() }),
          transformFn: expect.any(Function),
          pagination: expect.any(Object),
        }),
        expect.not.objectContaining({ folderId: TEST_CONSTANTS.FOLDER_ID }),
      );
      expect(result).toEqual(mockResponse);
    });

    it('should route folderKey to the folder-key header', async () => {
      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(createMockNoteCollection());

      await service.getComments(NOTE.TASK_ID, { folderKey: 'my-folder-key' });

      const [[config]] = vi.mocked(PaginationHelpers.getAll).mock.calls;
      expect(config.headers).toMatchObject({ [FOLDER_KEY]: 'my-folder-key' });
      expect(config.headers[FOLDER_ID]).toBeUndefined();
    });

    it('should transform items returned by getComments (camelCase, no PascalCase leaks)', async () => {
      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(createMockNoteCollection());
      await service.getComments(NOTE.TASK_ID, { folderId: TEST_CONSTANTS.FOLDER_ID });

      const [[config]] = vi.mocked(PaginationHelpers.getAll).mock.calls;
      const result = config.transformFn(createMockRawNote());

      expect(result.createdTime).toBe(NOTE.CREATED_TIME);
      expect((result as any).CreationTime).toBeUndefined();
      expect(result.folderId).toBe(TEST_CONSTANTS.FOLDER_ID);
      expect((result as any).OrganizationUnitId).toBeUndefined();
    });

    it('should propagate API errors', async () => {
      vi.mocked(PaginationHelpers.getAll).mockRejectedValue(createMockError(TEST_CONSTANTS.ERROR_MESSAGE));
      await expect(service.getComments(NOTE.TASK_ID, { folderId: TEST_CONSTANTS.FOLDER_ID })).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe('createComment', () => {
    it('should throw ValidationError when taskId, text, or folder is missing', async () => {
      await expect(service.createComment(0, NOTE.TEXT, { folderId: TEST_CONSTANTS.FOLDER_ID })).rejects.toBeInstanceOf(ValidationError);
      await expect(service.createComment(NOTE.TASK_ID, '', { folderId: TEST_CONSTANTS.FOLDER_ID })).rejects.toBeInstanceOf(ValidationError);
      await expect(service.createComment(NOTE.TASK_ID, NOTE.TEXT)).rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.post).not.toHaveBeenCalled();
    });

    it('should POST a PascalCase body to the create action and transform the response', async () => {
      mockApiClient.post.mockResolvedValue(createMockRawNote());

      const result = await service.createComment(NOTE.TASK_ID, NOTE.TEXT, { folderId: TEST_CONSTANTS.FOLDER_ID });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        TASK_NOTE_ENDPOINTS.CREATE,
        expect.objectContaining({ TaskId: NOTE.TASK_ID, Text: NOTE.TEXT }),
        expect.objectContaining({
          headers: expect.objectContaining({ [FOLDER_ID]: TEST_CONSTANTS.FOLDER_ID.toString() }),
        }),
      );

      expect(result.id).toBe(NOTE.ID);
      expect(result.text).toBe(NOTE.TEXT);
      expect(result.taskId).toBe(NOTE.TASK_ID);
      expect(result.createdTime).toBe(NOTE.CREATED_TIME);
      expect((result as any).CreationTime).toBeUndefined();
      expect(result.folderId).toBe(TEST_CONSTANTS.FOLDER_ID);
      expect((result as any).OrganizationUnitId).toBeUndefined();
    });

    it('should propagate API errors', async () => {
      mockApiClient.post.mockRejectedValue(createMockError(TEST_CONSTANTS.ERROR_MESSAGE));
      await expect(service.createComment(NOTE.TASK_ID, NOTE.TEXT, { folderId: TEST_CONSTANTS.FOLDER_ID })).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });
});
