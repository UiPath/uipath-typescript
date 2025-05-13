import { Config } from '../config';
import { ExecutionContext } from '../executionContext';
import { BaseService } from './baseService';
import { FolderContext } from '../folderContext';
import { UserAsset } from '../models/userAsset';
import { withResourceOverwrites } from '../utils/overwritesManager';
import { headerFolder } from '../utils/headers';

interface AssetOptions {
  folderKey?: string;
  folderPath?: string;
}

export class AssetsService extends BaseService {
  private readonly baseUrl = 'assets';
  private folderContext: FolderContext;

  constructor(config: Config, executionContext: ExecutionContext) {
    super(config, executionContext);
    this.folderContext = new FolderContext(config, executionContext);
  }

  /**
   * Retrieve an asset by its name.
   * 
   * @param name - The name of the asset
   * @param options - Optional folder settings
   * @returns A promise that resolves to the asset data
   */
  async retrieve(name: string, options: AssetOptions = {}): Promise<UserAsset> {
    const [overwrittenName, overwrittenFolderPath] = withResourceOverwrites(
      'asset',
      name,
      options.folderPath
    );

    const { method, url, data, headers } = this.getRetrieveRequestConfig(
      overwrittenName, 
      { ...options, folderPath: overwrittenFolderPath }
    );

    const response = await this.request<UserAsset>(method, url, {
      data,
      headers,
    });

    return response.data;
  }

  /**
   * Gets a specified Orchestrator credential.
   * The robot id is retrieved from the execution context (UIPATH_ROBOT_KEY environment variable)
   * 
   * @param name - The name of the credential asset
   * @param options - Optional folder settings
   * @returns A promise that resolves to the decrypted credential password
   */
  async retrieveCredential(name: string, options: AssetOptions = {}): Promise<string | null> {
    const [overwrittenName, overwrittenFolderPath] = withResourceOverwrites(
      'asset',
      name,
      options.folderPath
    );

    const asset = await this.retrieve(overwrittenName, {
      ...options,
      folderPath: overwrittenFolderPath
    });
    return asset.credentialPassword ?? null;
  }

  /**
   * Update an asset's value.
   * 
   * @param robotAsset - The asset object containing the updated values
   * @param options - Optional folder settings
   * @returns A promise that resolves to the updated asset
   */
  async update(robotAsset: UserAsset, options: AssetOptions = {}): Promise<UserAsset> {
    const [overwrittenName, overwrittenFolderPath] = withResourceOverwrites(
      'asset',
      robotAsset.name || '',
      options.folderPath
    );

    const { method, url, data, headers } = this.getUpdateRequestConfig(
      { ...robotAsset, name: overwrittenName },
      { ...options, folderPath: overwrittenFolderPath }
    );

    const response = await this.request<UserAsset>(method, url, {
      data,
      headers,
    });

    return response.data;
  }

  private getRetrieveRequestConfig(name: string, options: AssetOptions) {
    return {
      method: 'POST',
      url: '/orchestrator_/odata/Assets/UiPath.Server.Configuration.OData.GetRobotAssetByNameForRobotKey',
      data: {
        assetName: name,
        robotKey: this.executionContext.robotKey,
      },
      headers: {
        ...headerFolder(options.folderKey, options.folderPath)
      },
    };
  }

  private getUpdateRequestConfig(robotAsset: UserAsset, options: AssetOptions) {
    return {
      method: 'POST',
      url: '/orchestrator_/odata/Assets/UiPath.Server.Configuration.OData.SetRobotAssetByRobotKey',
      data: {
        robotKey: this.executionContext.robotKey,
        robotAsset,
      },
      headers: {
        ...headerFolder(options.folderKey, options.folderPath)
      },
    };
  }
} 