"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueuesService = void 0;
const baseService_1 = require("./baseService");
/**
 * Service for managing UiPath queues and queue items.
 *
 * Queues are a fundamental component of UiPath automation that enable distributed
 * and scalable processing of work items.
 */
class QueuesService extends baseService_1.BaseService {
    constructor(config, executionContext) {
        super(config, executionContext);
    }
    /**
     * Retrieves a list of queue items from the Orchestrator.
     * @returns List of queue items
     */
    async listItems() {
        const spec = this.getListItemsSpec();
        const response = await this.request(spec.method, spec.url);
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
    async createItem(item) {
        const spec = this.getCreateItemSpec(item);
        const response = await this.request(spec.method, spec.url, { data: spec.json });
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
    async createItems(items, queueName, commitType) {
        const spec = this.getCreateItemsSpec(items, queueName, commitType);
        const response = await this.request(spec.method, spec.url, { data: spec.json });
        return response.data;
    }
    /**
     * Creates a new transaction item in a queue.
     *
     * @param item - Transaction item data
     * @param noRobot - If true, the transaction will not be associated with a robot
     * @returns Transaction item details
     */
    async createTransactionItem(item, noRobot = false) {
        const spec = this.getCreateTransactionItemSpec(item, noRobot);
        const response = await this.request(spec.method, spec.url, { data: spec.json });
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
    async updateProgressOfTransactionItem(transactionKey, progress) {
        const spec = this.getUpdateProgressOfTransactionItemSpec(transactionKey, progress);
        const response = await this.request(spec.method, spec.url, { data: spec.json });
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
    async completeTransactionItem(transactionKey, result) {
        const spec = this.getCompleteTransactionItemSpec(transactionKey, result);
        const response = await this.request(spec.method, spec.url, { data: spec.json });
        return response.data;
    }
    getListItemsSpec() {
        return {
            method: 'GET',
            url: '/orchestrator_/odata/QueueItems'
        };
    }
    getCreateItemSpec(item) {
        const queueItem = this.ensureQueueItem(item);
        return {
            method: 'POST',
            url: '/orchestrator_/odata/Queues/UiPathODataSvc.AddQueueItem',
            json: {
                itemData: queueItem
            }
        };
    }
    getCreateItemsSpec(items, queueName, commitType) {
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
    getCreateTransactionItemSpec(item, noRobot) {
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
    getUpdateProgressOfTransactionItemSpec(transactionKey, progress) {
        return {
            method: 'POST',
            url: `/orchestrator_/odata/QueueItems(${transactionKey})/UiPathODataSvc.SetTransactionProgress`,
            json: { progress }
        };
    }
    getCompleteTransactionItemSpec(transactionKey, result) {
        const transactionResult = this.ensureTransactionItemResult(result);
        return {
            method: 'POST',
            url: `/orchestrator_/odata/Queues(${transactionKey})/UiPathODataSvc.SetTransactionResult`,
            json: {
                transactionResult
            }
        };
    }
    ensureQueueItem(item) {
        return item;
    }
    ensureTransactionItem(item) {
        return item;
    }
    ensureTransactionItemResult(result) {
        return result;
    }
}
exports.QueuesService = QueuesService;
