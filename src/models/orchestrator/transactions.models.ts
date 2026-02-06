import { StartTransactionPayload, TransactionItem, TransactionResultPayload } from './queues.types';

/**
 * Service for processing transactions (Queue Items)
 */
export interface TransactionServiceModel {
    /**
     * Starts a transaction by getting the next item from the queue
     * 
     * @param folderId - Required folder ID
     * @param queueName - The name of the queue
     * @param robotIdentifier - Optional robot identifier
     * @returns Promise resolving to the Transaction Item
     */
    startTransaction(folderId: number, queueName: string, robotIdentifier?: string): Promise<TransactionItem>;

    /**
     * Sets the result of a transaction (Successful, Failed, etc.)
     * 
     * @param folderId - Required folder ID
     * @param queueItemKey - The key of the queue item
     * @param status - The status to set
     * @param resultDetails - Optional details (output, exceptions, analytics)
     */
    submitTransaction(
        folderId: number,
        queueItemKey: string,
        resultDetails: Omit<TransactionResultPayload['transactionResult'], 'Status'> & { Status: TransactionResultPayload['transactionResult']['Status'] }
    ): Promise<void>;
}
