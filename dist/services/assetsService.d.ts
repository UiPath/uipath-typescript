import { Config } from '../config';
import { ExecutionContext } from '../executionContext';
import { BaseService } from './baseService';
import { UserAsset } from '../models/userAsset';
interface AssetOptions {
    folderKey?: string;
    folderPath?: string;
}
export declare class AssetsService extends BaseService {
    private readonly baseUrl;
    private folderContext;
    constructor(config: Config, executionContext: ExecutionContext);
    /**
     * Retrieve an asset by its name.
     *
     * @param name - The name of the asset
     * @param options - Optional folder settings
     * @returns A promise that resolves to the asset data
     */
    retrieve(name: string, options?: AssetOptions): Promise<UserAsset>;
    /**
     * Gets a specified Orchestrator credential.
     * The robot id is retrieved from the execution context (UIPATH_ROBOT_KEY environment variable)
     *
     * @param name - The name of the credential asset
     * @param options - Optional folder settings
     * @returns A promise that resolves to the decrypted credential password
     */
    retrieveCredential(name: string, options?: AssetOptions): Promise<string | null>;
    /**
     * Update an asset's value.
     *
     * @param robotAsset - The asset object containing the updated values
     * @param options - Optional folder settings
     * @returns A promise that resolves to the updated asset
     */
    update(robotAsset: UserAsset, options?: AssetOptions): Promise<UserAsset>;
    private getRetrieveRequestConfig;
    private getUpdateRequestConfig;
}
export {};
