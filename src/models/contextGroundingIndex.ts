import { z } from 'zod';

export interface ContextGroundingField {
  id?: string;
  name?: string;
  description?: string;
  type?: string;
  isFilterable?: boolean;
  searchableType?: string;
  isUserDefined?: boolean;
}

/**
 * Data source configuration for a context grounding index.
 */
export interface ContextGroundingDataSource {
  /** The type of data source */
  '@odata.type': string;
  
  /** The folder where the data is stored */
  folder: string;
  
  /** The name of the storage bucket */
  bucketName: string;
  
  /** Glob pattern for matching files */
  fileNameGlob: string;
  
  /** Base directory path in the bucket */
  directoryPath: string;
}

/**
 * Represents a context grounding index in UiPath.
 */
export interface ContextGroundingIndex {
  /** Unique identifier of the index */
  id?: string;
  
  /** Name of the index */
  name: string;
  
  /** Optional description */
  description?: string;
  
  /** Data source configuration */
  dataSource?: ContextGroundingDataSource;
  
  /** Status of the index */
  status?: string;
  
  /** Last ingestion time */
  lastIngestionTime?: string;
  
  /** Whether ingestion is in progress */
  ingestionInProgress?: boolean;
}

export const ContextGroundingDataSourceSchema = z.object({
  '@odata.type': z.string(),
  folder: z.string(),
  bucketName: z.string(),
  fileNameGlob: z.string(),
  directoryPath: z.string()
});

export const ContextGroundingIndexSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string().optional(),
  dataSource: ContextGroundingDataSourceSchema.optional(),
  status: z.string().optional(),
  lastIngestionTime: z.string().optional(),
  ingestionInProgress: z.boolean().optional()
});