import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  getServices,
  getTestConfig,
  setupUnifiedTests,
  cleanupTestTask,
  InitMode,
} from '../../config/unified-setup';
import { registerResource } from '../../utils/cleanup';
import { generateTestResourceName } from '../../utils/helpers';
import { TaskPriority, TaskType, TaskUserType, TaskAssignmentCriteria } from '../../../../src/models/action-center/tasks.types';

const modes: InitMode[] = ['v0', 'v1'];

describe.each(modes)('Action Center Tasks - Integration Tests [%s]', (mode) => {
  setupUnifiedTests(mode);

  let createdTaskId: number | null = null;
  const testTaskTitle = generateTestResourceName(`Task_${mode}`);

  describe('getAll', () => {
    it('should retrieve all tasks', async () => {
      const { tasks } = getServices();
      const config = getTestConfig();

      const folderId = config.folderId ? Number(config.folderId) : undefined;
      const result = await tasks.getAll({ folderId, pageSize: 5 });

      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
    });

    it('should retrieve tasks with pagination options', async () => {
      const { tasks } = getServices();
      const config = getTestConfig();

      const folderId = config.folderId ? Number(config.folderId) : undefined;
      const result = await tasks.getAll({
        folderId,
        pageSize: 5,
      });

      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.items.length).toBeLessThanOrEqual(5);
    });

    it('should retrieve tasks with filter', async () => {
      const { tasks } = getServices();
      const config = getTestConfig();

      const folderId = config.folderId ? Number(config.folderId) : undefined;
      const result = await tasks.getAll({
        folderId,
        pageSize: 10,
        filter: "Status eq 'Unassigned'",
      });

      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
    });
  });

  describe('create', () => {
    it('should create a task', async () => {
      const { tasks } = getServices();
      const config = getTestConfig();

      const taskData = {
        title: testTaskTitle,
        priority: TaskPriority.Medium,
        type: TaskType.External,
        data: {
          description: 'Integration test task - will be automatically cleaned up',
          testFlag: true,
        },
      };

      const folderId = config.folderId ? Number(config.folderId) : undefined;

      try {
        const result = await tasks.create(taskData, folderId!);

        expect(result).toBeDefined();
        expect(result.title).toBe(testTaskTitle);
        expect(result.id).toBeDefined();
        expect(typeof result.id).toBe('number');

        createdTaskId = result.id;
        registerResource('tasks', { id: createdTaskId, folderId });
      } catch (error: any) {
        throw new Error(
          `Task creation failed. This may require specific Action Center configuration: ${error.message}`
        );
      }
    });
  });

  describe('getById', () => {
    it('should retrieve the created task by ID', async () => {
      if (!createdTaskId) {
        throw new Error('No task ID available for testing');
      }

      const { tasks } = getServices();
      const config = getTestConfig();

      const folderId = config.folderId ? Number(config.folderId) : undefined;

      try {
        const result = await tasks.getById(createdTaskId, {}, folderId!);

        expect(result.id).toBe(createdTaskId);
        expect(result.title).toBe(testTaskTitle);
      } catch (error: any) {
        throw new Error(`Get task by ID failed: ${error.message}`);
      }
    });

    it('should retrieve the created task by ID with taskType skipping initial GET', async () => {
      if (!createdTaskId) {
        throw new Error('No task ID available for testing');
      }

      const { tasks } = getServices();
      const config = getTestConfig();

      const folderId = config.folderId ? Number(config.folderId) : undefined;

      try {
        const result = await tasks.getById(createdTaskId, { taskType: TaskType.External }, folderId!);

        expect(result.id).toBe(createdTaskId);
        expect(result.title).toBe(testTaskTitle);
      } catch (error: any) {
        throw new Error(`Get task by ID with taskType failed (may require External task): ${error.message}`);
      }
    });

    it('should retrieve an app task by ID with taskType', async () => {
      const { tasks } = getServices();

      // Find an existing App task
      const allTasks = await tasks.getAll({ filter: "Type eq 'AppTask' and Status eq 'Unassigned' and IsDeleted eq false", pageSize: 5 });

      if (allTasks.items.length === 0) {
        throw new Error('No App task available in the test environment');
      }

      const appTask = allTasks.items[0];
      const result = await tasks.getById(appTask.id, { taskType: TaskType.App }, appTask.folderId);

      expect(result.id).toBe(appTask.id);
      expect(result.title).toBe(appTask.title);
    });
  });

  describe('Assignment operations', () => {
    it('should get users with task permissions', async () => {
      const { tasks } = getServices();
      const config = getTestConfig();

      const folderId = config.folderId ? Number(config.folderId) : undefined;

      try {
        const result = await tasks.getUsers(folderId!);

        expect(result).toBeDefined();
        expect(result.items).toBeDefined();
        expect(Array.isArray(result.items)).toBe(true);

        if (result.items.length > 0) {
          const user = result.items[0];
          expect(user).toBeDefined();
          expect(user.id).toBeDefined();
        }
      } catch (error: any) {
        throw new Error(`Get users failed: ${error.message}`);
      }
    });

    it('should assign a task to a user', async () => {
      if (!createdTaskId) {
        throw new Error('No task ID available for testing');
      }

      const { tasks } = getServices();
      const config = getTestConfig();

      const folderId = config.folderId ? Number(config.folderId) : undefined;

      try {
        const users = await tasks.getUsers(folderId!);

        const user = users.items.find((u) => u.type === TaskUserType.DirectoryUser || u.type === TaskUserType.User);
        if (!user) {
          throw new Error('No DirectoryUser available to assign task');
        }

        const userId = user.id;

        const result = await tasks.assign({
          taskId: createdTaskId,
          userId: userId,
        });

        expect(result).toBeDefined();
        expect(result.success).toBe(true);

        const task = await tasks.getById(createdTaskId, {}, folderId!);
        expect(task.assignedToUser).toBeDefined();
      } catch (error: any) {
        throw new Error(`Task assignment failed: ${error.message}`);
      }
    });

    it('should unassign a task', async () => {
      if (!createdTaskId) {
        throw new Error('No task ID available for testing');
      }

      const { tasks } = getServices();
      const config = getTestConfig();

      const folderId = config.folderId ? Number(config.folderId) : undefined;

      try {
        let task = await tasks.getById(createdTaskId, {}, folderId!);

        if (!task.assignedToUser) {
          const users = await tasks.getUsers(folderId!);

          const user = users.items.find((u) => u.type === TaskUserType.DirectoryUser || u.type === TaskUserType.User);
          if (!user) {
            throw new Error('No DirectoryUser available to assign task');
          }

          const userId = user.id;

          const assignResult = await tasks.assign({
            taskId: createdTaskId,
            userId: userId,
          });
          expect(assignResult).toBeDefined();
          expect(assignResult.success).toBe(true);
        }

        const result = await tasks.unassign(createdTaskId);

        expect(result).toBeDefined();
        expect(result.success).toBe(true);

        task = await tasks.getById(createdTaskId, {}, folderId!);
        expect(task.assignedToUser).toBeNull();
      } catch (error: any) {
        throw new Error(`Task unassignment failed: ${error.message}`);
      }
    });
  });

  describe('Assignment with criteria', () => {
    // Resolved once for the whole block — Action Center assignment is
    // folder-scoped, and the user/group must exist to exercise the paths.
    // (Single-user assignment by userId is already covered in "Assignment
    // operations"; this block adds the userNameOrEmail and group-criteria paths.)
    let folderId!: number;
    let userNameOrEmail!: string;
    let groupId!: number;
    let criteriaTaskId!: number;

    beforeAll(async () => {
      const { tasks } = getServices();
      const config = getTestConfig();

      if (!config.folderId) {
        throw new Error('folderId is required in the test config for assignment-criteria tests');
      }
      folderId = Number(config.folderId);

      const users = await tasks.getUsers(folderId);

      const individual = users.items.find(
        (u) => u.type === TaskUserType.User || u.type === TaskUserType.DirectoryUser,
      );
      if (!individual) {
        throw new Error('No individual user (User/DirectoryUser) in the folder to test single-user assignment');
      }
      userNameOrEmail = individual.emailAddress || individual.userName;

      const group = users.items.find((u) => u.type === TaskUserType.DirectoryGroup);
      if (!group) {
        throw new Error('No DirectoryGroup in the folder to test group assignment');
      }
      groupId = group.id;

      // One reusable External task; unassigned between cases so each assign
      // starts from a clean state. Tasks have no delete API, so cleanup only
      // unassigns — register it for the shared teardown.
      const created = await tasks.create(
        { title: generateTestResourceName(`CriteriaTask_${mode}`), priority: TaskPriority.Medium },
        folderId,
      );
      criteriaTaskId = created.id;
      registerResource('tasks', { id: criteriaTaskId, folderId });
    });

    it('should assign to a single user by userNameOrEmail', async () => {
      const { tasks } = getServices();

      const result = await tasks.assign({ taskId: criteriaTaskId, userNameOrEmail });

      expect(result.success).toBe(true);

      const task = await tasks.getById(criteriaTaskId, {}, folderId);
      expect(task.assignedToUser).toBeDefined();

      await tasks.unassign(criteriaTaskId);
    });

    it('should assign to a directory group with the AllUsers criteria', async () => {
      const { tasks } = getServices();

      const result = await tasks.assign({
        taskId: criteriaTaskId,
        userId: groupId,
        assignmentCriteria: TaskAssignmentCriteria.AllUsers,
      });

      // Action Center responds 200 with an empty body on a successful assignment
      // and with per-task failure details (errorCode/errorMessage) when an item
      // fails. The SDK maps the empty body to success=true and echoes the request
      // as `data`; a failure would instead surface error items here. Asserting the
      // exact echoed payload proves the response carried no failure details.
      expect(result.success).toBe(true);
      expect(result.data).toEqual([
        { taskId: criteriaTaskId, userId: groupId, assignmentCriteria: TaskAssignmentCriteria.AllUsers },
      ]);

      await tasks.unassign(criteriaTaskId);
    });
  });

  describe('complete', () => {
    it('should complete a task', async () => {
      if (!createdTaskId) {
        throw new Error('No task ID available for testing');
      }

      const { tasks } = getServices();
      const config = getTestConfig();

      const folderId = config.folderId ? Number(config.folderId) : undefined;

      try {
        const users = await tasks.getUsers(folderId!);
        const user = users.items.find((u) => u.type === TaskUserType.DirectoryUser || u.type === TaskUserType.User);
        if (user) {
          await tasks.assign({
            taskId: createdTaskId,
            userId: user.id,
          });
        } else {
          throw new Error('No DirectoryUser available to assign task');
        }

        const result = await tasks.complete({
          taskId: createdTaskId,
          type: TaskType.External,
          data: {
            completed: true,
            completedAt: new Date().toISOString(),
          },
        }, folderId!);

        expect(result).toBeDefined();
        expect(result.success).toBe(true);

        const task = await tasks.getById(createdTaskId, {}, folderId!);
        expect(task.status).toMatch(/Completed/i);

        createdTaskId = null;
      } catch (error: any) {
        throw new Error(
          `Task completion failed. This may require specific task configuration: ${error.message}`
        );
      }
    });
  });

  describe('Task structure validation', () => {
    it('should have expected fields in task objects', async () => {
      const { tasks } = getServices();
      const config = getTestConfig();

      const folderId = config.folderId ? Number(config.folderId) : undefined;
      const result = await tasks.getAll({
        folderId,
        pageSize: 1,
      });

      if (result.items.length === 0) {
        throw new Error('No tasks available to validate structure');
      }

      const task = result.items[0];

      expect(task).toBeDefined();
      expect(task.id).toBeDefined();
      expect(typeof task.id).toBe('number');

      if (task.title) {
        expect(typeof task.title).toBe('string');
      }

      if (task.status) {
        expect(typeof task.status).toBe('string');
      }
    });
  });

  afterAll(async () => {
    const config = getTestConfig();
    if (!config.skipCleanup && createdTaskId) {
      await cleanupTestTask(createdTaskId);
    }
  });
}, 120000);
