import { Command, Flags } from '@oclif/core';
import chalk from 'chalk';
import { MESSAGES } from '../constants/messages.js';
import { track } from '../telemetry/index.js';
import { executePublishPolicy } from '../actions/publish-policy.js';
import { COMMON_FLAGS } from '../utils/flags.js';

export default class PublishPolicy extends Command {
  static override description = 'Publish an AI Trust Layer policy to UiPath';

  static override examples = [
    '<%= config.bin %> <%= command.id %> --file ./ai-trust-policies/my-policy.json',
    '<%= config.bin %> <%= command.id %> -f ./policy.json',
    "<%= config.bin %> <%= command.id %> --file './ai-trust-policies/enterprise-policy.json' --orgId 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' --tenantId 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' --accessToken 'your_token'",
  ];

  static override flags = {
    help: Flags.help({ char: 'h' }),
    file: Flags.string({
      char: 'f',
      description: 'Path to the policy JSON file',
      required: true,
    }),
    ...COMMON_FLAGS,
  };

  @track('PublishPolicy')
  public async run(): Promise<void> {
    const { flags } = await this.parse(PublishPolicy);
    try {
      await executePublishPolicy({
        file: flags.file,
        baseUrl: flags.baseUrl,
        orgId: flags.orgId,
        tenantId: flags.tenantId,
        accessToken: flags.accessToken,
        logger: this,
      });
      process.exit(0);
    } catch (error) {
      const msg = error instanceof Error ? error.message : MESSAGES.ERRORS.UNKNOWN_ERROR;
      this.log(chalk.red(MESSAGES.ERRORS.POLICY_PUBLISHING_ERROR_PREFIX + msg));
      process.exit(1);
    }
  }
}
