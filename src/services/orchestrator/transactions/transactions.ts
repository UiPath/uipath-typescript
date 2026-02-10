import { FolderScopedService } from '../../folder-scoped';
import type { IUiPath } from '../../../core/types';
import { TransactionServiceModel } from '../../../models/orchestrator/transactions.models';
import {
  TransactionItem,
  StartTransactionPayload,
  TransactionResultPayload
} from '../../../models/orchestrator/queues.types';
import { QueueItemMap } from '../../../models/orchestrator/queues.constants';
import { transformData, pascalToCamelCaseKeys } from '../../../utils/transform';
import { createHeaders } from '../../../utils/http/headers';
import { FOLDER_ID } from '../../../utils/constants/headers';
import { QUEUE_ENDPOINTS } from '../../../utils/constants/endpoints';
import { track } from '../../../core/telemetry';

/**
 * Service for processing transactions (Orchestrator Queues)
 */
export class TransactionService extends FolderScopedService implements TransactionServiceModel {
  /**
   * Creates an instance of the Transactions service.
   *
   * @param instance - UiPath SDK instance providing authentication and configuration
   */
  constructor(instance: IUiPath) {
    super(instance);
  }

  /**
   * Starts a transaction by getting the next item from the queue
   */
  @track('Transactions.StartTransaction')
  async startTransaction(folderId: number, queueName: string, robotIdentifier?: string): Promise<TransactionItem> {
    const payload: StartTransactionPayload = {
      transactionData: {
        Name: queueName,
        RobotIdentifier: robotIdentifier
      }
    };

    const response = await this.post<TransactionItem>(
      QUEUE_ENDPOINTS.START_TRANSACTION,
      payload,
      {
        headers: createHeaders({ [FOLDER_ID]: folderId })
      }
    );

    return transformData(pascalToCamelCaseKeys(response.data), QueueItemMap) as TransactionItem;
  }

  /**
   * Sets the result of a transaction
   */
  @track('Transactions.SetTransactionResult')
  async setTransactionResult(
    folderId: number,
    queueItemId: number,
    transactionResult: TransactionResultPayload['transactionResult']
  ): Promise<void> {
    const payload = {
      transactionResult
    };

    await this.post(
      QUEUE_ENDPOINTS.SET_TRANSACTION_RESULT(queueItemId),
      payload,
      {
        headers: createHeaders({ [FOLDER_ID]: folderId })
      }
    );
  }
}
