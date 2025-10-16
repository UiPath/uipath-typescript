/**
 * Tasks service mock utilities - Tasks-specific mocks only
 * Uses generic utilities from core.ts for base functionality
 */

import { TaskType, TaskPriority, TaskStatus, RawTaskGetResponse } from '../../../src/models/action-center/tasks.types';
import { createMockBaseResponse, createMockCollection } from './core';
import { TASK_TEST_CONSTANTS } from '../constants/tasks';
import { TEST_CONSTANTS } from '../constants/common';

// Task-Specific Mock Factories

/**
 * Creates a mock Task response for create/update operations
 * @param overrides - Optional overrides for specific fields
 * @returns Mock Task response object
 */
export const createMockTaskResponse = (overrides: Partial<any> = {}) => {
  return createMockBaseResponse({
    id: TASK_TEST_CONSTANTS.TASK_ID,
    title: TASK_TEST_CONSTANTS.TASK_TITLE,
    type: TaskType.External,
    priority: TaskPriority.Medium,
    status: TaskStatus.Unassigned,
    organizationUnitId: TEST_CONSTANTS.FOLDER_ID,
    key: TASK_TEST_CONSTANTS.TASK_KEY,
    isDeleted: false,
    creationTime: TASK_TEST_CONSTANTS.CREATION_TIME,
    action: null,
    externalTag: null,
    lastAssignedTime: null,
    completionTime: null,
    parentOperationId: null,
    deleterUserId: null,
    deletionTime: null,
    lastModificationTime: null,
    waitJobState: null,
    assignedToUser: null,
    taskSlaDetails: null,
    completedByUser: null,
    taskAssignees: null,
    processingTime: null,
    data: null,
  }, overrides);
};

/**
 * Creates a mock Task GET response
 * @param overrides - Optional overrides for specific fields
 * @returns Mock Task GET response object
 */
export const createMockTaskGetResponse = (overrides: Partial<any> = {}) => {
  return createMockBaseResponse({
    id: TASK_TEST_CONSTANTS.TASK_ID,
    title: TASK_TEST_CONSTANTS.TASK_TITLE,
    type: TaskType.External,
    priority: TaskPriority.Medium,
    status: TaskStatus.Unassigned,
    organizationUnitId: TEST_CONSTANTS.FOLDER_ID,
    key: TASK_TEST_CONSTANTS.TASK_KEY,
    isDeleted: false,
    creationTime: TASK_TEST_CONSTANTS.CREATION_TIME,
    action: null,
    externalTag: null,
    lastAssignedTime: null,
    completionTime: null,
    parentOperationId: null,
    deleterUserId: null,
    deletionTime: null,
    lastModificationTime: null,
    isCompleted: false,
    encrypted: false,
    bulkFormLayoutId: null,
    formLayoutId: null,
    taskSlaDetail: null,
    taskAssigneeName: null,
    lastModifierUserId: null,
    assignedToUser: null,
  }, overrides);
};

/**
 * Creates a basic task for model tests with all required fields
 * @param overrides - Optional overrides for specific fields
 * @returns Basic task response object cast as RawTaskGetResponse
 */
export const createBasicTask = (overrides: Partial<any> = {}): RawTaskGetResponse => {
  return createMockBaseResponse({
    id: TASK_TEST_CONSTANTS.TASK_ID,
    title: TASK_TEST_CONSTANTS.TASK_TITLE,
    type: TaskType.External,
    priority: TaskPriority.Medium,
    status: TaskStatus.Unassigned,
    folderId: TEST_CONSTANTS.FOLDER_ID,
    key: TASK_TEST_CONSTANTS.TASK_KEY,
    isDeleted: false,
    createdTime: TASK_TEST_CONSTANTS.CREATION_TIME,
    action: null,
    externalTag: null,
    lastAssignedTime: null,
    completedTime: null,
    parentOperationId: null,
    deleterUserId: null,
    deletedTime: null,
    lastModifiedTime: null,
    isCompleted: false,
    encrypted: false,
    bulkFormLayoutId: null,
    formLayoutId: null,
    taskSlaDetail: null,
    taskAssigneeName: null,
    lastModifierUserId: null,
    assignedToUser: null,
  }, overrides) as RawTaskGetResponse;
};

/**
 * Creates a collection of mock tasks
 * @param count - Number of tasks to create
 * @returns Array of mock tasks
 */
export const createMockTasks = (count: number) => {
  return createMockCollection(count, (i) => 
    createMockTaskGetResponse({
      id: i + 1,
      title: `Task ${i + 1}`,
      key: `${TASK_TEST_CONSTANTS.TASK_KEY_PREFIX}${i + 1}`,
      status: TaskStatus.Pending,
    })
  );
};

/**
 * Creates a collection of mock users
 * @param count - Number of users to create
 * @returns Array of mock users
 */
export const createMockUsers = (count: number) => {
  return createMockCollection(count, (i) => ({
    id: i + 1,
    name: TASK_TEST_CONSTANTS.USER_NAME,
    surname: `${i + 1}`,
    userName: `${TASK_TEST_CONSTANTS.USER_USERNAME_PREFIX}${i + 1}`,
    emailAddress: `${TASK_TEST_CONSTANTS.USER_USERNAME_PREFIX}${i + 1}@example.com`,
    displayName: `${TASK_TEST_CONSTANTS.USER_DISPLAY_NAME_PREFIX}${i + 1}`,
  }));
};

