import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  getServices,
  getTestConfig,
  setupUnifiedTests,
  cleanupTestTask,
  InitMode,
} from '../../config/unified-setup';
import { registerResource } from '../../utils/cleanup';
import { generateTestResourceName, generateRandomString } from '../../utils/helpers';
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
        if (!config.tasksTestUserId) {
          throw new Error('TASKS_TEST_USER_ID is required in the test config for single-user assignment');
        }
        const userId = Number(config.tasksTestUserId);

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
          if (!config.tasksTestUserId) {
            throw new Error('TASKS_TEST_USER_ID is required in the test config for single-user assignment');
          }
          const userId = Number(config.tasksTestUserId);

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

      if (!config.tasksTestUserGroupId) {
        throw new Error('TASKS_TEST_USER_GROUP_ID is required in the test config for group assignment-criteria tests');
      }
      groupId = Number(config.tasksTestUserGroupId);

      if (!config.tasksTestUserId) {
        throw new Error('TASKS_TEST_USER_ID is required in the test config for single-user assignment-criteria tests');
      }

      const users = await tasks.getUsers(folderId);

      // Resolve the configured user's name/email for the userNameOrEmail path.
      const configuredUser = users.items.find((u) => u.id === Number(config.tasksTestUserId));
      if (!configuredUser) {
        throw new Error(
          `TASKS_TEST_USER_ID (${config.tasksTestUserId}) is not a user with task permissions in folder ${folderId}`,
        );
      }
      userNameOrEmail = configuredUser.emailAddress || configuredUser.userName;

      // Fail fast with a clear message if the configured group isn't an
      // assignable directory group in this folder — otherwise the group
      // assignment below fails opaquely as success=false.
      const configuredGroup = users.items.find(
        (u) => u.type === TaskUserType.DirectoryGroup && u.id === groupId,
      );
      if (!configuredGroup) {
        throw new Error(
          `TASKS_TEST_USER_GROUP_ID (${groupId}) is not a directory group with task permissions in folder ${folderId}`,
        );
      }

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

      // On failure, result.data holds Action Center's per-item error details — surface them.
      expect(result.success, `assign by userNameOrEmail failed: ${JSON.stringify(result.data)}`).toBe(true);

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
      // On failure, result.data holds Action Center's per-item error details — surface them.
      expect(result.success, `group assign failed: ${JSON.stringify(result.data)}`).toBe(true);
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

describe.each(['v1'] as InitMode[])('Action Center Tasks (extended) - Integration Tests [%s]', (mode) => {
  setupUnifiedTests(mode);

  let folderId: number;
  let folderKey: string;
  let folderPath: string;
  let taskId: number;
  let taskKey: string;

  beforeAll(async () => {
    const config = getTestConfig();
    if (!config.folderId || !config.folderKey || !config.folderPath) {
      throw new Error('INTEGRATION_TEST_FOLDER_ID, INTEGRATION_TEST_FOLDER_KEY and INTEGRATION_TEST_FOLDER_PATH must all be configured to run tasks-extended integration tests');
    }
    folderId = Number(config.folderId);
    folderKey = config.folderKey;
    folderPath = config.folderPath;

    const { tasks } = getServices();
    const created = await tasks.create({ title: `sdk-it-ext-${generateRandomString(8)}` }, folderId);
    taskId = created.id;
    taskKey = created.key;
    registerResource('tasks', { id: taskId, folderId });
  });

  describe('getDataById', () => {
    it('should get a task\'s data with transformed fields (folder by id)', async () => {
      const { tasks } = getServices();

      const result = await tasks.getDataById(taskId, { folderId });

      expect(result.id).toBe(taskId);
      expect(result.status).toBeDefined();
      expect(typeof result.status).toBe('string'); // numeric code mapped to enum
      expect(result.folderId).toBe(folderId);
      expect((result as any).OrganizationUnitId).toBeUndefined();
      expect(result.createdTime).toBeDefined();
      expect((result as any).CreationTime).toBeUndefined();
    });

    it('should get a task\'s data addressing the folder by key', async () => {
      const { tasks } = getServices();

      const result = await tasks.getDataById(taskId, { folderKey });

      expect(result.id).toBe(taskId);
    });

    it('should get a task\'s data addressing the folder by path', async () => {
      const { tasks } = getServices();

      const result = await tasks.getDataById(taskId, { folderPath });

      expect(result.id).toBe(taskId);
    });
  });

  describe('getDataByKey', () => {
    it('should get a task\'s data by key with transformed fields', async () => {
      const { tasks } = getServices();

      const result = await tasks.getDataByKey(taskKey, { folderId });

      expect(result.id).toBe(taskId);
      expect(result.key).toBe(taskKey);
      expect(result.folderId).toBe(folderId);
      expect((result as any).CreationTime).toBeUndefined();
      expect(result.createdTime).toBeDefined();
    });
  });

  describe('saveData', () => {
    it('should save task data (folder by key) and surface it via getDataById, preserving key casing', async () => {
      const { tasks } = getServices();
      const marker = `note-${generateRandomString(6)}`;

      // Include a PascalCase key to verify getDataById does not case-convert the user payload.
      const result = await tasks.saveData(taskId, { InvoiceNumber: marker, note: marker }, { folderKey });
      expect(result).toBeUndefined();

      const after = await tasks.getDataById(taskId, { folderId });
      expect((after.data as any)?.InvoiceNumber).toBe(marker);
      expect((after.data as any)?.note).toBe(marker);
    });
  });

  describe('saveTags', () => {
    it('should save tags and surface them via getData', async () => {
      const { tasks } = getServices();
      const tagName = `sdkit${generateRandomString(6)}`;

      const result = await tasks.saveTags(
        taskId,
        [{ name: tagName, displayName: tagName, displayValue: 'yes' }],
        { folderId },
      );
      expect(result).toBeUndefined();

      const after = await tasks.getDataById(taskId, { folderId });
      expect(after.tags?.some((t) => t.name === tagName)).toBe(true);
    });
  });

  describe('editMetadata', () => {
    it('should edit the task title (folder by path) and surface it via getDataById', async () => {
      const { tasks } = getServices();
      const newTitle = `sdk-it-edited-${generateRandomString(6)}`;

      const result = await tasks.editMetadata(taskId, { title: newTitle, priority: TaskPriority.High, folderPath });
      expect(result).toBeUndefined();

      const after = await tasks.getDataById(taskId, { folderId });
      expect(after.title).toBe(newTitle);
    });
  });
});

describe.each(['v1'] as InitMode[])('Action Center Task Comments - Integration Tests [%s]', (mode) => {
  setupUnifiedTests(mode);

  let folderId: number;
  let folderKey: string;
  let folderPath: string;
  let taskId: number;

  beforeAll(async () => {
    const config = getTestConfig();
    if (!config.folderId || !config.folderKey || !config.folderPath) {
      throw new Error('INTEGRATION_TEST_FOLDER_ID, INTEGRATION_TEST_FOLDER_KEY and INTEGRATION_TEST_FOLDER_PATH must all be configured to run Task Notes integration tests');
    }
    folderId = Number(config.folderId);
    folderKey = config.folderKey;
    folderPath = config.folderPath;

    // Create a fresh task to attach comments to, so the suite doesn't depend on
    // whatever getAll returns first (which can be a completed/deleted task).
    const { tasks } = getServices();
    const created = await tasks.create({ title: `sdk-it-notes-${generateRandomString(8)}` }, folderId);
    taskId = created.id;
    registerResource('tasks', { id: taskId, folderId });
  });

  describe('getComments', () => {
    it('should list comments for a task addressing the folder by id', async () => {
      const { tasks } = getServices();

      const result = await tasks.getComments(taskId, { folderId, pageSize: 50 });

      expect(result).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
    });

    it('should list comments addressing the folder by key', async () => {
      const { tasks } = getServices();

      const result = await tasks.getComments(taskId, { folderKey, pageSize: 50 });

      expect(Array.isArray(result.items)).toBe(true);
    });

    it('should list comments addressing the folder by path', async () => {
      const { tasks } = getServices();

      const result = await tasks.getComments(taskId, { folderPath, pageSize: 50 });

      expect(Array.isArray(result.items)).toBe(true);
    });

    it('should surface comment items with camelCase fields and no PascalCase leaks', async () => {
      const { tasks } = getServices();
      const text = `sdk-it-transform-${generateRandomString(6)}`;
      await tasks.createComment(taskId, text, { folderId });

      const result = await tasks.getComments(taskId, { folderId, pageSize: 100 });
      const comment = result.items.find((c) => c.text === text);
      if (!comment) throw new Error('Created comment not found in getComments list');

      expect(comment.createdTime).toBeDefined();
      expect((comment as any).CreationTime).toBeUndefined();
      expect(comment.folderId).toBe(folderId);
      expect((comment as any).OrganizationUnitId).toBeUndefined();
      expect(comment.taskId).toBe(taskId);
    });
  });

  describe('createComment', () => {
    it('should create a comment on a task and surface it in the list', async () => {
      const { tasks } = getServices();
      const text = `sdk-it note ${generateRandomString(8)}`;

      const created = await tasks.createComment(taskId, text, { folderId });

      expect(created.id).toBeGreaterThan(0);
      expect(created.text).toBe(text);
      expect(created.taskId).toBe(taskId);
      expect(created.createdTime).toBeDefined();
      expect((created as any).CreationTime).toBeUndefined();
      expect((created as any).OrganizationUnitId).toBeUndefined();

      const comments = await tasks.getComments(taskId, { folderId, pageSize: 100 });
      expect(comments.items.some((n) => n.text === text)).toBe(true);
    });
  });
});
