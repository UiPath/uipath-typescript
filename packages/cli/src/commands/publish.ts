import { Command, Flags } from '@oclif/core';
import chalk from 'chalk';
import { AppType } from '../types/action-app.js';
import { MESSAGES } from '../constants/messages.js';
import { track } from '../telemetry/index.js';
import { executePublish } from '../actions/publish.js';

export default class Publish extends Command {
  static override description = 'Publish NuGet packages to UiPath Orchestrator';

  static override examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> --name MyApp',
    '<%= config.bin %> <%= command.id %> --name MyApp --version 2.0.0',
    '<%= config.bin %> <%= command.id %> --uipathDir ./packages',
    '<%= config.bin %> <%= command.id %> --name MyApp --type Action',
    "<%= config.bin %> <%= command.id %> --name MyApp --version 2.0.0 --orgId 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' --tenantId 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' --tenantName 'MyTenant' --accessToken 'your_token'",
  ];

  static override flags = {
    help: Flags.help({ char: 'h' }),
    name: Flags.string({
      char: 'n',
      description: 'Package name to publish (makes command non-interactive)',
    }),
    version: Flags.string({
      char: 'v',
      description: 'Package version to publish (requires --name flag)',
    }),
    uipathDir: Flags.string({
      description: 'UiPath directory containing packages',
      default: './.uipath',
    }),
    baseUrl: Flags.string({
      description: 'UiPath base URL (default: https://alpha.uipath.com)',
    }),
    orgId: Flags.string({
      description: 'UiPath organization ID',
    }),
    tenantId: Flags.string({
      description: 'UiPath tenant ID',
    }),
    tenantName: Flags.string({
      description: 'UiPath tenant name (required for coded app registration)',
    }),
    accessToken: Flags.string({
      description: 'UiPath authentication token',
    }),
    type: Flags.string({
      char: 't',
      description: 'App type',
      default: AppType.Web,
      options: [AppType.Web, AppType.Action],
    }),
  };

  @track('Publish')
  public async run(): Promise<void> {
    const { flags } = await this.parse(Publish);
    try {
      await executePublish({
        uipathDir: flags.uipathDir,
        name: flags.name,
        version: flags.version,
        type: flags.type,
        baseUrl: flags.baseUrl,
        orgId: flags.orgId,
        tenantId: flags.tenantId,
        tenantName: flags.tenantName,
        accessToken: flags.accessToken,
        logger: this,
      });
      process.exit(0);
    } catch (error) {
      const msg = error instanceof Error ? error.message : MESSAGES.ERRORS.UNKNOWN_ERROR;
      this.log(chalk.red(`${MESSAGES.ERRORS.PUBLISHING_ERROR_PREFIX} ${msg}`));
      process.exit(1);
    }
  }
}
