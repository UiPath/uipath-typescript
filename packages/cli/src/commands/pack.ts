import { Command, Flags, Args } from '@oclif/core';
import chalk from 'chalk';
import { MESSAGES } from '../constants/messages.js';
import { DEFAULT_APP_VERSION } from '../constants/index.js';
import { track } from '../telemetry/index.js';
import { executePack } from '../actions/pack.js';

export default class Pack extends Command {
  static override description = 'Package UiPath projects as NuGet packages with metadata files (no external dependencies required)';

  static override examples = [
    '<%= config.bin %> <%= command.id %> ./dist',
    '<%= config.bin %> <%= command.id %> ./dist --name MyApp',
    '<%= config.bin %> <%= command.id %> ./dist --name MyApp --version 1.0.0',
    '<%= config.bin %> <%= command.id %> ./dist --output ./.uipath',
    '<%= config.bin %> <%= command.id %> ./dist --dry-run',
    '<%= config.bin %> <%= command.id %> ./dist --name MyApp --orgId \'xxxx\' --tenantId \'xxxx\' --accessToken \'your_token\'',
  ];

  static override args = {
    dist: Args.string({
      description: 'Path to the dist folder containing built application',
      required: true,
    }),
  };

  static override flags = {
    help: Flags.help({ char: 'h' }),
    name: Flags.string({
      char: 'n',
      description: 'Package name (will be sanitized for NuGet)',
      required: false,
    }),
    version: Flags.string({
      char: 'v',
      description: 'Package version (semantic version)',
      default: DEFAULT_APP_VERSION,
    }),
    output: Flags.string({
      char: 'o',
      description: 'Output directory for the .nupkg package',
      default: './.uipath',
    }),
    author: Flags.string({
      char: 'a',
      description: 'Package author',
      default: 'UiPath Developer',
    }),
    description: Flags.string({
      description: 'Package description',
    }),
    'main-file': Flags.string({
      description: 'Main entry file (default: index.html)',
      default: 'index.html',
    }),
    'content-type': Flags.string({
      description: 'Content type (webapp, library, process)',
      default: 'webapp',
      options: ['webapp', 'library', 'process'],
    }),
    'dry-run': Flags.boolean({
      description: 'Show what would be packaged without creating the package',
      default: false,
    }),
    'reuse-client': Flags.boolean({
      description: 'Reuse existing clientId from uipath.json instead of letting UiPath create a new one',
      default: false,
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
    accessToken: Flags.string({
      description: 'UiPath bearer token for authentication',
    }),
  };

  @track('Pack')
  public async run(): Promise<void> {
    const { args, flags } = await this.parse(Pack);
    try {
      await executePack({
        dist: args.dist,
        name: flags.name,
        version: flags.version,
        output: flags.output,
        author: flags.author,
        description: flags.description,
        mainFile: flags['main-file'],
        contentType: flags['content-type'],
        dryRun: flags['dry-run'],
        reuseClient: flags['reuse-client'],
        baseUrl: flags.baseUrl,
        orgId: flags.orgId,
        tenantId: flags.tenantId,
        accessToken: flags.accessToken,
        logger: this,
      });
      process.exit(0);
    } catch (error) {
      const msg = error instanceof Error ? error.message : MESSAGES.ERRORS.UNKNOWN_ERROR;
      this.log(chalk.red(`${MESSAGES.ERRORS.PACKAGING_ERROR_PREFIX} ${msg}`));
      process.exit(1);
    }
  }
}
