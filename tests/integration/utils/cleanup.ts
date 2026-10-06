import { getServices } from '../config/unified-setup';
import { retryWithBackoff } from './helpers';
import { isNetworkError, isNotFoundError, isRateLimitError, isServerError } from '../../../src/core/errors';

/**
 * Registry to track created resources for emergency cleanup.
 * Note: The SDK exposes no bucket/queue/asset entity deletion, but bucket
 * files can be deleted, so they are tracked here alongside other deletable
 * resources.
 */
interface ResourceRegistry {
  tasks: Array<{ id: number; folderId?: number }>;
  entityRecords: Array<{ entityId: string; recordIds: string[] }>;
  processInstances: Array<{ id: string; folderKey?: string }>;
  caseInstances: Array<{ id: string; folderKey?: string }>;
  feedbackEntries: Array<{ id: string; folderKey?: string }>;
  feedbackCategories: Array<{ id: string }>;
  bucketFiles: Array<{ bucketId: number; path: string; folderId?: number }>;
  businessApps: Array<{ id: string }>;
  roles: Array<{ id: string }>;
  roleAssignments: Array<{ id: string }>;
}

function createEmptyRegistry(): ResourceRegistry {
  return {
  tasks: [],
  entityRecords: [],
  processInstances: [],
  caseInstances: [],
  feedbackEntries: [],
  feedbackCategories: [],
  bucketFiles: [],
  businessApps: [],
  roles: [],
  roleAssignments: [],
  };
}

let resourceRegistry = createEmptyRegistry();

/**
 * Registers a resource for potential emergency cleanup.
 */
export function registerResource<K extends keyof ResourceRegistry>(
  type: K,
  resource: ResourceRegistry[K][number]
): void {
  (resourceRegistry[type] as Array<ResourceRegistry[K][number]>).push(resource);
}

/**
 * Removes a resource from the registry once a test has deleted it itself, so the
 * emergency cleanup does not try again.
 */
export function unregisterResource<K extends keyof ResourceRegistry>(
  type: K,
  matches: (resource: ResourceRegistry[K][number]) => boolean
): void {
  const entries = resourceRegistry[type] as Array<ResourceRegistry[K][number]>;
  for (let i = entries.length - 1; i >= 0; i--) {
    if (matches(entries[i])) entries.splice(i, 1);
  }
}

/** Whether anything is waiting to be cleaned up. */
function hasRegisteredResources(): boolean {
  return Object.values(resourceRegistry).some((entries) => entries.length > 0);
}

/**
 * Empties the registry and hands back what it held. The sweep takes its work this
 * way, before its first await, so a sweep that outlives its hook timeout can
 * neither delete nor discard what the next suite registers in the meantime.
 */
function takeRegisteredResources(): ResourceRegistry {
  const taken = resourceRegistry;
  resourceRegistry = createEmptyRegistry();
  return taken;
}

const CLEANUP_MAX_RETRIES = 3;
const CLEANUP_INITIAL_DELAY_MS = 1000;

/** A 4xx answer will not change on the next attempt — only these are worth retrying. */
function isTransientError(error: unknown): boolean {
  return isNetworkError(error) || isServerError(error) || isRateLimitError(error);
}

/**
 * Runs a delete, retrying only transient failures and treating "not found" as
 * already gone: a stale registration costs one request, never the full backoff.
 *
 * @returns `true` when the call removed something, `false` when it was already gone
 */
async function attemptDelete(remove: () => Promise<unknown>): Promise<boolean> {
  return retryWithBackoff(
    async () => {
      try {
        await remove();
        return true;
      } catch (error) {
        if (isNotFoundError(error)) return false;
        throw error;
      }
    },
    CLEANUP_MAX_RETRIES,
    CLEANUP_INITIAL_DELAY_MS,
    isTransientError
  );
}

/**
 * Cancels or unassigns a test task.
 * Note: The SDK does not have a delete method for tasks.
 *
 * @param taskId - ID of the task to cleanup
 * @param _folderId - Optional folder ID
 */
export async function cleanupTestTask(
  taskId: number,
  _folderId?: number
): Promise<void> {
  try {
    const { tasks } = getServices();
    // Tasks might need to be unassigned
    await retryWithBackoff(async () => {
      // Attempt to unassign if assigned
      try {
        await tasks.unassign([taskId]);
      } catch {
        // Ignore if already unassigned or can't be unassigned
      }
    });
    console.log(`Cleaned up test task: ${taskId}`);
  } catch (error) {
    console.warn(`Failed to cleanup test task ${taskId}:`, error);
  }
}

/**
 * Deletes test entity records.
 *
 * @param entityId - ID of the entity
 * @param recordIds - Array of record IDs to delete
 */
export async function cleanupTestEntityRecords(
  entityId: string,
  recordIds: string[]
): Promise<void> {
  if (!recordIds || recordIds.length === 0) {
    return;
  }

  try {
    const { entities } = getServices();
    const removed = await attemptDelete(() => entities.deleteRecordsById(entityId, recordIds));
    if (removed) console.log(`Cleaned up ${recordIds.length} test entity records for entity ${entityId}`);
  } catch (error) {
    console.warn(`Failed to cleanup entity records for ${entityId}:`, error);
  }
}

/**
 * Cancels a test process instance.
 *
 * @param instanceId - ID of the process instance
 * @param folderKey - Optional folder key
 */
export async function cleanupTestProcessInstance(
  instanceId: string,
  folderKey?: string
): Promise<void> {
  try {
    const { processInstances } = getServices();
    const removed = await attemptDelete(() => processInstances.cancel(instanceId, folderKey || ''));
    if (removed) console.log(`Cleaned up test process instance: ${instanceId}`);
  } catch (error) {
    console.warn(`Failed to cleanup process instance ${instanceId}:`, error);
  }
}

/**
 * Closes a test case instance.
 *
 * @param caseId - ID of the case instance
 * @param folderKey - Optional folder key
 */
export async function cleanupTestCaseInstance(
  caseId: string,
  folderKey?: string
): Promise<void> {
  try {
    const { caseInstances } = getServices();
    const removed = await attemptDelete(() => caseInstances.close(caseId, folderKey || ''));
    if (removed) console.log(`Cleaned up test case instance: ${caseId}`);
  } catch (error) {
    console.warn(`Failed to cleanup case instance ${caseId}:`, error);
  }
}

/**
 * Deletes a test feedback entry.
 *
 * @param id - ID of the feedback entry
 * @param folderKey - Optional folder key
 */
export async function cleanupTestFeedbackEntry(
  id: string,
  folderKey?: string
): Promise<void> {
  try {
    const { feedback } = getServices();
    if (!feedback) return;
    if (!folderKey) return;
    const removed = await attemptDelete(() => feedback.deleteById(id, { folderKey }));
    if (removed) console.log(`Cleaned up test feedback entry: ${id}`);
  } catch (error) {
    console.warn(`Failed to cleanup feedback entry ${id}:`, error);
  }
}

/**
 * Deletes a test file from a bucket.
 *
 * @param bucketId - ID of the bucket containing the file
 * @param path - Path of the file within the bucket
 * @param folderId - Optional Orchestrator folder ID
 */
export async function cleanupTestBucketFile(
  bucketId: number,
  path: string,
  folderId?: number
): Promise<void> {
  try {
    const { buckets } = getServices();
    const removed = await attemptDelete(() =>
      buckets.deleteFile(bucketId, path, folderId !== undefined ? { folderId } : undefined)
    );
    if (removed) console.log(`Cleaned up test bucket file: ${path} (bucket ${bucketId})`);
  } catch (error) {
    console.warn(`Failed to cleanup bucket file ${path} in bucket ${bucketId}:`, error);
  }
}

/**
 * Deletes a test feedback category.
 *
 * @param id - ID of the feedback category
 */
export async function cleanupTestFeedbackCategory(id: string): Promise<void> {
  try {
    const { feedback } = getServices();
    if (!feedback) return;
    const removed = await attemptDelete(() => feedback.deleteCategory(id));
    if (removed) console.log(`Cleaned up test feedback category: ${id}`);
  } catch (error) {
    console.warn(`Failed to cleanup feedback category ${id}:`, error);
  }
}

/**
 * Deletes a test business app.
 *
 * @param id - GUID of the business app
 */
export async function cleanupTestBusinessApp(id: string): Promise<void> {
  try {
    const { businessApps } = getServices();
    if (!businessApps) return;
    const removed = await attemptDelete(() => businessApps.deleteById(id));
    if (removed) console.log(`Cleaned up test business app: ${id}`);
  } catch (error) {
    console.warn(`Failed to cleanup business app ${id}:`, error);
  }
}

/**
 * Revokes a test role assignment.
 *
 * @param id - GUID of the role assignment
 */
export async function cleanupTestRoleAssignment(id: string): Promise<void> {
  try {
    const { platformRoles } = getServices();
    if (!platformRoles) return;
    const removed = await attemptDelete(() => platformRoles.updateAssignments({ toDelete: [id] }));
    if (removed) console.log(`Cleaned up test role assignment: ${id}`);
  } catch (error) {
    console.warn(`Failed to cleanup role assignment ${id}:`, error);
  }
}

/**
 * Deletes a test custom role.
 *
 * @param id - GUID of the role
 */
export async function cleanupTestRole(id: string): Promise<void> {
  try {
    const { platformRoles } = getServices();
    if (!platformRoles) return;
    const removed = await attemptDelete(() => platformRoles.deleteById(id));
    if (removed) console.log(`Cleaned up test role: ${id}`);
  } catch (error) {
    console.warn(`Failed to cleanup role ${id}:`, error);
  }
}

/**
 * Emergency cleanup function that attempts to delete all registered resources.
 * Runs at the end of every suite declared with `describeIntegration`, after the
 * suite's own `afterAll`, so resources a failed or timed-out test left behind are
 * still removed. Each helper swallows and logs its own failure, so one bad delete
 * never stops the rest.
 */
export async function cleanupAllTestResources(): Promise<void> {
  if (!hasRegisteredResources()) return;
  const pending = takeRegisteredResources();
  console.log('Running emergency cleanup for all registered resources...');

  // Cleanup tasks
  for (const task of pending.tasks) {
    await cleanupTestTask(task.id, task.folderId);
  }

  // Cleanup entity records
  for (const entity of pending.entityRecords) {
    await cleanupTestEntityRecords(entity.entityId, entity.recordIds);
  }

  // Cleanup process instances
  for (const instance of pending.processInstances) {
    await cleanupTestProcessInstance(instance.id, instance.folderKey);
  }

  // Cleanup case instances
  for (const caseInstance of pending.caseInstances) {
    await cleanupTestCaseInstance(caseInstance.id, caseInstance.folderKey);
  }

  // Cleanup feedback entries
  for (const entry of pending.feedbackEntries) {
    await cleanupTestFeedbackEntry(entry.id, entry.folderKey);
  }

  // Cleanup feedback categories
  for (const category of pending.feedbackCategories) {
    await cleanupTestFeedbackCategory(category.id);
  }

  // Cleanup bucket files
  for (const file of pending.bucketFiles) {
    await cleanupTestBucketFile(file.bucketId, file.path, file.folderId);
  }

  // Cleanup business apps
  for (const app of pending.businessApps) {
    await cleanupTestBusinessApp(app.id);
  }

  // Revoke role assignments before deleting the roles they point at
  for (const assignment of pending.roleAssignments) {
    await cleanupTestRoleAssignment(assignment.id);
  }

  // Cleanup custom roles
  for (const role of pending.roles) {
    await cleanupTestRole(role.id);
  }


  console.log('Emergency cleanup completed');
}

// Note: The following cleanup functions are not implemented because
// the SDK does not provide delete methods for these services:
// - cleanupTestQueue: sdk.queues has no delete method (read-only)
// - cleanupTestAsset: sdk.assets has no delete method (read-only)
// - cleanupTestBucket: sdk.buckets exposes no method to delete the bucket
//   entity itself. Files within a bucket can be cleaned up via
//   cleanupTestBucketFile.
// - cleanupTestChoiceSet: sdk.choiceSets has no delete method (read-only)
//
// These resources must be managed through the UiPath UI or other APIs.
