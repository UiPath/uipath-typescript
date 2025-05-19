import { Config } from '../config';
import { ExecutionContext } from '../executionContext';
import { BaseService } from './baseService';
import { FolderContext } from '../folderContext';
import { headerFolder } from '../utils/headers';
import { RequestSpec } from '../models/requestSpec';
import { HEADERS } from '../utils/constants';

export interface Job {
  id: string;
  state: string;
}

export interface Process {
  name: string;
  description?: string;
  id: string;
}

interface ProcessOptions {
  name: string;
  inputArguments?: Record<string, unknown>;
  folderKey?: string;
  folderPath?: string;
}

interface ProcessesResponse {
  '@odata.context': string;
  '@odata.count': number;
  value: Process[];
}

/**
 * Service for managing and executing UiPath automation processes.
 * 
 * Processes (also known as automations or workflows) are the core units of
 * automation in UiPath, representing sequences of activities that perform
 * specific business tasks.
 */
export class ProcessesService extends BaseService {
  private folderContext: FolderContext;

  constructor(config: Config, executionContext: ExecutionContext) {
    super(config, executionContext);
    this.folderContext = new FolderContext(config, executionContext);
  }

  /**
   * Start execution of a process by its name.
   * 
   * @param options - Process execution options
   * @returns A promise that resolves to the job execution details
   */
  async invoke({
    name,
    inputArguments,
    folderKey,
    folderPath
  }: ProcessOptions): Promise<Job> {
    const spec = this.getInvokeRequestConfig({
      name,
      inputArguments,
      folderKey,
      folderPath
    });

    const response = await this.requestWithSpec<{ value: Job[] }>(spec);
    return response.data.value[0];
  }

  private getInvokeRequestConfig({
    name,
    inputArguments,
    folderKey,
    folderPath
  }: ProcessOptions): RequestSpec {
    const headers = {
      ...headerFolder(folderKey, folderPath)
    };

    // Add job ID if available
    const jobId = process.env.UIPATH_JOB_ID;
    if (jobId) {
      headers[HEADERS.JOB_KEY] = jobId;
    }

    return {
      method: 'POST',
      url: '/orchestrator_/odata/Jobs/UiPath.Server.Configuration.OData.StartJobs',
      data: {
        startInfo: {
          ReleaseName: name,
          InputArguments: inputArguments ? JSON.stringify(inputArguments) : '{}',
        },
      },
      headers,
    };
  }

  /**
   * List all available processes.
   * 
   * @returns A promise that resolves to an array of processes
   */
  async list(): Promise<Process[]> {
    const response = await this.request<ProcessesResponse>(
      'GET',
      '/orchestrator_/odata/Processes',
      {
        headers: {
          ...this.folderContext.folderHeaders
        }
      }
    );

    return response.data.value;
  }
}
