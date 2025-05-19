import { Config } from '../config';
import { ExecutionContext } from '../executionContext';
import { BaseService } from './baseService';
import { FolderContext } from '../folderContext';
import { Bucket, BucketUri } from '../models/bucket';
import { headerFolder } from '../utils/headers';
import { FileSystem, isNode } from '../utils/platform';
import axios from 'axios';

interface BucketOptions {
  folderKey: string;
  folderPath?: string;
}

interface BucketIdentifier {
  name?: string;
  key?: string;
}

interface RequestConfig {
  method: string;
  url: string;
  params?: Record<string, string | number>;
  headers: Record<string, string>;
}

export class BucketsService extends BaseService {
  private folderContext: FolderContext;

  constructor(config: Config, executionContext: ExecutionContext) {
    super(config, executionContext);
    this.folderContext = new FolderContext(config, executionContext);
  }

  /**
   * Download a file from a bucket.
   * 
   * @param params - Parameters for the download operation
   * @param params.name - The name of the bucket
   * @param params.key - The key of the bucket
   * @param params.blobFilePath - The path to the file in the bucket
   * @param params.destinationPath - The local path where the file will be saved (Node.js only)
   * @param params.onDownloadComplete - Callback function that receives the downloaded data (Browser only)
   * @param params.folderKey - The key of the folder where the bucket resides
   * @param params.folderPath - The path of the folder where the bucket resides
   */
  async download({
    name,
    key,
    blobFilePath,
    destinationPath,
    onDownloadComplete,
    ...options
  }: {
    name?: string;
    key?: string;
    blobFilePath: string;
    destinationPath?: string;
    onDownloadComplete?: (data: ArrayBuffer) => void | Promise<void>;
  } & BucketOptions): Promise<void> {
    if (!destinationPath && !onDownloadComplete) {
      throw new Error('Either destinationPath (Node.js) or onDownloadComplete (Browser) must be provided');
    }

    if (destinationPath && !isNode) {
      throw new Error('destinationPath is only supported in Node.js environment');
    }

    const bucket = await this.retrieve({ name, key, ...options });
    const readUri = await this.getReadUri(bucket.Id, blobFilePath, options);

    const headers = this.convertHeaders(readUri.Headers);
    let response;

    if (readUri.RequiresAuth) {
      response = await this.request<ArrayBuffer>('GET', readUri.Uri, {
        headers,
        responseType: 'arraybuffer',
      });
    } else {
      response = await axios.get<ArrayBuffer>(readUri.Uri, {
        headers,
        responseType: 'arraybuffer',
      });
    }

    if (destinationPath && isNode) {
      await FileSystem.writeFile(destinationPath, Buffer.from(response.data));
    } else if (onDownloadComplete) {
      await onDownloadComplete(response.data);
    }
  }

  /**
   * Upload a file to a bucket.
   * 
   * @param params - Parameters for the upload operation
   * @param params.name - The name of the bucket
   * @param params.key - The key of the bucket
   * @param params.blobFilePath - The path where the file will be stored in the bucket
   * @param params.contentType - The MIME type of the file
   * @param params.sourcePath - The local path of the file to upload (Node.js only)
   * @param params.content - The file content as ArrayBuffer, Buffer, or Blob (Browser only)
   * @param params.folderKey - The key of the folder where the bucket resides
   * @param params.folderPath - The path of the folder where the bucket resides
   */
  async upload({
    name,
    key,
    blobFilePath,
    contentType,
    sourcePath,
    content,
    ...options
  }: {
    name?: string;
    key?: string;
    blobFilePath: string;
    contentType: string;
    sourcePath?: string;
    content?: ArrayBuffer | Buffer | Blob;
  } & BucketOptions): Promise<void> {
    if (!sourcePath && !content) {
      throw new Error('Either sourcePath (Node.js) or content (Browser) must be provided');
    }

    if (sourcePath && !isNode) {
      throw new Error('sourcePath is only supported in Node.js environment');
    }

    const bucket = await this.retrieve({ name, key, ...options });
    const writeUri = await this.getWriteUri(bucket.Id, contentType, blobFilePath, options);
    const headers = this.convertHeaders(writeUri.Headers);

    let uploadContent: ArrayBuffer | Buffer | Blob;
    if (sourcePath && isNode) {
      uploadContent = await FileSystem.readFile(sourcePath);
    } else if (content) {
      uploadContent = content;
    } else {
      throw new Error('No content available for upload');
    }

    const formData = new FormData();
    formData.append('file', new Blob([uploadContent], { type: contentType }));

    if (writeUri.RequiresAuth) {
      await this.request('PUT', writeUri.Uri, {
        headers,
        data: formData,
      });
    } else {
      await axios.put(writeUri.Uri, formData, { headers });
    }
  }

  /**
   * Upload content from memory to a bucket.
   */
  async uploadFromMemory({
    name,
    key,
    blobFilePath,
    contentType,
    content,
    ...options
  }: {
    name?: string;
    key?: string;
    blobFilePath: string;
    contentType: string;
    content: string | ArrayBuffer | Buffer | Blob;
  } & BucketOptions): Promise<void> {
    const bucket = await this.retrieve({ name, key, ...options });
    const writeUri = await this.getWriteUri(bucket.Id, contentType, blobFilePath, options);
    const headers = this.convertHeaders(writeUri.Headers);

    let data: ArrayBuffer | Buffer | Blob;
    if (typeof content === 'string') {
      data = new TextEncoder().encode(content).buffer;
    } else {
      data = content;
    }

    if (writeUri.RequiresAuth) {
      await this.request('PUT', writeUri.Uri, {
        headers,
        data,
      });
    } else {
      await axios.put(writeUri.Uri, data, { headers });
    }
  }

  /**
   * Retrieve bucket information by its name or key.
   */
  async retrieve({
    name,
    key,
    ...options
  }: BucketIdentifier & BucketOptions): Promise<Bucket> {
    if (!key && !name) {
      throw new Error('Must specify a bucket name or bucket key');
    }

    const { method, url, params, headers } = key
      ? this.getRetrieveByKeyConfig(key, options)
      : this.getRetrieveConfig(name!, options);

    try {
      const response = await this.request<{ value: Bucket[] }>(method, url, {
        params,
        headers: {
          ...headers,
          'X-UIPATH-OrganizationUnitId': options.folderKey || '',
        },
      });
      
      if (!response.data.value || response.data.value.length === 0) {
        throw new Error(`Bucket with ${key ? 'key' : 'name'} '${key || name}' not found`);
      }
      
      return response.data.value[0];
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new Error(`Authentication failed when accessing bucket ${key || name}. Please check your authentication token and permissions.`);
        }
        throw new Error(`Failed to access bucket ${key || name}. Status: ${error.response?.status}, Message: ${error.message}`);
      }
      throw error;
    }
  }

  private async getReadUri(
    bucketId: string,
    blobFilePath: string,
    options: BucketOptions
  ): Promise<BucketUri> {
    const { method, url, params, headers } = this.getReadUriConfig(
      bucketId,
      blobFilePath,
      options
    );

    const response = await this.request<BucketUri>(method, url, {
      params,
      headers,
    });

    return response.data;
  }

  private async getWriteUri(
    bucketId: string,
    contentType: string,
    blobFilePath: string,
    options: BucketOptions
  ): Promise<BucketUri> {
    const { method, url, params, headers } = this.getWriteUriConfig(
      bucketId,
      contentType,
      blobFilePath,
      options
    );

    const response = await this.request<BucketUri>(method, url, {
      params,
      headers,
    });

    return response.data;
  }

  private getRetrieveConfig(name: string, options: BucketOptions): RequestConfig {
    return {
      method: 'GET',
      url: '/orchestrator_/odata/Buckets',
      params: {
        '$filter': `Name eq '${name}'`,
        '$top': 1,
      },
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...headerFolder(options.folderKey, options.folderPath)
      },
    };
  }

  private getRetrieveByKeyConfig(key: string, options: BucketOptions): RequestConfig {
    return {
      method: 'GET',
      url: `/orchestrator_/odata/Buckets/UiPath.Server.Configuration.OData.GetByKey(identifier=${key})`,
      params: {},
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...headerFolder(options.folderKey, options.folderPath)
      },
    };
  }

  private getReadUriConfig(
    bucketId: string,
    blobFilePath: string,
    options: BucketOptions
  ): RequestConfig {
    return {
      method: 'GET',
      url: `/orchestrator_/odata/Buckets(${bucketId})/UiPath.Server.Configuration.OData.GetReadUri`,
      params: { path: blobFilePath },
      headers: {
        ...headerFolder(options.folderKey, options.folderPath)
      },
    };
  }

  private getWriteUriConfig(
    bucketId: string,
    contentType: string,
    blobFilePath: string,
    options: BucketOptions
  ): RequestConfig {
    return {
      method: 'GET',
      url: `/orchestrator_/odata/Buckets(${bucketId})/UiPath.Server.Configuration.OData.GetWriteUri`,
      params: {
        path: blobFilePath,
        contentType,
      },
      headers: {
        ...headerFolder(options.folderKey, options.folderPath)
      },
    };
  }

  private convertHeaders(headers: { Keys: string[]; Values: string[] }): Record<string, string> {
    return headers.Keys.reduce((acc, key, index) => {
      acc[key] = headers.Values[index];
      return acc;
    }, {} as Record<string, string>);
  }
} 