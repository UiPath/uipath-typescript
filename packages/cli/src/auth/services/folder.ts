import inquirer from 'inquirer';
import { AUTH_CONSTANTS } from '../../constants/auth.js';
import { getOrchestratorApiUrl } from '../utils/url.js';
import { validateFolderResponse } from '../utils/validation.js';
import { createHeaders } from '../../utils/api.js';
import { pascalToCamelCaseKeys } from '../../utils/transform.js';

export interface Folder {
  key: string;
  displayName: string;
  fullyQualifiedName: string;
  description?: string;
  parentId?: number;
  provisionType?: string;
  permissionModel?: string;
  feedType?: string;
  id?: number;
}

export const getFolders = async (
  accessToken: string,
  baseUrl: string,
  orgName: string,
  tenantName: string
): Promise<Folder[]> => {
  const url = getOrchestratorApiUrl(baseUrl.replace(/https?:\/\//, '').replace('.uipath.com', ''), orgName, tenantName, AUTH_CONSTANTS.API_ENDPOINTS.FOLDERS_NAVIGATION);

  const response = await fetch(url.toString(), {
    headers: createHeaders({ bearerToken: accessToken }),
  });

  if (!response.ok) {
    if (response.status === AUTH_CONSTANTS.HTTP_STATUS.UNAUTHORIZED) {
      throw new Error('Unauthorized: Token may be expired');
    }
    throw new Error(`Failed to fetch folders: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as Record<string, unknown>;
  
  if (!validateFolderResponse(data)) {
    console.warn('Unexpected folder response format');
  }
  
  // Get folders array and transform to camelCase
  const folders = data.PageItems || data.value || [];
  return pascalToCamelCaseKeys(folders) as Folder[];
};

export const selectFolderInteractive = async (
  accessToken: string,
  baseUrl: string,
  orgName: string,
  tenantName: string
): Promise<string | null> => {
  try {
    // Fetch folders
    const folders = await getFolders(accessToken, baseUrl, orgName, tenantName);
    
    if (folders.length === 0) {
      console.log('No folders found in this tenant.');
      return null;
    }

    // Create choices for inquirer
    const choices = [
      ...folders.map(folder => ({
        name: `${folder.displayName} (${folder.fullyQualifiedName})`,
        value: folder.key,
      })),
      { name: AUTH_CONSTANTS.UI.SKIP_LABEL, value: AUTH_CONSTANTS.UI.SKIP_SELECTION }
    ];

    const { selection } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selection',
        message: 'Select a folder:',
        choices,
        pageSize: AUTH_CONSTANTS.UI.PAGE_SIZE,
      },
    ]);

    if (selection === AUTH_CONSTANTS.UI.SKIP_SELECTION) {
      return null;
    }

    return selection;
  } catch (error) {
    console.error('Error selecting folder:', error);
    return null;
  }
};