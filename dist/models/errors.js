"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IngestionInProgressException = void 0;
/**
 * Error thrown when an ingestion operation is already in progress.
 */
class IngestionInProgressException extends Error {
    constructor(indexName, searchOperation = true) {
        const operation = searchOperation ? 'search' : 'ingestion';
        super(`Cannot perform ${operation} operation. Ingestion is in progress for index '${indexName}'`);
        this.name = 'IngestionInProgressException';
    }
}
exports.IngestionInProgressException = IngestionInProgressException;
