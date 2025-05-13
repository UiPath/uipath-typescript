/**
 * Error thrown when an ingestion operation is already in progress.
 */
export declare class IngestionInProgressException extends Error {
    constructor(indexName: string, searchOperation?: boolean);
}
