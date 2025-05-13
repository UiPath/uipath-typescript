import { Config } from '../config';
import { ExecutionContext } from '../executionContext';
import { BaseService } from './baseService';
import { Action } from '../models/action';
interface FolderOptions {
    appFolderKey?: string;
    appFolderPath?: string;
}
/**
 * Service for managing UiPath Actions.
 *
 * Actions are task-based automation components that can be integrated into
 * applications and processes. They represent discrete units of work that can
 * be triggered and monitored through the UiPath API.
 *
 * @see {@link https://docs.uipath.com/automation-cloud/docs/actions|Actions Documentation}
 */
export declare class ActionsService extends BaseService {
    private readonly folderContext;
    constructor(config: Config, executionContext: ExecutionContext);
    /**
     * Creates a new action.
     *
     * @param title - The title of the action
     * @param data - Optional dictionary containing input data for the action
     * @param options - Optional parameters for action creation
     * @returns Created action object
     */
    create(title: string, data?: Record<string, unknown>, options?: {
        appName?: string;
        appKey?: string;
        appFolderPath?: string;
        appFolderKey?: string;
        appVersion?: number;
        assignee?: string;
    }): Promise<Action>;
    /**
     * Retrieves an action by its key.
     *
     * @param actionKey - The unique identifier of the action to retrieve
     * @param options - Optional folder parameters
     * @returns Retrieved action object
     */
    retrieve(actionKey: string, options?: FolderOptions): Promise<Action>;
    private createSpec;
    private retrieveActionSpec;
    private assignTaskSpec;
    private getAppKeyAndSchema;
    private retrieveAppKeySpec;
    private extractDeployedApp;
}
export {};
