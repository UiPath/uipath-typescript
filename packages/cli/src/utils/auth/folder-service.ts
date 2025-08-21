import inquirer from 'inquirer';
import { AUTH_CONSTANTS } from '../../config/auth-constants.js';
import { getOrchestratorApiUrl } from './base-url.utils.js';
import { validateFolderResponse } from './validation.utils.js';

export interface Folder {
  Key: string;
  DisplayName: string;
  FullyQualifiedName: string;
  Description?: string;
  ParentId?: number;
  ProvisionType?: string;
  PermissionModel?: string;
  FeedType?: string;
  Id?: number;
}

interface FolderContextResponse {
  "@odata.context"?: string;
  PageItems?: Folder[];
  value?: Folder[];
}

export const getFolders = async (
  accessToken: string,
  baseUrl: string,
  orgName: string,
  tenantName: string
): Promise<Folder[]> => {
  const url = getOrchestratorApiUrl(baseUrl.replace(/https?:\/\//, '').replace('.uipath.com', ''), orgName, tenantName, '/FoldersNavigation/GetFolderContext');

  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    if (response.status === AUTH_CONSTANTS.HTTP_STATUS.UNAUTHORIZED) {
      throw new Error('Unauthorized: Token may be expired');
    }
    throw new Error(`Failed to fetch folders: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as FolderContextResponse;
  
  if (!validateFolderResponse(data)) {
    console.warn('Unexpected folder response format');
  }
  
  return data.PageItems || data.value || [];
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
        name: `${folder.DisplayName} (${folder.FullyQualifiedName})`,
        value: folder.Key,
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