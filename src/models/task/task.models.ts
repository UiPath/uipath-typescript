import type { 
  RawTaskCreateResponse,
  RawTaskGetResponse, 
  TaskType,
  TaskAssignmentResult, 
  TaskAssignmentRequest,
  TaskCompletionRequest,
  TaskCompleteOptions,
  TaskAssignOptions,
  TaskGetAllOptions,
  TaskGetByIdOptions,
  TaskCreateRequest
} from './task.types';

// Define the task service interface
export interface TaskServiceModel {
  getAll(options?: TaskGetAllOptions): Promise<TaskGetResponse[]>;

  getById(id: number, options?: TaskGetByIdOptions, folderId?: number): Promise<TaskGetResponse>;

  create(request: TaskCreateRequest, folderId: number): Promise<TaskCreateResponse>;

  assign(request: TaskAssignmentRequest, folderId?: number): Promise<TaskAssignmentResult[]>;
  
  reassign(request: TaskAssignmentRequest, folderId?: number): Promise<TaskAssignmentResult[]>;
  
  unassign(taskId: number, folderId?: number): Promise<TaskAssignmentResult[]>;
  
  complete(
    taskType: TaskType,
    request: TaskCompletionRequest,
    folderId: number
  ): Promise<void>;
}

// Method interface that will be added to task objects
export interface TaskMethods {
  /**
   * Assigns this task to a user or users
   * 
   * @param options - Assignment options (requires at least one of: userId, userNameOrEmail)
   * @returns Promise resolving to task assignment results
   */
  assign(options: TaskAssignOptions): Promise<TaskAssignmentResult[]>;

  /**
   * Reassigns this task to a new user
   * 
   * @param options - Assignment options (requires at least one of: userId, userNameOrEmail)
   * @returns Promise resolving to task assignment results
   */
  reassign(options: TaskAssignOptions): Promise<TaskAssignmentResult[]>;

  /**
   * Unassigns this task (removes current assignee)
   * 
   * @returns Promise resolving to task assignment results
   */
  unassign(): Promise<TaskAssignmentResult[]>;

  /**
   * Completes this task with optional data and action
   * 
   * @param options - Completion options
   * @returns Promise resolving to void
   */
  complete(options: TaskCompleteOptions): Promise<void>;
}

// Combined types for task data with methods
export type TaskGetResponse = RawTaskGetResponse & TaskMethods;
export type TaskCreateResponse = RawTaskCreateResponse & TaskMethods;

/**
 * Creates methods for a task
 * 
 * @param taskData - The task data (response from API)
 * @param service - The task service instance
 * @returns Object containing task methods
 */
function createTaskMethods(taskData: RawTaskGetResponse | RawTaskCreateResponse, service: TaskServiceModel): TaskMethods {
  return {
    async assign(options: TaskAssignOptions): Promise<TaskAssignmentResult[]> {
      if (!taskData.id) throw new Error('Task ID is undefined');
      
      return service.assign({
        taskId: taskData.id,
        ...options
      }, taskData.organizationUnitId);
    },
    
    async reassign(options: TaskAssignOptions): Promise<TaskAssignmentResult[]> {
      if (!taskData.id) throw new Error('Task ID is undefined');
      
      return service.reassign({
        taskId: taskData.id,
        ...options
      }, taskData.organizationUnitId);
    },

    async unassign(): Promise<TaskAssignmentResult[]> {
      if (!taskData.id) throw new Error('Task ID is undefined');
      
      return service.unassign(taskData.id, taskData.organizationUnitId);
    },

    async complete(options: TaskCompleteOptions): Promise<void> {
      if (!taskData.id) throw new Error('Task ID is undefined');
      const folderId = taskData.organizationUnitId;
      if (!folderId) throw new Error('Folder ID is required');
      
      return service.complete(
        options.type,
        {
          taskId: taskData.id,
          data: options.data,
          action: options.action
        },
        folderId
      );
    }
  };
}

/**
 * Creates an actionable task by combining API task data with operational methods.
 * 
 * @param taskData - The task data from API
 * @param service - The task service instance
 * @returns A task object with added methods
 */
export function createTaskWithMethods(
  taskData: RawTaskGetResponse | RawTaskCreateResponse, 
  service: TaskServiceModel
): TaskGetResponse | TaskCreateResponse {
  const methods = createTaskMethods(taskData, service);
  return Object.assign({}, taskData, methods) as TaskGetResponse | TaskCreateResponse;
} 