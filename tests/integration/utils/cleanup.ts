import { getServices } from '../config/unified-setup';
import { retryWithBackoff } from './helpers';

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
}

const resourceRegistry: ResourceRegistry = {
  tasks: [],
  entityRecords: [],
  processInstances: [],
  caseInstances: [],
  feedbackEntries: [],
  feedbackCategories: [],
  bucketFiles: [],
};

/**
 * Registers a resource for potential emergency cleanup.
 */
export function registerResource(
  type: keyof ResourceRegistry,
  resource: any
): void {
  resourceRegistry[type].push(resource);
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
    await retryWithBackoff(async () => {
      await entities.deleteRecordsById(entityId, recordIds);
    });
    console.log(`Cleaned up ${recordIds.length} test entity records for entity ${entityId}`);
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
    await retryWithBackoff(async () => {
      await processInstances.cancel(instanceId, folderKey || '');
    });
    console.log(`Cleaned up test process instance: ${instanceId}`);
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
    await retryWithBackoff(async () => {
      await caseInstances.close(caseId, folderKey || '');
    });
    console.log(`Cleaned up test case instance: ${caseId}`);
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
    await retryWithBackoff(async () => {
      await feedback.deleteById(id, { folderKey });
    });
    console.log(`Cleaned up test feedback entry: ${id}`);
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
    await retryWithBackoff(async () => {
      await buckets.deleteFile(
        bucketId,
        path,
        folderId !== undefined ? { folderId } : undefined
      );
    });
    console.log(`Cleaned up test bucket file: ${path} (bucket ${bucketId})`);
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
    await retryWithBackoff(async () => {
      await feedback.deleteCategory(id);
    });
    console.log(`Cleaned up test feedback category: ${id}`);
  } catch (error) {
    console.warn(`Failed to cleanup feedback category ${id}:`, error);
  }
}

/**
 * Emergency cleanup function that attempts to delete all registered resources.
 * Should be called as a last resort in afterAll hooks.
 */
export async function cleanupAllTestResources(): Promise<void> {
  console.log('Running emergency cleanup for all registered resources...');

  // Cleanup tasks
  for (const task of resourceRegistry.tasks) {
    await cleanupTestTask(task.id, task.folderId);
  }

  // Cleanup entity records
  for (const entity of resourceRegistry.entityRecords) {
    await cleanupTestEntityRecords(entity.entityId, entity.recordIds);
  }

  // Cleanup process instances
  for (const instance of resourceRegistry.processInstances) {
    await cleanupTestProcessInstance(instance.id, instance.folderKey);
  }

  // Cleanup case instances
  for (const caseInstance of resourceRegistry.caseInstances) {
    await cleanupTestCaseInstance(caseInstance.id, caseInstance.folderKey);
  }

  // Cleanup feedback entries
  for (const entry of resourceRegistry.feedbackEntries) {
    await cleanupTestFeedbackEntry(entry.id, entry.folderKey);
  }

  // Cleanup feedback categories
  for (const category of resourceRegistry.feedbackCategories) {
    await cleanupTestFeedbackCategory(category.id);
  }

  // Cleanup bucket files
  for (const file of resourceRegistry.bucketFiles) {
    await cleanupTestBucketFile(file.bucketId, file.path, file.folderId);
  }

  // Clear registry
  resourceRegistry.tasks = [];
  resourceRegistry.entityRecords = [];
  resourceRegistry.processInstances = [];
  resourceRegistry.caseInstances = [];
  resourceRegistry.feedbackEntries = [];
  resourceRegistry.feedbackCategories = [];
  resourceRegistry.bucketFiles = [];

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
