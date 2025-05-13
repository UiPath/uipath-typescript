import { Config } from '../config';
import { ExecutionContext } from '../executionContext';
import { BaseService } from './baseService';
import { QueueItem, TransactionItem, TransactionItemResult, CommitType } from '../models/queues';

interface RequestConfig {
  method: string;
  url: string;
  params?: Record<string, string | number>;
  headers?: Record<string, string>;
  json?: any;
}

/**
 * Service for managing UiPath queues and queue items.
 * 
 * Queues are a fundamental component of UiPath automation that enable distributed
 * and scalable processing of work items.
 */
export class QueuesService extends BaseService {
  constructor(config: Config, executionContext: ExecutionContext) {
    super(config, executionContext);
  }

  /**
   * Retrieves a list of queue items from the Orchestrator.
   * @returns List of queue items
   */
  async listItems(): Promise<any> {
    const spec = this.getListItemsSpec();
    const response = await this.request<any>(spec.method, spec.url);
    return response.data;
  }

  /**
   * Creates a new queue item in the Orchestrator.
   * 
   * @param item - Queue item data
   * @returns Created queue item details
   * 
   * @see {@link https://docs.uipath.com/ACTIVITIES/other/latest/workflow/add-queue-item|Add Queue Item}
   */
  async createItem(item: QueueItem | Record<string, any>): Promise<any> {
    const spec = this.getCreateItemSpec(item);
    const response = await this.request<any>(spec.method, spec.url, { data: spec.json });
    return response.data;
  }

  /**
   * Creates multiple queue items in bulk.
   * 
   * @param items - List of queue items to create
   * @param queueName - Name of the target queue
   * @param commitType - Type of commit operation to use
   * @returns Bulk operation result
   */
  async createItems(
    items: (QueueItem | Record<string, any>)[],
    queueName: string,
    commitType: CommitType
  ): Promise<any> {
    const spec = this.getCreateItemsSpec(items, queueName, commitType);
    const response = await this.request<any>(spec.method, spec.url, { data: spec.json });
    return response.data;
  }

  /**
   * Creates a new transaction item in a queue.
   * 
   * @param item - Transaction item data
   * @param noRobot - If true, the transaction will not be associated with a robot
   * @returns Transaction item details
   */
  async createTransactionItem(
    item: TransactionItem | Record<string, any>,
    noRobot: boolean = false
  ): Promise<any> {
    const spec = this.getCreateTransactionItemSpec(item, noRobot);
    const response = await this.request<any>(spec.method, spec.url, { data: spec.json });
    return response.data;
  }

  /**
   * Updates the progress of a transaction item.
   * 
   * @param transactionKey - Unique identifier of the transaction
   * @param progress - Progress message to set
   * @returns Progress update confirmation
   * 
   * @see {@link https://docs.uipath.com/activities/other/latest/workflow/set-transaction-progress|Set Transaction Progress}
   */
  async updateProgressOfTransactionItem(
    transactionKey: string,
    progress: string
  ): Promise<any> {
    const spec = this.getUpdateProgressOfTransactionItemSpec(transactionKey, progress);
    const response = await this.request<any>(spec.method, spec.url, { data: spec.json });
    return response.data;
  }

  /**
   * Completes a transaction item with the specified result.
   * 
   * @param transactionKey - Unique identifier of the transaction
   * @param result - Result data for the transaction
   * @returns Transaction completion confirmation
   * 
   * @see {@link https://docs.uipath.com/activities/other/latest/workflow/set-transaction-status|Set Transaction Status}
   */
  async completeTransactionItem(
    transactionKey: string,
    result: TransactionItemResult | Record<string, any>
  ): Promise<any> {
    const spec = this.getCompleteTransactionItemSpec(transactionKey, result);
    const response = await this.request<any>(spec.method, spec.url, { data: spec.json });
    return response.data;
  }

  private getListItemsSpec(): RequestConfig {
    return {
      method: 'GET',
      url: '/orchestrator_/odata/QueueItems'
    };
  }

  private getCreateItemSpec(item: QueueItem | Record<string, any>): RequestConfig {
    const queueItem = this.ensureQueueItem(item);
    return {
      method: 'POST',
      url: '/orchestrator_/odata/Queues/UiPathODataSvc.AddQueueItem',
      json: {
        itemData: queueItem
      }
    };
  }

  private getCreateItemsSpec(
    items: (QueueItem | Record<string, any>)[],
    queueName: string,
    commitType: CommitType
  ): RequestConfig {
    return {
      method: 'POST',
      url: '/orchestrator_/odata/Queues/UiPathODataSvc.BulkAddQueueItems',
      json: {
        queueName,
        commitType,
        queueItems: items.map(item => this.ensureQueueItem(item))
      }
    };
  }

  private getCreateTransactionItemSpec(
    item: TransactionItem | Record<string, any>,
    noRobot: boolean
  ): RequestConfig {
    const transactionItem = this.ensureTransactionItem(item);
    return {
      method: 'POST',
      url: '/orchestrator_/odata/Queues/UiPathODataSvc.StartTransaction',
      json: {
        transactionData: {
          ...transactionItem,
          ...(noRobot ? {} : { RobotIdentifier: this.executionContext.robotKey })
        }
      }
    };
  }

  private getUpdateProgressOfTransactionItemSpec(
    transactionKey: string,
    progress: string
  ): RequestConfig {
    return {
      method: 'POST',
      url: `/orchestrator_/odata/QueueItems(${transactionKey})/UiPathODataSvc.SetTransactionProgress`,
      json: { progress }
    };
  }

  private getCompleteTransactionItemSpec(
    transactionKey: string,
    result: TransactionItemResult | Record<string, any>
  ): RequestConfig {
    const transactionResult = this.ensureTransactionItemResult(result);
    return {
      method: 'POST',
      url: `/orchestrator_/odata/Queues(${transactionKey})/UiPathODataSvc.SetTransactionResult`,
      json: {
        transactionResult
      }
    };
  }

  private ensureQueueItem(item: QueueItem | Record<string, any>): QueueItem {
    return item as QueueItem;
  }

  private ensureTransactionItem(item: TransactionItem | Record<string, any>): TransactionItem {
    return item as TransactionItem;
  }

  private ensureTransactionItemResult(result: TransactionItemResult | Record<string, any>): TransactionItemResult {
    return result as TransactionItemResult;
  }
} 