import type { QueueInsertItemOptions, QueueItem, QueueItemValue } from './queues.types';

/**
 * Calls a bound queue object makes against exactly the queue it describes.
 * Runtime overrides redirect name lookups, not a queue the caller already
 * holds, so these skip override resolution.
 */
export interface QueueBoundOperations {
  /**
   * Inserts an item into the given queue as named, in the given folder.
   *
   * @param queue - The queue's resolved name and the id of the folder it lives in
   * @param specificData - The item's business payload (keys are stored exactly as provided)
   * @param options - Item metadata (priority, reference, defer/due dates)
   * @returns Promise resolving to the created {@link QueueItem}
   */
  insertItem(
    queue: { name: string; folderId: number },
    specificData: Record<string, QueueItemValue>,
    options?: Omit<QueueInsertItemOptions, 'folderId' | 'folderKey' | 'folderPath'>
  ): Promise<QueueItem>;
  /**
   * Acquires the next available item from the given queue as named, in the given folder.
   *
   * @param queue - The queue's resolved name and the id of the folder it lives in
   * @returns Promise resolving to the acquired {@link QueueItem}, or `null` when none is available
   */
  startTransaction(queue: { name: string; folderId: number }): Promise<QueueItem | null>;
}
