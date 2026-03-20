import { Command, Flags } from '@oclif/core';
import chalk from 'chalk';
import { MESSAGES } from '../constants/messages.js';
import { track } from '../telemetry/index.js';
import { executeDeployPolicy } from '../actions/deploy-policy.js';
import { COMMON_FLAGS } from '../utils/flags.js';

export default class DeployPolicy extends Command {
  static override description = 'Deploy an AI Trust Layer policy to a tenant';

  static override examples = [
    '<%= config.bin %> <%= command.id %> --policyId b76dd7ea-cf0c-4222-96ea-0f01501cf851',
    '<%= config.bin %> <%= command.id %> -p b76dd7ea-cf0c-4222-96ea-0f01501cf851',
    "<%= config.bin %> <%= command.id %> --policyId 'b76dd7ea-cf0c-4222-96ea-0f01501cf851' --orgId 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' --tenantId 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' --accessToken 'your_token'",
  ];

  static override flags = {
    help: Flags.help({ char: 'h' }),
    policyId: Flags.string({
      char: 'p',
      description: 'Policy ID to deploy (uses stored policy from publish-policy if not provided)',
      required: false,
    }),
    ...COMMON_FLAGS,
  };

  @track('DeployPolicy')
  public async run(): Promise<void> {
    const { flags } = await this.parse(DeployPolicy);
    try {
      await executeDeployPolicy({
        policyId: flags.policyId,
        baseUrl: flags.baseUrl,
        orgId: flags.orgId,
        tenantId: flags.tenantId,
        accessToken: flags.accessToken,
        logger: this,
      });
      process.exit(0);
    } catch (error) {
      const msg = error instanceof Error ? error.message : MESSAGES.ERRORS.UNKNOWN_ERROR;
      this.log(chalk.red(MESSAGES.ERRORS.POLICY_DEPLOY_ERROR_PREFIX + msg));
      process.exit(1);
    }
  }
}
