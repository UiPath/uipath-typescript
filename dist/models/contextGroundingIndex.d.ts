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
export declare const ContextGroundingDataSourceSchema: z.ZodObject<{
    '@odata.type': z.ZodString;
    folder: z.ZodString;
    bucketName: z.ZodString;
    fileNameGlob: z.ZodString;
    directoryPath: z.ZodString;
}, "strip", z.ZodTypeAny, {
    '@odata.type': string;
    folder: string;
    bucketName: string;
    fileNameGlob: string;
    directoryPath: string;
}, {
    '@odata.type': string;
    folder: string;
    bucketName: string;
    fileNameGlob: string;
    directoryPath: string;
}>;
export declare const ContextGroundingIndexSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    dataSource: z.ZodOptional<z.ZodObject<{
        '@odata.type': z.ZodString;
        folder: z.ZodString;
        bucketName: z.ZodString;
        fileNameGlob: z.ZodString;
        directoryPath: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        '@odata.type': string;
        folder: string;
        bucketName: string;
        fileNameGlob: string;
        directoryPath: string;
    }, {
        '@odata.type': string;
        folder: string;
        bucketName: string;
        fileNameGlob: string;
        directoryPath: string;
    }>>;
    status: z.ZodOptional<z.ZodString>;
    lastIngestionTime: z.ZodOptional<z.ZodString>;
    ingestionInProgress: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    name: string;
    status?: string | undefined;
    id?: string | undefined;
    description?: string | undefined;
    dataSource?: {
        '@odata.type': string;
        folder: string;
        bucketName: string;
        fileNameGlob: string;
        directoryPath: string;
    } | undefined;
    lastIngestionTime?: string | undefined;
    ingestionInProgress?: boolean | undefined;
}, {
    name: string;
    status?: string | undefined;
    id?: string | undefined;
    description?: string | undefined;
    dataSource?: {
        '@odata.type': string;
        folder: string;
        bucketName: string;
        fileNameGlob: string;
        directoryPath: string;
    } | undefined;
    lastIngestionTime?: string | undefined;
    ingestionInProgress?: boolean | undefined;
}>;
