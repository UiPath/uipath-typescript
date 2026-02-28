import { Command, Flags } from '@oclif/core';
import chalk from 'chalk';
import { MESSAGES } from '../constants/messages.js';
import { track } from '../telemetry/index.js';
import { executePublish } from '../actions/publish.js';

export default class Publish extends Command {
  static override description = 'Publish NuGet packages to UiPath Orchestrator';

  static override examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> --uipathDir ./packages',
    "<%= config.bin %> <%= command.id %> --orgId 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' --tenantId 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' --tenantName 'MyTenant' --accessToken 'your_token'",
  ];

  static override flags = {
    help: Flags.help({ char: 'h' }),
    uipathDir: Flags.string({
      description: 'UiPath directory containing packages',
      default: './.uipath',
    }),
    baseUrl: Flags.string({
      description: 'UiPath base URL (default: https://cloud.uipath.com)',
    }),
    orgId: Flags.string({
      description: 'UiPath organization ID',
    }),
    tenantId: Flags.string({
      description: 'UiPath tenant ID',
    }),
    tenantName: Flags.string({
      description: 'UiPath tenant name',
    }),
    accessToken: Flags.string({
      description: 'UiPath authentication token',
    }),
  };

  @track('Publish')
  public async run(): Promise<void> {
    const { flags } = await this.parse(Publish);
    try {
      await executePublish({
        uipathDir: flags.uipathDir,
        baseUrl: flags.baseUrl,
        orgId: flags.orgId,
        tenantId: flags.tenantId,
        tenantName: flags.tenantName,
        accessToken: flags.accessToken,
        logger: this,
      });
      process.exit(0);
    } catch (error) {
      this.log(chalk.red(`${MESSAGES.ERRORS.PUBLISHING_ERROR_PREFIX} ${error instanceof Error ? error.message : MESSAGES.ERRORS.UNKNOWN_ERROR}`));
      process.exit(1);
    }
  }
}