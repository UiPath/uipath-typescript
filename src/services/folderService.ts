import { Config } from '../config';
import { ExecutionContext } from '../executionContext';
import { BaseService } from './baseService';

interface RequestConfig {
  method: string;
  url: string;
  params?: Record<string, string | number>;
}

/**
 * Service for managing UiPath Folders.
 * 
 * A folder represents a single area for data organization
 * and access control - it is created when you need to categorize, manage, and enforce 
 * authorization rules for a group of UiPath resources (i.e. processes, assets, 
 * connections, storage buckets etc.) or other folders
 */
export class FolderService extends BaseService {
  constructor(config: Config, executionContext: ExecutionContext) {
    super(config, executionContext);
  }

  /**
   * Retrieves a folder key by its path.
   * 
   * @param folderPath - The full path of the folder
   * @returns The folder key if found, undefined otherwise
   */
  async retrieveKeyByFolderPath(folderPath: string): Promise<string | undefined> {
    const spec = this.retrieveSpec(folderPath);
    const response = await this.request<{
      PageItems: Array<{
        Key: string;
        FullyQualifiedName: string;
      }>;
    }>(spec.method, spec.url, { params: spec.params });

    return response.data.PageItems.find(
      item => item.FullyQualifiedName === folderPath
    )?.Key;
  }

  private retrieveSpec(folderPath: string): RequestConfig {
    const folderName = folderPath.split('/').pop() || '';
    return {
      method: 'GET',
      url: '/orchestrator_/api/FoldersNavigation/GetFoldersForCurrentUser',
      params: {
        searchText: folderName,
        take: 1
      }
    };
  }
} 