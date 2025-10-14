// ===== IMPORTS =====
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TaskService } from '../../../../src/services/action-center/tasks';
import { 
  TaskType, 
  TaskPriority, 
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
import { createMockError } from '../../../utils/mocks/core';
import { DEFAULT_TASK_EXPAND } from '../../../../src/models/action-center/tasks.constants';
import { TASK_TEST_CONSTANTS } from '../../../utils/constants/tasks';
import { TEST_CONSTANTS } from '../../../utils/constants/common';
import { TASK_ENDPOINTS } from '../../../../src/utils/constants/endpoints';
import { FOLDER_ID } from '../../../../src/utils/constants/headers';

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
    const { config, executionContext, tokenManager } = createServiceTestDependencies();
    mockApiClient = createMockApiClient();

    // Mock the ApiClient constructor
    vi.mocked(ApiClient).mockImplementation(() => mockApiClient);

    // Reset pagination helpers mock before each test
    vi.mocked(PaginationHelpers.getAll).mockReset();

    taskService = new TaskService(config, executionContext, tokenManager);
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
      const mockResponse = createMockTaskGetResponse({
        id: taskId,
        title: TASK_TEST_CONSTANTS.TASK_TITLE
      });

      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await taskService.getById(taskId);

      expect(result).toBeDefined();
      expect(result.id).toBe(taskId);
      expect(result.title).toBe(TASK_TEST_CONSTANTS.TASK_TITLE);
      expect(mockApiClient.get).toHaveBeenCalledWith(
        expect.stringContaining(taskId.toString()),
        expect.any(Object)
      );
    });

    it('should include folderId in headers when provided', async () => {
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

    it('should handle form tasks without folderId by using task folderId', async () => {
      const taskId = TASK_TEST_CONSTANTS.TASK_ID;
      const taskFolderId = TEST_CONSTANTS.FOLDER_ID;

      const mockTaskResponse = createMockTaskGetResponse({
        id: taskId,
        title: TASK_TEST_CONSTANTS.TASK_TITLE_FORM,
        type: TaskType.Form,
        folderId: taskFolderId
      });

      const mockFormTaskResponse = createMockTaskGetResponse({
        id: taskId,
        title: TASK_TEST_CONSTANTS.TASK_TITLE_FORM,
        type: TaskType.Form,
        folderId: taskFolderId,
        formLayout: { /* form-specific data */ },
        actionLabel: TASK_TEST_CONSTANTS.ACTION_SUBMIT
      });

      mockApiClient.get
        .mockResolvedValueOnce(mockTaskResponse)
        .mockResolvedValueOnce(mockFormTaskResponse);

      // Call without providing folderId parameter
      await taskService.getById(taskId);

      expect(mockApiClient.get).toHaveBeenCalledTimes(2);
      expect(mockApiClient.get).toHaveBeenNthCalledWith(
        2,
        TASK_ENDPOINTS.GET_TASK_FORM_BY_ID,
        expect.any(Object)
      );
    });

    it('should merge custom expand with default expand parameters', async () => {
      const taskId = TASK_TEST_CONSTANTS.TASK_ID;
      const mockResponse = createMockTaskGetResponse({
        id: taskId,
        title: TASK_TEST_CONSTANTS.TASK_TITLE
      });

      mockApiClient.get.mockResolvedValue(mockResponse);

      // Test with custom expand parameter
      await taskService.getById(taskId, { expand: 'CustomField' });

      expect(mockApiClient.get).toHaveBeenCalledWith(
        expect.stringContaining(taskId.toString()),
        expect.objectContaining({
          params: expect.objectContaining({
            expand: `${DEFAULT_TASK_EXPAND},CustomField`
          })
        })
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
