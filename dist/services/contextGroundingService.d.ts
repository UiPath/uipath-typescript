import { Config } from '../config';
import { ExecutionContext } from '../executionContext';
import { BaseService } from './baseService';
import { BucketsService } from './bucketsService';
import { ContextGroundingIndex } from '../models/contextGroundingIndex';
import { ContextGroundingQueryResponse } from '../models/contextGrounding';
import { FolderService } from './folderService';
/**
 * Service for managing semantic automation contexts in UiPath.
 *
 * Context Grounding is a feature that helps in understanding and managing the
 * semantic context in which automation processes operate. It provides capabilities
 * for indexing, retrieving, and searching through contextual information that
 * can be used to enhance AI-enabled automation.
 */
export declare class ContextGroundingService extends BaseService {
    private readonly foldersService;
    private readonly bucketsService;
    private readonly folderContext;
    constructor(config: Config, executionContext: ExecutionContext, foldersService: FolderService, bucketsService: BucketsService);
    /**
     * Create a new context grounding index.
     *
     * @param name - The name of the index to create
     * @param storageBucketName - The name of the storage bucket to use
     * @param options - Optional parameters for index creation
     * @returns The created index
     */
    create(name: string, storageBucketName: string, options?: {
        description?: string;
        fileNameGlob?: string;
        storageBucketFolderPath?: string;
        folderKey?: string;
        folderPath?: string;
    }): Promise<ContextGroundingIndex>;
    /**
     * Add content to the index.
     *
     * @param name - The name of the index to add content to
     * @param contentType - The type of content being added
     * @param blobFilePath - The path where the blob will be stored in the storage bucket
     * @param content - The content to be added, either as a string or Buffer
     * @param sourcePath - The source path of the content if it is being uploaded from a file
     * @param options - Optional folder parameters
     */
    addToIndex(name: string, contentType: string, blobFilePath: string, content?: string | Buffer, sourcePath?: string, options?: {
        folderKey?: string;
        folderPath?: string;
    }): Promise<void>;
    /**
     * Retrieve context grounding index information by its name.
     *
     * @param name - The name of the context index to retrieve
     * @param options - Optional folder parameters
     * @returns The index information
     */
    retrieve(name: string, options?: {
        folderKey?: string;
        folderPath?: string;
    }): Promise<ContextGroundingIndex>;
    /**
     * Search for contextual information within a specific index.
     *
     * @param name - The name of the context index to search in
     * @param query - The search query in natural language
     * @param numberOfResults - Maximum number of results to return
     * @param options - Optional folder parameters
     * @returns A list of search results
     */
    search(name: string, query: string, numberOfResults?: number, options?: {
        folderKey?: string;
        folderPath?: string;
    }): Promise<ContextGroundingQueryResponse[]>;
    /**
     * Ingest data into the context grounding index.
     *
     * @param index - The context grounding index to perform data ingestion
     * @param options - Optional folder parameters
     */
    ingestData(index: ContextGroundingIndex, options?: {
        folderKey?: string;
        folderPath?: string;
    }): Promise<void>;
    /**
     * Delete a context grounding index.
     *
     * @param index - The context grounding index to delete
     * @param options - Optional folder parameters
     */
    deleteIndex(index: ContextGroundingIndex, options?: {
        folderKey?: string;
        folderPath?: string;
    }): Promise<void>;
    /**
     * Retrieve context grounding index information by its ID.
     *
     * @param id - The unique identifier of the context index
     * @param options - Optional folder parameters
     * @returns The index information
     */
    retrieveById(id: string, options?: {
        folderKey?: string;
        folderPath?: string;
    }): Promise<ContextGroundingIndex>;
    private resolveFolderKey;
    private extractBucketInfo;
}
