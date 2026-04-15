import type { Command } from 'commander';
import { executePush } from '@uipath/uipath-ts-cli/actions';
import { resolveEnvFilePathAsync, saveEnvFileAsync } from '@uipath/auth';
import { withErrorHandling } from '../utils/error-handler.js';

export const registerPushCommand = (program: Command): void => {
  program
    .command('push')
    .allowUnknownOption(false)
    .allowExcessArguments(false)
    .description('Push local source code to Studio Web')
    .argument('[project-id]', 'WebApp Project ID')
    .option('--buildDir <dir>', 'Build output directory', 'dist')
    .option('--ignoreResources', 'Skip importing referenced resources')
    .option('--baseUrl <url>', 'UiPath base URL')
    .option('--orgId <id>', 'Organization ID')
    .option('--tenantId <id>', 'Tenant ID')
    .option('--accessToken <token>', 'Access token')
    .action(
      withErrorHandling(async (projectId: string | undefined, options: Record<string, unknown>) => {
        const hadProjectId = !!(projectId || process.env.UIPATH_PROJECT_ID);

        await executePush({
          projectId,
          buildDir: options.buildDir as string | undefined,
          ignoreResources: options.ignoreResources as boolean | undefined,
          baseUrl: options.baseUrl as string | undefined,
          orgId: options.orgId as string | undefined,
          tenantId: options.tenantId as string | undefined,
          accessToken: options.accessToken as string | undefined,
        });

        // If a new project was created during push, persist the ID to the
        // auth credential store so subsequent runs pick it up.
        if (!hadProjectId && process.env.UIPATH_PROJECT_ID) {
          try {
            const { absolutePath } = await resolveEnvFilePathAsync();
            if (absolutePath) {
              await saveEnvFileAsync({
                envPath: absolutePath,
                data: { UIPATH_PROJECT_ID: process.env.UIPATH_PROJECT_ID },
                merge: true,
              });
            }
          } catch {
            // Best-effort — user can set UIPATH_PROJECT_ID manually
          }
        }
      }),
    );
};
