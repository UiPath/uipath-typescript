import { describe, it, expect, afterAll } from 'vitest';
import {
  getServices,
  getTestConfig,
  setupUnifiedTests,
  cleanupTestTask,
  InitMode,
} from '../../config/unified-setup';
import { registerResource } from '../../utils/cleanup';
import { generateTestResourceName } from '../../utils/helpers';
import { TaskType } from '../../../../src/models/action-center/tasks.types';

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
      const result = await tasks.getAll({ folderId });

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
        priority: 'Medium' as const,
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
        const result = await tasks.getById(createdTaskId, folderId!);

        expect(result).toBeDefined();
        expect(result.id).toBe(createdTaskId);
        expect(result.title).toBe(testTaskTitle);
      } catch (error: any) {
        throw new Error(`Get task by ID failed: ${error.message}`);
      }
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

        if (users.items.length === 0) {
          throw new Error('No users available to assign task');
        }

        const userId = users.items[0].id;

        const result = await tasks.assign({
          taskId: createdTaskId,
          userId: userId,
        });

        expect(result).toBeDefined();
        expect(result.success).toBe(true);

        const task = await tasks.getById(createdTaskId, folderId!);
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
        let task = await tasks.getById(createdTaskId, folderId!);

        if (task.assignedToUser === null || task.assignedToUser === undefined) {
          const users = await tasks.getUsers(folderId!);

          if (users.items.length === 0) {
            throw new Error('No users available to assign task');
          }

          const userId = users.items[0].id;

          const _result = await tasks.assign({
            taskId: createdTaskId,
            userId: userId,
          });
        }

        const result = await tasks.unassign(createdTaskId);

        expect(result).toBeDefined();
        expect(result.success).toBe(true);

        task = await tasks.getById(createdTaskId, folderId!);
        expect(task.assignedToUser === null || task.assignedToUser === undefined).toBe(true);
      } catch (error: any) {
        throw new Error(`Task unassignment failed: ${error.message}`);
      }
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
        if (users.items.length > 0) {
          const userId = users.items[0].id;
          await tasks.assign({
            taskId: createdTaskId,
            userId: userId,
          });
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

        const task = await tasks.getById(createdTaskId, folderId!);
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
});
