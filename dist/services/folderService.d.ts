import { Config } from '../config';
import { ExecutionContext } from '../executionContext';
import { BaseService } from './baseService';
/**
 * Service for managing UiPath Folders.
 *
 * A folder represents a single area for data organization
 * and access control - it is created when you need to categorize, manage, and enforce
 * authorization rules for a group of UiPath resources (i.e. processes, assets,
 * connections, storage buckets etc.) or other folders
 */
export declare class FolderService extends BaseService {
    constructor(config: Config, executionContext: ExecutionContext);
    /**
     * Retrieves a folder key by its path.
     *
     * @param folderPath - The full path of the folder
     * @returns The folder key if found, undefined otherwise
     */
    retrieveKeyByFolderPath(folderPath: string): Promise<string | undefined>;
    private retrieveSpec;
}
