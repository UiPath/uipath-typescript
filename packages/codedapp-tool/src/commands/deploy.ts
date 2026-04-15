import type { Command } from 'commander';
import { executeDeploy } from '@uipath/uipath-ts-cli/actions';
import { withErrorHandling } from '../utils/error-handler.js';
import { ensureFolderKey } from '../utils/folder-selection.js';

export const registerDeployCommand = (program: Command): void => {
  program
    .command('deploy')
    .allowUnknownOption(false)
    .allowExcessArguments(false)
    .description('Deploy or upgrade app in UiPath')
    .option('-n, --name <name>', 'App name')
    .option('--baseUrl <url>', 'UiPath base URL')
    .option('--orgId <id>', 'Organization ID')
    .option('--orgName <name>', 'Organization name')
    .option('--tenantId <id>', 'Tenant ID')
    .option('--folderKey <key>', 'Folder key')
    .option('--accessToken <token>', 'Access token')
    .action(
      withErrorHandling(async (options: Record<string, unknown>) => {
        if (!options.folderKey) {
          await ensureFolderKey();
        }

        await executeDeploy({
          name: options.name as string | undefined,
          baseUrl: options.baseUrl as string | undefined,
          orgId: options.orgId as string | undefined,
          orgName: options.orgName as string | undefined,
          tenantId: options.tenantId as string | undefined,
          folderKey: (options.folderKey as string | undefined) ?? process.env.UIPATH_FOLDER_KEY,
          accessToken: options.accessToken as string | undefined,
        });
      }),
    );
};
