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
export type QueueItemQueryOptions = RequestOptions & PaginationOptions;

/**
 * Optional settings for inserting a queue item.
 */
export type QueueItemInsertOptions = {
  priority?: 'High' | 'Normal' | 'Low';
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
  priority?: 'High' | 'Normal' | 'Low';
  name?: string;
  content: Record<string, any>;
  reference?: string;
  dueDate?: string;
  deferDate?: string;
  riskSlaDate?: string;
  progress?: string;
}

/**
 * Queue item response shape (SDK surface).
 */
export interface QueueItemResponse {
  id: number;
  key: string;
  status: string;
  priority: string;
  queueId: number;
  processingException: any;
  content: Record<string, any>;
  output: any;
  progress: string;
  reference: string;
  createdTime: string;
  folderId?: number;
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
  content?: Record<string, any>;
  deferDate?: string;
  dueDate?: string;
  reference?: string;
  referenceFilterOption?: string;
  parentOperationId?: string;
}

/**
 * Transaction result payload shape (SDK surface).
 */
export interface TransactionResult {
  isSuccessful?: boolean;
  processingException?: {
    reason: string;
    details?: string;
    type?: string;
    associatedImageFilePath?: string;
    creationTime?: string;
  };
  deferDate?: string;
  dueDate?: string;
  output?: Record<string, any>;
  analytics?: Record<string, any>;
  progress?: string;
  operationId?: string;
}
