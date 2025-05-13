import { Config } from '../config';
import { ExecutionContext } from '../executionContext';
import { BaseService } from './baseService';
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
/**
 * Service for managing and executing UiPath automation processes.
 *
 * Processes (also known as automations or workflows) are the core units of
 * automation in UiPath, representing sequences of activities that perform
 * specific business tasks.
 */
export declare class ProcessesService extends BaseService {
    private folderContext;
    constructor(config: Config, executionContext: ExecutionContext);
    /**
     * Start execution of a process by its name.
     *
     * @param options - Process execution options
     * @returns A promise that resolves to the job execution details
     */
    invoke({ name, inputArguments, folderKey, folderPath }: ProcessOptions): Promise<Job>;
    private getInvokeRequestConfig;
    /**
     * List all available processes.
     *
     * @returns A promise that resolves to an array of processes
     */
    list(): Promise<Process[]>;
}
export {};
