import { RequestOptions } from '../common/common-types';

/**
 * Interface for queue definition response
 */
export interface QueueDefinitionDto {
  key: string;
  name: string;
  description?: string;
  maxNumberOfRetries?: number;
  acceptAutomaticallyRetry?: boolean;
  retryAbandonedItems?: boolean;
  enforceUniqueReference?: boolean;
  encrypted?: boolean;
  specificDataJsonSchema?: string;
  outputDataJsonSchema?: string;
  analyticsDataJsonSchema?: string;
  creationTime?: string;
  processScheduleId?: number;
  slaInMinutes?: number;
  riskSlaInMinutes?: number;
  releaseId?: number;
  isProcessInCurrentFolder?: boolean;
  foldersCount?: number;
  organizationUnitId?: number;
  organizationUnitFullyQualifiedName?: string;
  id: number;
}

/**
 * Interface for queue get all options
 */
export interface QueueGetAllOptions extends RequestOptions {
  mandatoryPermissions?: string[];
  atLeastOnePermissions?: string[];
}

/**
 * Wrapper for QueueDefinitionDto collection response
 */
export interface QueueDefinitionCollection {
  value: QueueDefinitionDto[];
}

/**
 * Queue service model interface
 */
export interface QueueServiceModel {
  /**
   * Gets all queues with optional query parameters
   * 
   * @param options - Query options
   * @param folderId - Optional folder ID
   * @returns Promise resolving to an array of queues
   */
  getAll(options?: QueueGetAllOptions, folderId?: number): Promise<QueueDefinitionDto[]>;

  /**
   * Gets a single queue by ID
   * 
   * @param id - Queue ID
   * @param folderId - Optional folder ID
   * @returns Promise resolving to a queue definition
   */
  getById(id: number, folderId?: number): Promise<QueueDefinitionDto>;
}
