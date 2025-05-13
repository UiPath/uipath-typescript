"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobsService = void 0;
const baseService_1 = require("./baseService");
const headers_1 = require("../utils/headers");
/**
 * Service for managing API payloads and job inbox interactions.
 *
 * A job represents a single execution of an automation - it is created when you start
 * a process and contains information about that specific run, including its status,
 * start time, and any input/output data.
 */
class JobsService extends baseService_1.BaseService {
    constructor(config, executionContext) {
        super(config, executionContext);
    }
    /**
     * Sends a payload to resume a paused job waiting for input.
     *
     * @param params - Parameters for resuming a job
     * @param params.inboxId - The inbox ID of the job
     * @param params.jobId - The job ID of the job
     * @param params.payload - The payload to deliver
     * @param params.folderKey - The folder key
     * @param params.folderPath - The folder path
     */
    async resume({ inboxId, jobId, payload, folderKey, folderPath }) {
        if (!jobId && !inboxId) {
            throw new Error('Either jobId or inboxId must be provided');
        }
        const actualInboxId = inboxId ?? await this.retrieveInboxId({
            jobId: jobId,
            folderKey,
            folderPath
        });
        const { method, url, data, headers } = this.getResumeRequestConfig({
            inboxId: actualInboxId,
            payload,
            folderKey,
            folderPath
        });
        await this.request(method, url, { data, headers });
    }
    /**
     * Retrieve job information by its key.
     *
     * @param jobKey - The key of the job to retrieve
     */
    async retrieve(jobKey) {
        const { method, url } = this.getRetrieveRequestConfig(jobKey);
        const response = await this.request(method, url);
        return response.data;
    }
    async retrieveInboxId({ jobId, folderKey, folderPath }) {
        const { method, url, params, headers } = this.getRetrieveInboxIdRequestConfig({
            jobId,
            folderKey,
            folderPath
        });
        const response = await this.request(method, url, { params, headers });
        if (response.data.value.length === 0) {
            throw new Error('No inbox found');
        }
        return response.data.value[0].ItemKey;
    }
    getRetrieveInboxIdRequestConfig({ jobId, folderKey, folderPath }) {
        return {
            method: 'GET',
            url: '/orchestrator_/odata/JobTriggers',
            params: {
                '$filter': `JobId eq ${jobId}`,
                '$top': 1,
                '$select': 'ItemKey'
            },
            headers: {
                ...(0, headers_1.headerFolder)(folderKey, folderPath)
            }
        };
    }
    getResumeRequestConfig({ inboxId, payload, folderKey, folderPath }) {
        return {
            method: 'POST',
            url: `/orchestrator_/api/JobTriggers/DeliverPayload/${inboxId}`,
            data: { payload },
            headers: {
                ...(0, headers_1.headerFolder)(folderKey, folderPath)
            }
        };
    }
    getRetrieveRequestConfig(jobKey) {
        return {
            method: 'GET',
            url: `/orchestrator_/odata/Jobs/UiPath.Server.Configuration.OData.GetByKey(identifier=${jobKey})`
        };
    }
}
exports.JobsService = JobsService;
