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
  priority?: QueuePriority;
  reference?: string;
  dueDate?: string;
  deferDate?: string;
  riskSlaDate?: string;
  progress?: string;
};

/**
 * Queue item request shape (SDK surface).
 */
export interface QueueItemRequest {
  priority?: QueuePriority;
  name?: string;
  content: Record<string, unknown>;
  reference?: string;
  dueDate?: string;
  deferDate?: string;
  riskSlaDate?: string;
  progress?: string;
}

export interface QueueProcessingException {
  reason: string;
  details?: string;
  type?: string;
  associatedImageFilePath?: string;
  creationTime?: string;
}

/**
 * Queue item response shape (SDK surface).
 */
export interface QueueItemResponse {
  id: number;
  key: string;
  status: string;
  priority: QueuePriority;
  queueId: number;
  processingException: QueueProcessingException | null;
  content: Record<string, unknown>;
  specificData: string | null;
  output: Record<string, unknown> | null;
  outputData: string | null;
  progress: string | null;
  reference: string | null;
  createdTime: string;
  folderId?: number;
  folderName?: string;
}

export type QueueGetByIdOptions = BaseOptions;

/**
 * Transaction item response shape (SDK surface).
 */
export interface TransactionItemResponse extends QueueItemResponse {
  // Intentionally extends QueueItemResponse.
}

/**
 * Start transaction request shape (SDK surface).
 */
export interface TransactionRequest {
  name: string;
  content?: Record<string, unknown>;
  deferDate?: string;
  dueDate?: string;
  reference?: string;
  referenceFilterOption?: string;
  parentOperationId?: string;
}

/**
 * Transaction completion payload shape (SDK surface).
 */
export interface TransactionCompletionOptions {
  isSuccessful?: boolean;
  processingException?: QueueProcessingException;
  deferDate?: string;
  dueDate?: string;
  output?: Record<string, unknown>;
  analytics?: Record<string, unknown>;
  progress?: string;
  operationId?: string;
}

/**
 * Transaction completion response shape.
 */
export interface TransactionCompletionResponse {
  success: boolean;
}
