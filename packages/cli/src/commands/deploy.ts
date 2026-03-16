import { Command, Flags } from '@oclif/core';
import chalk from 'chalk';
import { MESSAGES } from '../constants/messages.js';
import { track } from '../telemetry/index.js';
import { executeDeploy } from '../actions/deploy.js';
import { COMMON_FLAGS } from '../utils/flags.js';

export default class Deploy extends Command {
  static override description = 'Deploy or upgrade a UiPath app';

  static override examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> --name MyApp',
    '<%= config.bin %> <%= command.id %> --name MyApp --version 1.2.0',
    "<%= config.bin %> <%= command.id %> --name 'MyApp' --orgId 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' --orgName 'YourOrgName' --tenantId 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' --folderKey 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' --accessToken 'your_token'",
  ];

  static override flags = {
    help: Flags.help({ char: 'h' }),
    name: Flags.string({
      char: 'n',
      description: 'App name',
    }),
    version: Flags.string({
      char: 'v',
      description: 'Published app version to deploy (e.g. 1.2.0). Defaults to the latest published version.',
    }),
    ...COMMON_FLAGS,
  };

  @track('Deploy')
  public async run(): Promise<void> {
    const { flags } = await this.parse(Deploy);
    try {
      await executeDeploy({
        name: flags.name,
        version: flags.version,
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
      this.log(chalk.red(MESSAGES.ERRORS.DEPLOYMENT_ERROR_PREFIX + msg));
      process.exit(1);
    }
  }
}
