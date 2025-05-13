import { Config } from '../config';
import { ExecutionContext } from '../executionContext';
import { BaseService } from './baseService';
import { Bucket } from '../models/bucket';
interface BucketOptions {
    folderKey?: string;
    folderPath?: string;
}
interface BucketIdentifier {
    name?: string;
    key?: string;
}
export declare class BucketsService extends BaseService {
    private folderContext;
    constructor(config: Config, executionContext: ExecutionContext);
    /**
     * Download a file from a bucket.
     *
     * @param params - Parameters for the download operation
     * @param params.name - The name of the bucket
     * @param params.key - The key of the bucket
     * @param params.blobFilePath - The path to the file in the bucket
     * @param params.destinationPath - The local path where the file will be saved
     * @param params.folderKey - The key of the folder where the bucket resides
     * @param params.folderPath - The path of the folder where the bucket resides
     */
    download({ name, key, blobFilePath, destinationPath, ...options }: {
        name?: string;
        key?: string;
        blobFilePath: string;
        destinationPath: string;
    } & BucketOptions): Promise<void>;
    /**
     * Upload a file to a bucket.
     *
     * @param params - Parameters for the upload operation
     * @param params.name - The name of the bucket
     * @param params.key - The key of the bucket
     * @param params.blobFilePath - The path where the file will be stored in the bucket
     * @param params.contentType - The MIME type of the file
     * @param params.sourcePath - The local path of the file to upload
     * @param params.folderKey - The key of the folder where the bucket resides
     * @param params.folderPath - The path of the folder where the bucket resides
     */
    upload({ name, key, blobFilePath, contentType, sourcePath, ...options }: {
        name?: string;
        key?: string;
        blobFilePath: string;
        contentType: string;
        sourcePath: string;
    } & BucketOptions): Promise<void>;
    /**
     * Upload content from memory to a bucket.
     */
    uploadFromMemory({ name, key, blobFilePath, contentType, content, ...options }: {
        name?: string;
        key?: string;
        blobFilePath: string;
        contentType: string;
        content: string | Buffer;
    } & BucketOptions): Promise<void>;
    /**
     * Retrieve bucket information by its name or key.
     */
    retrieve({ name, key, ...options }: BucketIdentifier & BucketOptions): Promise<Bucket>;
    private getReadUri;
    private getWriteUri;
    private getRetrieveConfig;
    private getRetrieveByKeyConfig;
    private getReadUriConfig;
    private getWriteUriConfig;
    private convertHeaders;
}
export {};
