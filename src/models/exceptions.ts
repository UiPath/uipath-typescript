export class IngestionInProgressException extends Error {
  constructor(indexName: string, searchOperation: boolean = true) {
    super(
      searchOperation
        ? `Cannot search index '${indexName}' while ingestion is in progress`
        : `Cannot ingest data into index '${indexName}' while another ingestion is in progress`
    );
    this.name = 'IngestionInProgressException';
  }
} 