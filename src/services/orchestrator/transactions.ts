import { FolderScopedService } from '../folder-scoped';
import { Config } from '../../core/config/config';
import { ExecutionContext } from '../../core/context/execution';
import { TokenManager } from '../../core/auth/token-manager';
import { TransactionServiceModel } from '../../models/orchestrator/transactions.models';
import {
    TransactionItem,
    StartTransactionPayload,
    TransactionResultPayload
} from '../../models/orchestrator/queues.types';
import { QueueItemMap } from '../../models/orchestrator/queues.constants';
import { transformData, pascalToCamelCaseKeys } from '../../utils/transform';
import { createHeaders } from '../../utils/http/headers';
import { FOLDER_ID } from '../../utils/constants/headers';
import { QUEUE_ENDPOINTS } from '../../utils/constants/endpoints';
import { track } from '../../core/telemetry';

/**
 * Service for processing transactions (Orchestrator Queues)
 */
export class TransactionService extends FolderScopedService implements TransactionServiceModel {
    constructor(config: Config, executionContext: ExecutionContext, tokenManager: TokenManager) {
        super(config, executionContext, tokenManager);
    }

    /**
     * Starts a transaction by getting the next item from the queue
     */
    @track('Transactions.StartTransaction')
    async startTransaction(folderId: number, queueName: string, robotIdentifier?: string): Promise<TransactionItem> {
        const payload: StartTransactionPayload = {
            startTransactionParameters: {
                TransactionData: {
                    Name: queueName,
                    RobotIdentifier: robotIdentifier
                }
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
    @track('Transactions.SubmitTransaction')
    async submitTransaction(
        folderId: number,
        queueItemKey: string,
        resultDetails: Omit<TransactionResultPayload['transactionResult'], 'Status'> & { Status: TransactionResultPayload['transactionResult']['Status'] }
    ): Promise<void> {

        // Construct the payload with the wrapping required by the API
        // Note: The API likely expects the payload to include the key in the body or URL?
        // Based on endpoints.ts: SET_TRANSACTION_RESULT
        // Payload usually requires: { "queueItemKey": "...", "transactionResult": { ... } }
        // Let's adjust the payload construction.

        const payload = {
            queueItemKey: queueItemKey,
            transactionResult: resultDetails
        };

        await this.post(
            QUEUE_ENDPOINTS.SET_TRANSACTION_RESULT,
            payload,
            {
                headers: createHeaders({ [FOLDER_ID]: folderId })
            }
        );
    }
}
