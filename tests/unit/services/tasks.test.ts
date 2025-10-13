import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TaskService } from '../../../src/services/action-center/tasks';
import { Config } from '../../../src/core/config/config';
import { ExecutionContext } from '../../../src/core/context/execution';
import { TokenManager } from '../../../src/core/auth/token-manager';
import { TaskType, TaskPriority, TaskStatus } from '../../../src/models/action-center/tasks.types';

// Mock the transform utilities
vi.mock('../../../src/utils/transform', () => {
  const transformKeys = (obj: any, transformer: (key: string) => string): any => {
    if (Array.isArray(obj)) {
      return obj.map(item => transformKeys(item, transformer));
    }
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }
    const result: any = {};
    for (const key in obj) {
      const newKey = transformer(key);
      result[newKey] = transformKeys(obj[key], transformer);
    }
    return result;
  };

  const pascalToCamel = (str: string): string => {
    return str.charAt(0).toLowerCase() + str.slice(1);
  };

  const camelToPascal = (str: string): string => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  return {
    pascalToCamelCaseKeys: (obj: any) => transformKeys(obj, pascalToCamel),
    camelToPascalCaseKeys: (obj: any) => transformKeys(obj, camelToPascal),
    transformData: vi.fn((data) => data),
    applyDataTransforms: vi.fn((data) => data),
    addPrefixToKeys: vi.fn((obj) => obj),
  };
});

// Mock the createTaskWithMethods function
vi.mock('../../../src/models/action-center/tasks.models', () => ({
  createTaskWithMethods: vi.fn((task) => task),
}));

// Mock the processODataArrayResponse function
vi.mock('../../../src/utils/object', () => ({
  processODataArrayResponse: vi.fn((response, inputArray) => ({
    success: !response.value || response.value.length === 0,
    data: response.value && response.value.length > 0 ? response.value : inputArray
  })),
}));

describe('TaskService Unit Tests', () => {
  let taskService: TaskService;
  let mockConfig: Config;
  let mockExecutionContext: ExecutionContext;
  let mockTokenManager: TokenManager;

  beforeEach(() => {
    mockConfig = {
      baseUrl: 'https://test.uipath.com',
      orgName: 'test-org',
      tenantName: 'test-tenant',
      clientId: 'test-client-id',
      secret: 'test-secret',
    } as Config;

    mockExecutionContext = new ExecutionContext();

    mockTokenManager = {
      getToken: vi.fn().mockReturnValue('mock-access-token'),
      hasValidToken: vi.fn().mockReturnValue(true),
    } as unknown as TokenManager;

    taskService = new TaskService(mockConfig, mockExecutionContext, mockTokenManager);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    // Helper to create a valid mock response matching RawTaskCreateResponse
    const createMockTaskResponse = (overrides = {}) => ({
      // Required fields from TaskBaseResponse
      id: 123,
      title: 'Test Task',
      type: TaskType.External,
      priority: TaskPriority.Medium,
      status: TaskStatus.Unassigned,
      folderId: 456,
      key: 'TASK-123',
      isDeleted: false,
      creationTime: '2025-01-15T10:00:00Z',
      action: null,
      externalTag: null,
      lastAssignedTime: null,
      completionTime: null,
      parentOperationId: null,
      deleterUserId: null,
      deletionTime: null,
      lastModificationTime: null,
      // Required fields from RawTaskCreateResponse
      waitJobState: null,
      assignedToUser: null,
      taskSlaDetails: null,
      completedByUser: null,
      taskAssignees: null,
      processingTime: null,
      data: null,
      ...overrides
    });

    it('should create a task successfully with all fields mapped correctly', async () => {
      const taskInput = {
        title: 'Test Task',
        priority: TaskPriority.High
      };

      const mockResponse = createMockTaskResponse({
        title: 'Test Task',
        priority: TaskPriority.High
      });

      vi.spyOn(taskService as any, 'post').mockResolvedValue({
        data: mockResponse
      });

      const result = await taskService.create(taskInput, 456);

      // Verify the result
      expect(result).toBeDefined();
      expect(result.title).toBe('Test Task');
      expect(result.priority).toBe(TaskPriority.High);

      // Verify the API call has correct endpoint, body, and headers
      expect((taskService as any).post).toHaveBeenCalledWith(
        '/tasks/GenericTasks/CreateTask',
        expect.objectContaining({
          title: 'Test Task',
          priority: TaskPriority.High,
          type: TaskType.External // SDK adds this automatically
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-UIPATH-OrganizationUnitId': '456'
          })
        })
      );
    });

    it('should handle optional data field with nested objects', async () => {
      const taskInput = {
        title: 'Complex Task',
        priority: TaskPriority.Critical,
        data: {
          customField: 'customValue',
          nested: { key: 'value' },
          array: [1, 2, 3]
        }
      };

      const mockResponse = createMockTaskResponse({
        priority: TaskPriority.Critical,
        data: taskInput.data
      });

      vi.spyOn(taskService as any, 'post').mockResolvedValue({
        data: mockResponse
      });

      await taskService.create(taskInput, 456);

      // Verify complex data structures are passed through
      expect((taskService as any).post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          data: {
            customField: 'customValue',
            nested: { key: 'value' },
            array: [1, 2, 3]
          }
        }),
        expect.any(Object)
      );
    });
  });

  describe('assign', () => {
    it('should assign a single task successfully', async () => {
      const assignment = {
        taskId: 123,
        userId: 456
      };

      const mockResponse = {
        value: [] // Empty array means success
      };

      vi.spyOn(taskService as any, 'post').mockResolvedValue({
        data: mockResponse
      });

      const result = await taskService.assign(assignment);

      expect(result.success).toBe(true);
      expect((taskService as any).post).toHaveBeenCalledWith(
        expect.stringContaining('Assign'),
        expect.objectContaining({
          TaskAssignments: expect.arrayContaining([
            expect.objectContaining({
              TaskId: assignment.taskId,
              UserId: assignment.userId
            })
          ])
        })
      );
    });

    it('should assign multiple tasks successfully', async () => {
      const assignments = [
        { taskId: 123, userId: 456 },
        { taskId: 789, userId: 101 }
      ];

      const mockResponse = {
        value: []
      };

      vi.spyOn(taskService as any, 'post').mockResolvedValue({
        data: mockResponse
      });

      const result = await taskService.assign(assignments);

      expect(result.success).toBe(true);
      expect((taskService as any).post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          TaskAssignments: expect.arrayContaining([
            expect.objectContaining({ TaskId: 123, UserId: 456 }),
            expect.objectContaining({ TaskId: 789, UserId: 101 })
          ])
        })
      );
    });

    it('should support assignment with email', async () => {
      const assignment = {
        taskId: 123,
        userNameOrEmail: 'user@example.com'
      };

      const mockResponse = {
        value: []
      };

      vi.spyOn(taskService as any, 'post').mockResolvedValue({
        data: mockResponse
      });

      await taskService.assign(assignment);

      expect((taskService as any).post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          TaskAssignments: expect.arrayContaining([
            expect.objectContaining({
              TaskId: 123,
              UserNameOrEmail: 'user@example.com'
            })
          ])
        })
      );
    });
  });

  describe('reassign', () => {
    it('should reassign a single task successfully', async () => {
      const assignment = {
        taskId: 123,
        userId: 999
      };

      const mockResponse = {
        value: []
      };

      vi.spyOn(taskService as any, 'post').mockResolvedValue({
        data: mockResponse
      });

      const result = await taskService.reassign(assignment);

      expect(result.success).toBe(true);
      expect((taskService as any).post).toHaveBeenCalledWith(
        expect.stringContaining('Reassign'),
        expect.objectContaining({
          TaskAssignments: expect.arrayContaining([
            expect.objectContaining({
              TaskId: assignment.taskId,
              UserId: assignment.userId
            })
          ])
        })
      );
    });

    it('should reassign multiple tasks successfully', async () => {
      const assignments = [
        { taskId: 123, userId: 999 },
        { taskId: 456, userId: 888 }
      ];

      const mockResponse = {
        value: []
      };

      vi.spyOn(taskService as any, 'post').mockResolvedValue({
        data: mockResponse
      });

      const result = await taskService.reassign(assignments);

      expect(result.success).toBe(true);
    });
  });

  describe('unassign', () => {
    it('should unassign a single task successfully', async () => {
      const taskId = 123;

      const mockResponse = {
        value: []
      };

      vi.spyOn(taskService as any, 'post').mockResolvedValue({
        data: mockResponse
      });

      const result = await taskService.unassign(taskId);

      expect(result.success).toBe(true);
      expect((taskService as any).post).toHaveBeenCalledWith(
        expect.stringContaining('Unassign'),
        expect.objectContaining({
          taskIds: [taskId]
        })
      );
    });

    it('should unassign multiple tasks successfully', async () => {
      const taskIds = [123, 456, 789];

      const mockResponse = {
        value: []
      };

      vi.spyOn(taskService as any, 'post').mockResolvedValue({
        data: mockResponse
      });

      const result = await taskService.unassign(taskIds);

      expect(result.success).toBe(true);
      expect((taskService as any).post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          taskIds
        })
      );
    });
  });

  describe('complete', () => {
    it('should complete a generic task successfully', async () => {
      const completionOptions = {
        taskId: 123
      };
      const folderId = 456;

      vi.spyOn(taskService as any, 'post').mockResolvedValue({
        data: undefined
      });

      const result = await taskService.complete(TaskType.External, completionOptions, folderId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(completionOptions);
      expect((taskService as any).post).toHaveBeenCalledWith(
        expect.stringContaining('Complete'),
        completionOptions,
        expect.objectContaining({
          headers: expect.any(Object)
        })
      );
    });

    it('should complete a form task successfully', async () => {
      const completionOptions = {
        taskId: 123,
        data: { field1: 'value1' }
      };
      const folderId = 456;

      vi.spyOn(taskService as any, 'post').mockResolvedValue({
        data: undefined
      });

      const result = await taskService.complete(TaskType.Form, completionOptions, folderId);

      expect(result.success).toBe(true);
      expect((taskService as any).post).toHaveBeenCalledWith(
        expect.stringContaining('Form'),
        completionOptions,
        expect.any(Object)
      );
    });

    it('should complete an app task successfully', async () => {
      const completionOptions = {
        taskId: 123,
        action: 'submit',
        data: {}
      };
      const folderId = 456;

      vi.spyOn(taskService as any, 'post').mockResolvedValue({
        data: undefined
      });

      const result = await taskService.complete(TaskType.App, completionOptions, folderId);

      expect(result.success).toBe(true);
      expect((taskService as any).post).toHaveBeenCalledWith(
        expect.stringContaining('App'),
        completionOptions,
        expect.any(Object)
      );
    });

    it('should include folderId in headers', async () => {
      const completionOptions = {
        taskId: 123
      };
      const folderId = 789;

      vi.spyOn(taskService as any, 'post').mockResolvedValue({
        data: undefined
      });

      await taskService.complete(TaskType.External, completionOptions, folderId);

      expect((taskService as any).post).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-UIPATH-OrganizationUnitId': folderId.toString()
          })
        })
      );
    });
  });

  describe('getById', () => {
    it('should get a task by ID successfully', async () => {
      const taskId = 123;
      const mockResponse = {
        id: taskId,
        title: 'Test Task',
        status: TaskStatus.Unassigned,
        type: TaskType.External
      };

      vi.spyOn(taskService as any, 'get').mockResolvedValue({
        data: mockResponse
      });

      const result = await taskService.getById(taskId);

      expect(result).toBeDefined();
      expect((taskService as any).get).toHaveBeenCalledWith(
        expect.stringContaining(taskId.toString()),
        expect.any(Object)
      );
    });

    it('should include folderId in headers when provided', async () => {
      const taskId = 123;
      const folderId = 456;
      const mockResponse = {
        id: taskId,
        title: 'Test Task',
        type: TaskType.External
      };

      vi.spyOn(taskService as any, 'get').mockResolvedValue({
        data: mockResponse
      });

      await taskService.getById(taskId, {}, folderId);

      expect((taskService as any).get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-UIPATH-OrganizationUnitId': folderId.toString()
          })
        })
      );
    });

    it('should handle form tasks by calling getFormTaskById', async () => {
      const taskId = 123;
      const folderId = 456;
      const mockTaskResponse = {
        id: taskId,
        title: 'Form Task',
        type: TaskType.Form,
        folderId: folderId
      };

      const mockFormTaskResponse = {
        id: taskId,
        title: 'Form Task',
        type: TaskType.Form,
        formData: { /* form-specific data */ }
      };

      vi.spyOn(taskService as any, 'get')
        .mockResolvedValueOnce({ data: mockTaskResponse })
        .mockResolvedValueOnce({ data: mockFormTaskResponse });

      const result = await taskService.getById(taskId, {}, folderId);

      expect((taskService as any).get).toHaveBeenCalledTimes(2);
      expect((taskService as any).get).toHaveBeenCalledWith(
        expect.stringContaining('form'),
        expect.any(Object)
      );
    });
  });

  describe('getAll', () => {
    it('should get all tasks successfully', async () => {
      const mockTasks = [
        { id: 1, title: 'Task 1', type: TaskType.External },
        { id: 2, title: 'Task 2', type: TaskType.External }
      ];

      vi.spyOn(taskService as any, 'get').mockResolvedValue({
        data: {
          value: mockTasks,
          '@odata.count': mockTasks.length
        }
      });

      const result = await taskService.getAll();

      expect((taskService as any).get).toHaveBeenCalled();
    });

    it('should support filtering options', async () => {
      const options = {
        filter: "status eq 'Pending'"
      };

      vi.spyOn(taskService as any, 'get').mockResolvedValue({
        data: { value: [], '@odata.count': 0 }
      });

      await taskService.getAll(options);

      expect((taskService as any).get).toHaveBeenCalled();
    });

    it('should support folderId filtering', async () => {
      const options = {
        folderId: 456
      };

      vi.spyOn(taskService as any, 'get').mockResolvedValue({
        data: { value: [], '@odata.count': 0 }
      });

      await taskService.getAll(options);

      expect((taskService as any).get).toHaveBeenCalled();
    });
  });

  describe('getUsers', () => {
    it('should get users for a folder successfully', async () => {
      const folderId = 123;
      const mockUsers = [
        { id: 1, userName: 'user1' },
        { id: 2, userName: 'user2' }
      ];

      vi.spyOn(taskService as any, 'get').mockResolvedValue({
        data: {
          value: mockUsers,
          '@odata.count': mockUsers.length
        }
      });

      const result = await taskService.getUsers(folderId);

      expect((taskService as any).get).toHaveBeenCalled();
    });

    it('should support filtering options', async () => {
      const folderId = 123;
      const options = {
        filter: "name eq 'abc'"
      };

      vi.spyOn(taskService as any, 'get').mockResolvedValue({
        data: { value: [], '@odata.count': 0 }
      });

      await taskService.getUsers(folderId, options);

      expect((taskService as any).get).toHaveBeenCalled();
    });
  });
});
