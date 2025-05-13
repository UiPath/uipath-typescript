/**
 * Error thrown when an ingestion operation is already in progress.
 */
export class IngestionInProgressException extends Error {
  constructor(indexName: string, searchOperation: boolean = true) {
    const operation = searchOperation ? 'search' : 'ingestion';
    super(`Cannot perform ${operation} operation. Ingestion is in progress for index '${indexName}'`);
    this.name = 'IngestionInProgressException';
  }
} 