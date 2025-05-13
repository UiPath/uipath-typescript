"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IngestionInProgressException = void 0;
class IngestionInProgressException extends Error {
    constructor(indexName, searchOperation = true) {
        super(searchOperation
            ? `Cannot search index '${indexName}' while ingestion is in progress`
            : `Cannot ingest data into index '${indexName}' while another ingestion is in progress`);
        this.name = 'IngestionInProgressException';
    }
}
exports.IngestionInProgressException = IngestionInProgressException;
