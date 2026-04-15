import inquirer from 'inquirer';
import chalk from 'chalk';

interface Folder {
  key: string;
  displayName: string;
  fullyQualifiedName: string;
}

/**
 * Fetch folders from the Orchestrator API for the current user.
 */
async function fetchFolders(
  baseUrl: string,
  accessToken: string,
  orgId: string,
  tenantName: string,
): Promise<Folder[]> {
  const url = `${baseUrl}/${orgId}/${tenantName}/orchestrator_/api/Folders/GetAllForCurrentUser`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch folders: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as Record<string, unknown>;
  const items = (data.PageItems ?? data.value ?? []) as Record<string, unknown>[];

  return items.map((item) => ({
    key: String(item.Key ?? item.key ?? ''),
    displayName: String(item.DisplayName ?? item.displayName ?? ''),
    fullyQualifiedName: String(item.FullyQualifiedName ?? item.fullyQualifiedName ?? ''),
  }));
}

/**
 * Prompt the user to select a folder interactively.
 * Returns the folder key or null if skipped.
 */
async function promptFolderSelection(folders: Folder[]): Promise<string | null> {
  if (folders.length === 0) {
    console.log(chalk.yellow('No folders found in this tenant.'));
    return null;
  }

  if (folders.length === 1) {
    console.log(chalk.green(`Only one folder available: ${folders[0].displayName}. Selected.`));
    return folders[0].key;
  }

  const { selection } = await inquirer.prompt<{ selection: string }>([
    {
      type: 'list',
      name: 'selection',
      message: 'Select a folder:',
      choices: [
        ...folders.map((f) => ({
          name: `${f.displayName} (${f.fullyQualifiedName})`,
          value: f.key,
        })),
        { name: 'Skip folder selection', value: '__skip__' },
      ],
      pageSize: 10,
    },
  ]);

  if (selection === '__skip__') {
    return null;
  }

  const selected = folders.find((f) => f.key === selection);
  if (selected) {
    console.log(chalk.green(`Selected folder: ${selected.displayName}`));
  }
  return selection;
}

/**
 * Ensures UIPATH_FOLDER_KEY is available in process.env for the current session.
 *
 * If the folder key is missing and valid auth credentials exist,
 * the user is prompted to pick a folder interactively.
 * The selection is only set in process.env (in-memory) — nothing is persisted.
 * Users who want a permanent selection can set UIPATH_FOLDER_KEY in their
 * own .env or pass --folderKey explicitly.
 */
export async function ensureFolderKey(): Promise<void> {
  if (process.env.UIPATH_FOLDER_KEY) return;

  const baseUrl = process.env.UIPATH_BASE_URL;
  const accessToken = process.env.UIPATH_ACCESS_TOKEN;
  const orgId = process.env.UIPATH_ORG_ID;
  const tenantName = process.env.UIPATH_TENANT_NAME;

  if (!baseUrl || !accessToken || !orgId || !tenantName) return;

  try {
    const folders = await fetchFolders(baseUrl, accessToken, orgId, tenantName);
    const folderKey = await promptFolderSelection(folders);

    if (folderKey) {
      process.env.UIPATH_FOLDER_KEY = folderKey;
    }
  } catch (error) {
    console.error(chalk.yellow(`Could not fetch folders: ${error instanceof Error ? error.message : 'Unknown error'}`));
    console.error(chalk.yellow('You can provide --folderKey manually or set UIPATH_FOLDER_KEY in your .env.'));
  }
}
