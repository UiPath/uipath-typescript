import { Command, Flags } from '@oclif/core';
import chalk from 'chalk';
import { AUTH_CONSTANTS } from '../constants/auth.js';
import { MESSAGES } from '../constants/messages.js';
import { track } from '../telemetry/index.js';
import { executeAuth } from '../actions/auth.js';

const createDomainShorthandFlag = (domain: string, otherDomains: string[]) => {
  return Flags.boolean({
    description: `Authenticate with ${domain} domain (shorthand for --domain ${domain})`,
    exclusive: ['domain', ...otherDomains],
  });
};

export default class Auth extends Command {
  static description = 'Authenticate with UiPath services';

  static examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> --domain alpha',
    '<%= config.bin %> <%= command.id %> --alpha',
    '<%= config.bin %> <%= command.id %> --cloud',
    '<%= config.bin %> <%= command.id %> --staging',
    '<%= config.bin %> <%= command.id %> --logout',
    '<%= config.bin %> <%= command.id %> --clientId <clientId> --clientSecret <clientSecret>',
  ];

  static flags = {
    domain: Flags.string({
      char: 'd',
      description: 'UiPath domain to authenticate with',
      options: [AUTH_CONSTANTS.DOMAINS.CLOUD, AUTH_CONSTANTS.DOMAINS.ALPHA, AUTH_CONSTANTS.DOMAINS.STAGING],
      default: AUTH_CONSTANTS.DOMAINS.CLOUD,
    }),
    alpha: createDomainShorthandFlag('alpha', ['cloud', 'staging']),
    cloud: createDomainShorthandFlag('cloud', ['alpha', 'staging']),
    staging: createDomainShorthandFlag('staging', ['alpha', 'cloud']),
    logout: Flags.boolean({
      char: 'l',
      description: 'Logout and clear stored credentials',
    }),
    force: Flags.boolean({
      char: 'f',
      description: 'Force re-authentication even if valid token exists',
    }),
    clientId: Flags.string({
      description: 'OAuth client ID for confidential client flow',
      dependsOn: ['clientSecret'],
    }),
    clientSecret: Flags.string({
      description: 'OAuth client secret for confidential client flow',
      dependsOn: ['clientId'],
    }),
    scope: Flags.string({
      description: 'OAuth scope for confidential client flow (optional, uses application configured scopes if not provided)',
    }),
  };

  @track('Auth')
  async run(): Promise<void> {
    const { flags } = await this.parse(Auth);
    try {
      await executeAuth({
        domain: flags.domain,
        alpha: flags.alpha,
        cloud: flags.cloud,
        staging: flags.staging,
        logout: flags.logout,
        force: flags.force,
        clientId: flags.clientId,
        clientSecret: flags.clientSecret,
        scope: flags.scope,
        logger: this,
      });
      process.exit(0);
    } catch (error) {
      this.log(chalk.red(error instanceof Error ? error.message : MESSAGES.ERRORS.UNKNOWN_ERROR));
      process.exit(1);
    }
  }
}