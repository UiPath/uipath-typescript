import { TransactionItem, TransactionResultPayload } from './queues.types';

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
   * Sets the result of a transaction
   *
   * Swagger path: /odata/Queues({key})/UiPathODataSvc.SetTransactionResult
   *
   * @param folderId - Required folder ID
   * @param queueItemId - Queue item ID (path key)
   * @param transactionResult - Transaction result payload
   */
  setTransactionResult(
    folderId: number,
    queueItemId: number,
    transactionResult: TransactionResultPayload['transactionResult']
  ): Promise<void>;
}
