import { Config } from '../config';
import { ExecutionContext } from '../executionContext';
import { BaseService } from './baseService';
import { Job } from '../models/job';
/**
 * Service for managing API payloads and job inbox interactions.
 *
 * A job represents a single execution of an automation - it is created when you start
 * a process and contains information about that specific run, including its status,
 * start time, and any input/output data.
 */
export declare class JobsService extends BaseService {
    constructor(config: Config, executionContext: ExecutionContext);
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
    resume({ inboxId, jobId, payload, folderKey, folderPath }: {
        inboxId?: string;
        jobId?: string;
        payload: unknown;
        folderKey?: string;
        folderPath?: string;
    }): Promise<void>;
    /**
     * Retrieve job information by its key.
     *
     * @param jobKey - The key of the job to retrieve
     */
    retrieve(jobKey: string): Promise<Job>;
    private retrieveInboxId;
    private getRetrieveInboxIdRequestConfig;
    private getResumeRequestConfig;
    private getRetrieveRequestConfig;
}
