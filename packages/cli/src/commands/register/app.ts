import { Command, Flags } from '@oclif/core';
import chalk from 'chalk';
import { AppType } from '../../types/action-app.js';
import { MESSAGES } from '../../constants/messages.js';
import { track } from '../../telemetry/index.js';
import { executeRegisterApp } from '../../actions/register-app.js';

export default class RegisterApp extends Command {
  static override description = 'Register app with UiPath and get the app URL for OAuth configuration';

  static override examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> --name MyApp',
    '<%= config.bin %> <%= command.id %> --name MyApp --version 1.0.0',
    '<%= config.bin %> <%= command.id %> --name MyApp --version 1.0.0 --type Action',
    "<%= config.bin %> <%= command.id %> --name 'MyApp' --orgId 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' --tenantId 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' --tenantName 'MyTenant' --folderKey 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' --accessToken 'your_token'",
  ];

  static override flags = {
    help: Flags.help({ char: 'h' }),
    name: Flags.string({
      char: 'n',
      description: 'App name',
    }),
    version: Flags.string({
      char: 'v',
      description: 'App version',
      default: '1.0.0',
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
    folderKey: Flags.string({
      description: 'UiPath folder key',
    }),
    accessToken: Flags.string({
      description: 'UiPath bearer token for authentication',
    }),
    type: Flags.string({
      char: 't',
      description: 'App Type',
      default: AppType.Web,
      options: [AppType.Web, AppType.Action]
    })
  };

  @track('RegisterApp')
  public async run(): Promise<void> {
    const { flags } = await this.parse(RegisterApp);
    try {
      await executeRegisterApp({
        name: flags.name,
        version: flags.version,
        type: flags.type,
        baseUrl: flags.baseUrl,
        orgId: flags.orgId,
        tenantId: flags.tenantId,
        tenantName: flags.tenantName,
        folderKey: flags.folderKey,
        accessToken: flags.accessToken,
        logger: this,
      });
      process.exit(0);
    } catch (error) {
      this.log(chalk.red(`${MESSAGES.ERRORS.REGISTRATION_ERROR_PREFIX} ${error instanceof Error ? error.message : MESSAGES.ERRORS.UNKNOWN_ERROR}`));
      process.exit(1);
    }
  }
}
