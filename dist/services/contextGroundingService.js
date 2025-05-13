"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContextGroundingService = void 0;
const baseService_1 = require("./baseService");
const folderContext_1 = require("../folderContext");
const headers_1 = require("../utils/headers");
// import { DATA_SOURCES, ENDPOINTS } from '../utils/constants';
const contextGroundingIndex_1 = require("../models/contextGroundingIndex");
const contextGrounding_1 = require("../models/contextGrounding");
const errors_1 = require("../models/errors");
const axios_1 = require("axios");
const zod_1 = require("zod");
const constants_1 = require("../utils/constants");
/**
 * Service for managing semantic automation contexts in UiPath.
 *
 * Context Grounding is a feature that helps in understanding and managing the
 * semantic context in which automation processes operate. It provides capabilities
 * for indexing, retrieving, and searching through contextual information that
 * can be used to enhance AI-enabled automation.
 */
class ContextGroundingService extends baseService_1.BaseService {
    constructor(config, executionContext, foldersService, bucketsService) {
        super(config, executionContext);
        this.foldersService = foldersService;
        this.bucketsService = bucketsService;
        this.folderContext = new folderContext_1.FolderContext(config, executionContext);
    }
    /**
     * Create a new context grounding index.
     *
     * @param name - The name of the index to create
     * @param storageBucketName - The name of the storage bucket to use
     * @param options - Optional parameters for index creation
     * @returns The created index
     */
    async create(name, storageBucketName, options = {}) {
        const folderKey = await this.resolveFolderKey(options.folderKey, options.folderPath);
        const storageBucketFolderPath = options.storageBucketFolderPath || this.folderContext.folderPath;
        const response = await this.request('POST', constants_1.ENDPOINTS.CONTEXT_GROUNDING.CREATE, {
            data: {
                name,
                description: options.description,
                dataSource: {
                    '@odata.type': constants_1.DATA_SOURCES.ORCHESTRATOR_STORAGE_BUCKET,
                    folder: storageBucketFolderPath,
                    bucketName: storageBucketName,
                    fileNameGlob: options.fileNameGlob || '*',
                    directoryPath: '/'
                }
            },
            headers: {
                ...(0, headers_1.headerFolder)(folderKey)
            }
        });
        return contextGroundingIndex_1.ContextGroundingIndexSchema.parse(response.data);
    }
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
    async addToIndex(name, contentType, blobFilePath, content, sourcePath, options = {}) {
        if (!content && !sourcePath) {
            throw new Error('Content or sourcePath is required');
        }
        if (content && sourcePath) {
            throw new Error('Content and sourcePath are mutually exclusive');
        }
        const index = await this.retrieve(name, options);
        const [bucketName, bucketFolderPath] = this.extractBucketInfo(index);
        if (sourcePath) {
            await this.bucketsService.upload({
                name: bucketName,
                blobFilePath,
                sourcePath,
                folderPath: bucketFolderPath,
                contentType
            });
        }
        else if (content) {
            await this.bucketsService.uploadFromMemory({
                name: bucketName,
                content,
                blobFilePath,
                folderPath: bucketFolderPath,
                contentType
            });
        }
        await this.ingestData(index, options);
    }
    /**
     * Retrieve context grounding index information by its name.
     *
     * @param name - The name of the context index to retrieve
     * @param options - Optional folder parameters
     * @returns The index information
     */
    async retrieve(name, options = {}) {
        const folderKey = await this.resolveFolderKey(options.folderKey, options.folderPath);
        const response = await this.request('GET', constants_1.ENDPOINTS.CONTEXT_GROUNDING.INDEXES, {
            params: {
                '$filter': `Name eq '${name}'`,
                '$expand': 'dataSource'
            },
            headers: {
                ...(0, headers_1.headerFolder)(folderKey)
            }
        });
        const indexes = zod_1.z.array(contextGroundingIndex_1.ContextGroundingIndexSchema).parse(response.data.value);
        const index = indexes.find(i => i.name === name);
        if (!index) {
            throw new Error('ContextGroundingIndex not found');
        }
        return index;
    }
    /**
     * Search for contextual information within a specific index.
     *
     * @param name - The name of the context index to search in
     * @param query - The search query in natural language
     * @param numberOfResults - Maximum number of results to return
     * @param options - Optional folder parameters
     * @returns A list of search results
     */
    async search(name, query, numberOfResults = 10, options = {}) {
        const index = await this.retrieve(name, options);
        if (index.ingestionInProgress) {
            throw new errors_1.IngestionInProgressException(name);
        }
        const folderKey = await this.resolveFolderKey(options.folderKey, options.folderPath);
        const response = await this.request('POST', constants_1.ENDPOINTS.CONTEXT_GROUNDING.SEARCH, {
            data: {
                query: {
                    query,
                    numberOfResults
                },
                schema: {
                    name
                }
            },
            headers: {
                ...(0, headers_1.headerFolder)(folderKey)
            }
        });
        return zod_1.z.array(contextGrounding_1.ContextGroundingQueryResponseSchema).parse(response.data);
    }
    /**
     * Ingest data into the context grounding index.
     *
     * @param index - The context grounding index to perform data ingestion
     * @param options - Optional folder parameters
     */
    async ingestData(index, options = {}) {
        if (!index.id) {
            return;
        }
        const folderKey = await this.resolveFolderKey(options.folderKey, options.folderPath);
        try {
            await this.request('POST', `${constants_1.ENDPOINTS.CONTEXT_GROUNDING.INDEXES}/${index.id}/ingest`, {
                headers: {
                    ...(0, headers_1.headerFolder)(folderKey)
                }
            });
        }
        catch (error) {
            if (error instanceof axios_1.AxiosError && error.response?.status === 409) {
                throw new errors_1.IngestionInProgressException(index.name, false);
            }
            throw error;
        }
    }
    /**
     * Delete a context grounding index.
     *
     * @param index - The context grounding index to delete
     * @param options - Optional folder parameters
     */
    async deleteIndex(index, options = {}) {
        if (!index.id) {
            return;
        }
        const folderKey = await this.resolveFolderKey(options.folderKey, options.folderPath);
        await this.request('DELETE', `${constants_1.ENDPOINTS.CONTEXT_GROUNDING.INDEXES}/${index.id}`, {
            headers: {
                ...(0, headers_1.headerFolder)(folderKey)
            }
        });
    }
    /**
     * Retrieve context grounding index information by its ID.
     *
     * @param id - The unique identifier of the context index
     * @param options - Optional folder parameters
     * @returns The index information
     */
    async retrieveById(id, options = {}) {
        const folderKey = await this.resolveFolderKey(options.folderKey, options.folderPath);
        const response = await this.request('GET', `${constants_1.ENDPOINTS.CONTEXT_GROUNDING.INDEXES}/${id}`, {
            headers: {
                ...(0, headers_1.headerFolder)(folderKey)
            }
        });
        return contextGroundingIndex_1.ContextGroundingIndexSchema.parse(response.data);
    }
    async resolveFolderKey(folderKey, folderPath) {
        if (!folderKey && folderPath) {
            folderKey = await this.foldersService.retrieveKeyByFolderPath(folderPath);
        }
        if (!folderKey && !folderPath) {
            folderKey = this.folderContext.folderKey || (this.folderContext.folderPath
                ? await this.foldersService.retrieveKeyByFolderPath(this.folderContext.folderPath)
                : undefined);
        }
        if (!folderKey) {
            throw new Error('Folder key or folder path is required');
        }
        return folderKey;
    }
    extractBucketInfo(index) {
        try {
            if (!index.dataSource?.bucketName || !index.dataSource?.folder) {
                throw new Error('Missing bucket information');
            }
            return [index.dataSource.bucketName, index.dataSource.folder];
        }
        catch (error) {
            throw new Error('Cannot extract bucket data from index');
        }
    }
}
exports.ContextGroundingService = ContextGroundingService;
