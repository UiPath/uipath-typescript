/**
 * Folder service test constants
 * Folder-specific constants only
 */

const FOLDER_KEY = '3cb92d99-9d2f-4c8c-9b8a-9b8a9b8a9b8a';
const PARENT_KEY = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

export const FOLDER_TEST_CONSTANTS = {
  FOLDER_KEY,
  PARENT_KEY,
  RAW_FOLDER: {
    Id: 123,
    Key: FOLDER_KEY,
    DisplayName: 'Finance',
    FullyQualifiedName: 'Shared/Finance',
    Description: 'AP invoices',
    FolderType: 'Standard',
    IsPersonal: false,
    ProvisionType: 'Automatic',
    PermissionModel: 'FineGrained',
    ParentId: 10,
    ParentKey: PARENT_KEY,
    FeedType: 'Processes',
  },
} as const;
