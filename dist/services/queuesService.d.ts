import { Config } from '../config';
import { ExecutionContext } from '../executionContext';
import { BaseService } from './baseService';
import { QueueItem, TransactionItem, TransactionItemResult, CommitType } from '../models/queues';
/**
 * Service for managing UiPath queues and queue items.
 *
 * Queues are a fundamental component of UiPath automation that enable distributed
 * and scalable processing of work items.
 */
export declare class QueuesService extends BaseService {
    constructor(config: Config, executionContext: ExecutionContext);
    /**
     * Retrieves a list of queue items from the Orchestrator.
     * @returns List of queue items
     */
    listItems(): Promise<any>;
    /**
     * Creates a new queue item in the Orchestrator.
     *
     * @param item - Queue item data
     * @returns Created queue item details
     *
     * @see {@link https://docs.uipath.com/ACTIVITIES/other/latest/workflow/add-queue-item|Add Queue Item}
     */
    createItem(item: QueueItem | Record<string, any>): Promise<any>;
    /**
     * Creates multiple queue items in bulk.
     *
     * @param items - List of queue items to create
     * @param queueName - Name of the target queue
     * @param commitType - Type of commit operation to use
     * @returns Bulk operation result
     */
    createItems(items: (QueueItem | Record<string, any>)[], queueName: string, commitType: CommitType): Promise<any>;
    /**
     * Creates a new transaction item in a queue.
     *
     * @param item - Transaction item data
     * @param noRobot - If true, the transaction will not be associated with a robot
     * @returns Transaction item details
     */
    createTransactionItem(item: TransactionItem | Record<string, any>, noRobot?: boolean): Promise<any>;
    /**
     * Updates the progress of a transaction item.
     *
     * @param transactionKey - Unique identifier of the transaction
     * @param progress - Progress message to set
     * @returns Progress update confirmation
     *
     * @see {@link https://docs.uipath.com/activities/other/latest/workflow/set-transaction-progress|Set Transaction Progress}
     */
    updateProgressOfTransactionItem(transactionKey: string, progress: string): Promise<any>;
    /**
     * Completes a transaction item with the specified result.
     *
     * @param transactionKey - Unique identifier of the transaction
     * @param result - Result data for the transaction
     * @returns Transaction completion confirmation
     *
     * @see {@link https://docs.uipath.com/activities/other/latest/workflow/set-transaction-status|Set Transaction Status}
     */
    completeTransactionItem(transactionKey: string, result: TransactionItemResult | Record<string, any>): Promise<any>;
    private getListItemsSpec;
    private getCreateItemSpec;
    private getCreateItemsSpec;
    private getCreateTransactionItemSpec;
    private getUpdateProgressOfTransactionItemSpec;
    private getCompleteTransactionItemSpec;
    private ensureQueueItem;
    private ensureTransactionItem;
    private ensureTransactionItemResult;
}
