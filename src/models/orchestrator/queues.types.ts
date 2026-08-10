import { BaseOptions, RequestOptions } from '../common/types';
import { PaginationOptions } from '../../utils/pagination';

/**
 * Raw queue shape returned by the API, before bound methods are attached.
 */
export interface RawQueueGetResponse {
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
  /** Processing failed (see `processingError`) */
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
 * Value allowed in a queue item payload. Payloads are flat — every value is
 * a simple scalar (`Date` values are serialized to ISO-8601 strings); nested
 * objects and arrays are rejected.
 */
export type QueueItemValue = string | number | boolean | Date | null | undefined;

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
 * Review status of a failed queue item.
 */
export enum QueueItemReviewStatus {
  /** The item is not under review */
  None = 'None',
  /** The item is being reviewed */
  InReview = 'InReview',
  /** The failure was reviewed and confirmed */
  Verified = 'Verified',
  /** The item was re-queued for another attempt after review */
  Retried = 'Retried'
}

/**
 * Category of a queue processing failure.
 */
export enum QueueExceptionType {
  /** A transient system error — the item is eligible for retry */
  ApplicationException = 'ApplicationException',
  /** The item's data cannot be processed — the item is not retried */
  BusinessException = 'BusinessException'
}

/**
 * Failure details recorded when a transaction completes unsuccessfully.
 */
export interface QueueItemProcessingError {
  /**
   * Short reason for the failure (e.g. "Vendor not found").
   */
  reason: string;
  /**
   * Additional details describing the failure.
   */
  details?: string;
  /**
   * Failure category — see {@link QueueExceptionType}.
   */
  type?: QueueExceptionType;
  /**
   * Optional path to a screenshot or image associated with the failure.
   */
  associatedImageFilePath?: string;
  /**
   * Timestamp when the failure was recorded. Present on responses.
   */
  createdTime?: string;
}

/**
 * A queue work item.
 */
export interface QueueItem {
  /** Queue item identifier */
  id: number;
  /** Queue item key (GUID) */
  key: string;
  /** Current processing status */
  status: QueueItemStatus;
  /** Review status for failed items */
  reviewStatus: QueueItemReviewStatus;
  /** Processing priority */
  priority: QueuePriority;
  /** Identifier of the queue that owns the item */
  queueId: number;
  /**
   * The item's business payload. Keys are user-defined and are returned
   * exactly as stored — the SDK performs no case conversion on them.
   */
  specificData: Record<string, unknown> | null;
  /**
   * Output payload written back when the item completed. Keys are
   * user-defined and returned exactly as stored.
   */
  outputData: Record<string, unknown> | null;
  /** Failure details when the item failed processing */
  processingError: QueueItemProcessingError | null;
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
  processingStartTime: string | null;
  /** Timestamp when processing ended */
  processingEndTime: string | null;
  /** Number of times the item has been retried */
  retryNumber: number;
  /** Folder identifier the item belongs to */
  folderId: number;
  /** Folder display path — populated when listing items; `null` on insert responses */
  folderName: string | null;
}
