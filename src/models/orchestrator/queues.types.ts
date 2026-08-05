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

export interface QueueGetByIdOptions extends BaseOptions {}

/**
 * Options for retrieving queue items. Queue and folder scoping are passed
 * as explicit method arguments.
 */
export type QueueGetAllItemsOptions = RequestOptions & PaginationOptions;

/**
 * Processing priority of a queue item. Higher-priority items are handed out
 * to consumers first.
 */
export enum QueuePriority {
  High = 'High',
  Normal = 'Normal',
  Low = 'Low'
}

/**
 * Processing status of a queue item.
 */
export enum QueueItemStatus {
  /** Waiting to be processed */
  New = 'New',
  /** Handed out to a consumer and locked (an active transaction) */
  InProgress = 'InProgress',
  /** Processing failed (see `processingException`) */
  Failed = 'Failed',
  /** Processing completed successfully */
  Successful = 'Successful',
  /** The consumer stopped reporting while processing the item */
  Abandoned = 'Abandoned',
  /** A failed item that was re-queued as a fresh copy */
  Retried = 'Retried',
  /** The item was deleted */
  Deleted = 'Deleted'
}

/**
 * Optional settings for inserting a queue item.
 */
export interface QueueInsertItemOptions {
  /**
   * Processing priority used when the item is picked up by a consumer.
   * Defaults to {@link QueuePriority.Normal}.
   */
  priority?: QueuePriority;
  /**
   * User-defined business identifier for the item (e.g. an invoice number).
   * Used for searching/filtering items and, when the queue has
   * `enforceUniqueReference` enabled, for rejecting duplicate items.
   */
  reference?: string;
  /**
   * The item is hidden from consumers until this time — processing does not
   * start before it.
   */
  deferDate?: Date;
  /**
   * The time by which the item should be processed (drives queue SLA
   * tracking).
   */
  dueDate?: Date;
  /**
   * The time after which unprocessed items are considered at risk of
   * breaching the SLA.
   */
  riskSlaDate?: Date;
  /**
   * Free-form progress text stored on the queue item.
   */
  progress?: string;
}

/**
 * Failure details recorded when a transaction completes unsuccessfully.
 */
export interface QueueProcessingException {
  /**
   * Short reason for the failure (e.g. "Vendor not found").
   */
  reason: string;
  /**
   * Additional details describing the failure.
   */
  details?: string;
  /**
   * Exception category. Orchestrator distinguishes `BusinessException`
   * (the item's data cannot be processed — not retried) from
   * `ApplicationException` (a transient system error — eligible for retry).
   */
  type?: string;
  /**
   * Optional path to a screenshot or image associated with the failure.
   */
  associatedImageFilePath?: string;
  /**
   * Timestamp when the exception was recorded. Set by Orchestrator on
   * responses.
   */
  creationTime?: string;
}

/**
 * Queue item response shape.
 */
export interface QueueItemResponse {
  /** Queue item identifier */
  id: number;
  /** Queue item key (GUID) */
  key: string;
  /** Current processing status */
  status: QueueItemStatus;
  /** Review status for failed items */
  reviewStatus: string;
  /** Processing priority */
  priority: QueuePriority;
  /** Identifier of the queue that owns the item */
  queueId: number;
  /**
   * The item's business payload as a ready-to-use object.
   *
   * Orchestrator names the source field `SpecificContent`. Its keys are
   * user-defined and are returned exactly as stored — the SDK performs no
   * case conversion on them.
   */
  specificData: Record<string, unknown> | null;
  /**
   * Raw JSON-string form of the payload as returned by Orchestrator
   * (`SpecificData` on the wire).
   */
  specificDataJson: string | null;
  /**
   * Output payload written back when the item completed, as an object.
   * Keys are user-defined and returned exactly as stored.
   */
  outputData: Record<string, unknown> | null;
  /**
   * Raw JSON-string form of the output payload (`OutputData` on the wire).
   */
  outputDataJson: string | null;
  /** Failure details when the item failed processing */
  processingException: QueueProcessingException | null;
  /** Free-form progress text */
  progress: string | null;
  /** User-defined business identifier */
  reference: string | null;
  /** Timestamp when the item was created */
  createdTime: string;
  /** The item is hidden from consumers before this time */
  deferDate: string | null;
  /** The time by which the item should be processed */
  dueDate: string | null;
  /** The time after which the item is at risk of breaching the SLA */
  riskSlaDate: string | null;
  /** Timestamp when processing started (set once a transaction begins) */
  startProcessing: string | null;
  /** Timestamp when processing ended */
  endProcessing: string | null;
  /** Number of times the item has been retried */
  retryNumber: number;
  /** Folder identifier the item belongs to */
  folderId?: number;
  /** Folder display path returned by Orchestrator */
  folderName?: string;
}
