import { BaseOptions, RequestOptions } from '../common/types';
import { PaginationOptions } from '../../utils/pagination';

/**
 * Interface for queue response
 */
export interface QueueGetResponse {
  key: string;
  name: string;
  id: number;
  description: string;
  maxNumberOfRetries: number;
  acceptAutomaticallyRetry: boolean;
  retryAbandonedItems: boolean;
  enforceUniqueReference: boolean;
  encrypted: boolean;
  specificDataJsonSchema: string | null;
  outputDataJsonSchema: string | null;
  analyticsDataJsonSchema: string | null;
  createdTime: string;
  processScheduleId: number | null;
  slaInMinutes: number;
  riskSlaInMinutes: number;
  releaseId: number | null;
  isProcessInCurrentFolder: boolean | null;
  foldersCount: number;
  folderId: number;
  folderName: string;
}

/**
 * Options for getting queues across folders
 */
export type QueueGetAllOptions = RequestOptions & PaginationOptions & {
  /**
   * Optional folder ID to filter queues by folder
   */
  folderId?: number;
}

/**
 * Query options for retrieving queue items.
 * Folder and queue scoping are passed as explicit method arguments.
 */
export type QueueGetAllItemsOptions = RequestOptions & PaginationOptions;

/**
 * Supported queue priority values.
 */
export type QueuePriority = 'High' | 'Normal' | 'Low';

/**
 * Optional settings for inserting a queue item.
 */
export type QueueInsertItemOptions = {
  /**
   * Processing priority used when the item is picked by a consumer.
   */
  priority?: QueuePriority;
  /**
   * User-defined business reference used for traceability and uniqueness rules.
   */
  reference?: string;
  /**
   * Due date timestamp for the queue item.
   */
  dueDate?: string;
  /**
   * Timestamp before which the item should not be processed.
   */
  deferDate?: string;
  /**
   * Risk SLA timestamp for the queue item.
   */
  riskSlaDate?: string;
  /**
   * Free-form progress text stored on the queue item.
   */
  progress?: string;
};

export interface QueueProcessingException {
  /**
   * Short reason code or label for the exception.
   */
  reason: string;
  /**
   * Additional details describing the failure.
   */
  details?: string;
  /**
   * Exception type reported by the runtime.
   */
  type?: string;
  /**
   * Optional image path associated with the exception.
   */
  associatedImageFilePath?: string;
  /**
   * Timestamp when the exception was created.
   */
  creationTime?: string;
}

/**
 * Queue item response shape (SDK surface).
 */
export interface QueueItemResponse {
  /**
   * Queue item identifier.
   */
  id: number;
  /**
   * Queue item key.
   */
  key: string;
  /**
   * Current processing status.
   */
  status: string;
  /**
   * Processing priority for the queue item.
   */
  priority: QueuePriority;
  /**
   * Queue definition identifier that owns the item.
   */
  queueId: number;
  /**
   * Processing exception details when the item failed.
   */
  processingException: QueueProcessingException | null;
  /**
   * Structured business payload stored on the item.
   *
   * Orchestrator names the source field `SpecificContent`. The SDK exposes it
   * as `specificData` to align with UiPath UI terminology while still keeping
   * the payload as a ready-to-use object for SDK consumers.
   */
  specificData: Record<string, unknown>;
  /**
   * Raw JSON string form of the payload as returned by Orchestrator
   * `SpecificData`.
   */
  specificDataJson: string | null;
  /**
   * Structured output payload written back to the item.
   *
   * Orchestrator names the source field `Output`. The SDK exposes it as
   * `outputData` for consistency with `specificData`.
   */
  outputData: Record<string, unknown> | null;
  /**
   * Raw JSON string form of the output payload as returned by Orchestrator
   * `OutputData`.
   */
  outputDataJson: string | null;
  /**
   * Free-form progress text.
   */
  progress: string | null;
  /**
   * User-defined business reference.
   */
  reference: string | null;
  /**
   * Timestamp when the item was created.
   */
  createdTime: string;
  /**
   * Folder identifier that scoped the request.
   */
  folderId?: number;
  /**
   * Folder display path returned by Orchestrator.
   */
  folderName?: string;
}

export type QueueGetByIdOptions = BaseOptions;

/**
 * Transaction item response shape (SDK surface).
 */
export type TransactionItemResponse = QueueItemResponse;

/**
 * Transaction completion payload shape (SDK surface).
 */
export interface TransactionCompletionOptions {
  /**
   * Marks the transaction as successful when true.
   */
  isSuccessful?: boolean;
  /**
   * Failure details recorded when the transaction is unsuccessful.
   */
  processingException?: QueueProcessingException;
  /**
   * Updated defer date for the transaction item.
   */
  deferDate?: string;
  /**
   * Updated due date for the transaction item.
   */
  dueDate?: string;
  /**
   * Structured output payload to persist on the item.
   *
   * This is sent to the Orchestrator `Output` field even though the SDK uses
   * the `outputData` name for consistency with queue item responses.
   */
  outputData?: Record<string, unknown>;
  /**
   * Structured analytics payload to persist on the item.
   */
  analytics?: Record<string, unknown>;
  /**
   * Free-form progress text to persist on the item.
   */
  progress?: string;
  /**
   * Operation identifier associated with the completion.
   */
  operationId?: string;
}

/**
 * Transaction completion response shape.
 */
export interface TransactionCompletionResponse {
  success: boolean;
}
