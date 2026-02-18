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
}

/**
 * Interface for Queue Item Payload (Request)
 */
export interface QueueItemPayload {
  itemData: {
    Priority?: 'High' | 'Normal' | 'Low';
    Name?: string;
    SpecificContent: Record<string, any>;
    Reference?: string;
    DueDate?: string;
    DeferDate?: string;
    RiskSlaDate?: string;
    Progress?: string;
  }
}

/**
 * Interface for Queue Item (Response)
 */
export interface QueueItem {
  id: number;
  key: string;
  status: string;
  priority: string;
  queueId: number;
  processingException: any;
  specificContent: Record<string, any>;
  output: any;
  progress: string;
  reference: string;
  createdTime: string;
  folderId?: number;
}

export type QueueGetByIdOptions = BaseOptions

/**
 * Interface for Transaction Item (Processed Queue Item)
 */
export interface TransactionItem extends QueueItem {
  // Inherits from QueueItem but might have specific runtime fields
}

/**
 * Interface for starting a transaction
 */
export interface StartTransactionPayload {
  transactionData: {
    Name: string;
    RobotIdentifier?: string;
    SpecificContent?: Record<string, any>;
    DeferDate?: string;
    DueDate?: string;
    Reference?: string;
    ReferenceFilterOption?: string;
    ParentOperationId?: string;
  };
}

/**
 * Interface for setting transaction result
 */
export interface TransactionResultPayload {
  transactionResult: {
    IsSuccessful?: boolean;
    ProcessingException?: {
      Reason: string;
      Details?: string;
      Type?: string;
      AssociatedImageFilePath?: string;
      CreationTime?: string;
    };
    DeferDate?: string;
    DueDate?: string;
    Output?: Record<string, any>;
    Analytics?: Record<string, any>;
    Progress?: string;
    OperationId?: string;
  }
}
