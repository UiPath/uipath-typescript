import { Config } from '../config';
import { ExecutionContext } from '../executionContext';
import { BaseService } from './baseService';
import { headerFolder } from '../utils/headers';
import { Job } from '../models/job';

interface JobOptions {
  folderKey?: string;
  folderPath?: string;
}

/**
 * Service for managing API payloads and job inbox interactions.
 * 
 * A job represents a single execution of an automation - it is created when you start
 * a process and contains information about that specific run, including its status,
 * start time, and any input/output data.
 */
export class JobsService extends BaseService {
  constructor(config: Config, executionContext: ExecutionContext) {
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
  async resume({
    inboxId,
    jobId,
    payload,
    folderKey,
    folderPath
  }: {
    inboxId?: string;
    jobId?: string;
    payload: unknown;
    folderKey?: string;
    folderPath?: string;
  }): Promise<void> {
    if (!jobId && !inboxId) {
      throw new Error('Either jobId or inboxId must be provided');
    }

    const actualInboxId = inboxId ?? await this.retrieveInboxId({
      jobId: jobId!,
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
  async retrieve(jobKey: string): Promise<Job> {
    const { method, url } = this.getRetrieveRequestConfig(jobKey);
    const response = await this.request<Job>(method, url);
    return response.data;
  }

  private async retrieveInboxId({
    jobId,
    folderKey,
    folderPath
  }: {
    jobId: string;
    folderKey?: string;
    folderPath?: string;
  }): Promise<string> {
    const { method, url, params, headers } = this.getRetrieveInboxIdRequestConfig({
      jobId,
      folderKey,
      folderPath
    });

    const response = await this.request<{ value: Array<{ ItemKey: string }> }>(
      method,
      url,
      { params, headers }
    );

    if (response.data.value.length === 0) {
      throw new Error('No inbox found');
    }

    return response.data.value[0].ItemKey;
  }

  private getRetrieveInboxIdRequestConfig({
    jobId,
    folderKey,
    folderPath
  }: {
    jobId: string;
    folderKey?: string;
    folderPath?: string;
  }) {
    return {
      method: 'GET',
      url: '/orchestrator_/odata/JobTriggers',
      params: {
        '$filter': `JobId eq ${jobId}`,
        '$top': 1,
        '$select': 'ItemKey'
      },
      headers: {
        ...headerFolder(folderKey, folderPath)
      }
    };
  }

  private getResumeRequestConfig({
    inboxId,
    payload,
    folderKey,
    folderPath
  }: {
    inboxId: string;
    payload: unknown;
    folderKey?: string;
    folderPath?: string;
  }) {
    return {
      method: 'POST',
      url: `/orchestrator_/api/JobTriggers/DeliverPayload/${inboxId}`,
      data: { payload },
      headers: {
        ...headerFolder(folderKey, folderPath)
      }
    };
  }

  private getRetrieveRequestConfig(jobKey: string) {
    return {
      method: 'GET',
      url: `/orchestrator_/odata/Jobs/UiPath.Server.Configuration.OData.GetByKey(identifier=${jobKey})`
    };
  }
} 