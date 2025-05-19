import { Config } from '../config';
import { ExecutionContext } from '../executionContext';
import { BaseService } from './baseService';
import { BucketsService } from './bucketsService';
import { FolderContext } from '../folderContext';
import { headerFolder } from '../utils/headers';
// import { DATA_SOURCES, ENDPOINTS } from '../utils/constants';
import { ContextGroundingIndex, ContextGroundingIndexSchema } from '../models/contextGroundingIndex';
import { ContextGroundingQueryResponse, ContextGroundingQueryResponseSchema } from '../models/contextGrounding';
import { IngestionInProgressException } from '../models/errors';
import { AxiosError } from 'axios';
import { z } from 'zod';
import { FolderService } from './folderService';
import { DATA_SOURCES, ENDPOINTS } from '../utils/constants';

/**
 * Service for managing semantic automation contexts in UiPath.
 * 
 * Context Grounding is a feature that helps in understanding and managing the
 * semantic context in which automation processes operate. It provides capabilities
 * for indexing, retrieving, and searching through contextual information that
 * can be used to enhance AI-enabled automation.
 */
export class ContextGroundingService extends BaseService {
  private readonly folderContext: FolderContext;

  constructor(
    config: Config,
    executionContext: ExecutionContext,
    private readonly foldersService: FolderService,
    private readonly bucketsService: BucketsService
  ) {
    super(config, executionContext);
    this.folderContext = new FolderContext(config, executionContext);
  }

  /**
   * Create a new context grounding index.
   * 
   * @param name - The name of the index to create
   * @param storageBucketName - The name of the storage bucket to use
   * @param options - Optional parameters for index creation
   * @returns The created index
   */
  async create(
    name: string,
    storageBucketName: string,
    options: {
      description?: string;
      fileNameGlob?: string;
      storageBucketFolderPath?: string;
      folderKey?: string;
      folderPath?: string;
    } = {}
  ): Promise<ContextGroundingIndex> {
    const folderKey = await this.resolveFolderKey(options.folderKey, options.folderPath);
    const storageBucketFolderPath = options.storageBucketFolderPath || this.folderContext.folderPath;

    const response = await this.request(
      'POST',
      ENDPOINTS.CONTEXT_GROUNDING.CREATE,
      {
        data: {
          name,
          description: options.description,
          dataSource: {
            '@odata.type': DATA_SOURCES.ORCHESTRATOR_STORAGE_BUCKET,
            folder: storageBucketFolderPath,
            bucketName: storageBucketName,
            fileNameGlob: options.fileNameGlob || '*',
            directoryPath: '/'
          }
        },
        headers: {
          ...headerFolder(folderKey)
        }
      }
    );

    return ContextGroundingIndexSchema.parse(response.data);
  }

  /**
   * Add content to the index.
   * 
   * @param name - The name of the index to add content to
   * @param contentType - The type of content being added
   * @param blobFilePath - The path where the blob will be stored in the storage bucket
   * @param content - The content to be added, either as a string or Buffer
   * @param options - Optional folder parameters
   */
  async addToIndex(
    name: string,
    contentType: string,
    blobFilePath: string,
    content?: string | Buffer | ArrayBuffer | Blob,
    options: { folderKey?: string; folderPath?: string } = {}
  ): Promise<void> {
    if (!content) {
      throw new Error('Content is required');
    }

    const index = await this.retrieve(name, options);
    const [bucketName, bucketFolderPath] = this.extractBucketInfo(index);

    if (typeof content === 'string') {
      await this.bucketsService.uploadFromMemory({
        name: bucketName,
        blobFilePath,
        content,
        folderPath: bucketFolderPath,
        contentType,
        folderKey: index.dataSource?.folder || ''
      });
    } else {
      await this.bucketsService.upload({
        name: bucketName,
        blobFilePath,
        content,
        folderPath: bucketFolderPath,
        contentType,
        folderKey: index.dataSource?.folder || ''
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
  async retrieve(
    name: string,
    options: { folderKey?: string; folderPath?: string } = {}
  ): Promise<ContextGroundingIndex> {
    const folderKey = await this.resolveFolderKey(options.folderKey, options.folderPath);

    const response = await this.request(
      'GET',
      ENDPOINTS.CONTEXT_GROUNDING.INDEXES,
      {
        params: {
          '$filter': `Name eq '${name}'`,
          '$expand': 'dataSource'
        },
        headers: {
          ...headerFolder(folderKey)
        }
      }
    ) as { data: { value: unknown[] } };

    const indexes = z.array(ContextGroundingIndexSchema).parse(response.data.value);
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
  async search(
    name: string,
    query: string,
    numberOfResults: number = 10,
    options: { folderKey?: string; folderPath?: string } = {}
  ): Promise<ContextGroundingQueryResponse[]> {
    const index = await this.retrieve(name, options);
    
    if (index.ingestionInProgress) {
      throw new IngestionInProgressException(name);
    }

    const folderKey = await this.resolveFolderKey(options.folderKey, options.folderPath);

    const response = await this.request(
      'POST',
      ENDPOINTS.CONTEXT_GROUNDING.SEARCH,
      {
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
          ...headerFolder(folderKey)
        }
      }
    );

    return z.array(ContextGroundingQueryResponseSchema).parse(response.data);
  }

  /**
   * Ingest data into the context grounding index.
   * 
   * @param index - The context grounding index to perform data ingestion
   * @param options - Optional folder parameters
   */
  async ingestData(
    index: ContextGroundingIndex,
    options: { folderKey?: string; folderPath?: string } = {}
  ): Promise<void> {
    if (!index.id) {
      return;
    }

    const folderKey = await this.resolveFolderKey(options.folderKey, options.folderPath);

    try {
      await this.request(
        'POST',
        `${ENDPOINTS.CONTEXT_GROUNDING.INDEXES}/${index.id}/ingest`,
        {
          headers: {
            ...headerFolder(folderKey)
          }
        }
      );
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 409) {
        throw new IngestionInProgressException(index.name, false);
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
  async deleteIndex(
    index: ContextGroundingIndex,
    options: { folderKey?: string; folderPath?: string } = {}
  ): Promise<void> {
    if (!index.id) {
      return;
    }

    const folderKey = await this.resolveFolderKey(options.folderKey, options.folderPath);

    await this.request(
      'DELETE',
      `${ENDPOINTS.CONTEXT_GROUNDING.INDEXES}/${index.id}`,
      {
        headers: {
          ...headerFolder(folderKey)
        }
      }
    );
  }

  /**
   * Retrieve context grounding index information by its ID.
   * 
   * @param id - The unique identifier of the context index
   * @param options - Optional folder parameters
   * @returns The index information
   */
  async retrieveById(
    id: string,
    options: { folderKey?: string; folderPath?: string } = {}
  ): Promise<ContextGroundingIndex> {
    const folderKey = await this.resolveFolderKey(options.folderKey, options.folderPath);

    const response = await this.request(
      'GET',
      `${ENDPOINTS.CONTEXT_GROUNDING.INDEXES}/${id}`,
      {
        headers: {
          ...headerFolder(folderKey)
        }
      }
    );

    return ContextGroundingIndexSchema.parse(response.data);
  }

  private async resolveFolderKey(folderKey?: string, folderPath?: string): Promise<string> {
    if (!folderKey && folderPath) {
      folderKey = await this.foldersService.retrieveKeyByFolderPath(folderPath);
    }

    if (!folderKey && !folderPath) {
      folderKey = this.folderContext.folderKey || (
        this.folderContext.folderPath
          ? await this.foldersService.retrieveKeyByFolderPath(this.folderContext.folderPath)
          : undefined
      );
    }

    if (!folderKey) {
      throw new Error('Folder key or folder path is required');
    }

    return folderKey;
  }

  private extractBucketInfo(index: ContextGroundingIndex): [string, string] {
    try {
      if (!index.dataSource?.bucketName || !index.dataSource?.folder) {
        throw new Error('Missing bucket information');
      }
      return [index.dataSource.bucketName, index.dataSource.folder];
    } catch (error) {
      throw new Error('Cannot extract bucket data from index');
    }
  }
} 