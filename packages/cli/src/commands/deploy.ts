import { Command, Flags } from '@oclif/core';
import chalk from 'chalk';
import { MESSAGES } from '../constants/index.js';
import { track } from '../telemetry/index.js';
import { executeDeploy } from '../actions/deploy.js';

export default class Deploy extends Command {
  static override description = 'Deploy or upgrade a UiPath app';

  static override examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> --name MyApp',
    "<%= config.bin %> <%= command.id %> --name 'MyApp' --orgId 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' --orgName 'YourOrgName' --tenantId 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' --folderKey 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' --accessToken 'your_token'",
  ];

  static override flags = {
    help: Flags.help({ char: 'h' }),
    name: Flags.string({
      char: 'n',
      description: 'App name',
    }),
    baseUrl: Flags.string({
      description: 'UiPath base URL (default: https://cloud.uipath.com)',
    }),
    orgId: Flags.string({
      description: 'UiPath organization ID',
    }),
    orgName: Flags.string({
      description: 'UiPath organization name',
    }),
    tenantId: Flags.string({
      description: 'UiPath tenant ID',
    }),
    folderKey: Flags.string({
      description: 'UiPath folder key',
    }),
    accessToken: Flags.string({
      description: 'UiPath bearer token for authentication',
    }),
  };

  @track('Deploy')
  public async run(): Promise<void> {
    const { flags } = await this.parse(Deploy);
    try {
      await executeDeploy({
        name: flags.name,
        baseUrl: flags.baseUrl,
        orgId: flags.orgId,
        orgName: flags.orgName,
        tenantId: flags.tenantId,
        folderKey: flags.folderKey,
        accessToken: flags.accessToken,
        logger: this,
      });
      process.exit(0);
    } catch (error) {
      const msg = error instanceof Error ? error.message : MESSAGES.ERRORS.UNKNOWN_ERROR;
      this.log(chalk.red(`${MESSAGES.ERRORS.DEPLOYMENT_ERROR_PREFIX} ${msg}`));
      process.exit(1);
    }
  }
}
