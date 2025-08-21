import { Command, Flags } from '@oclif/core';
import chalk from 'chalk';
import ora from 'ora';
import open from 'open';
import inquirer from 'inquirer';
import { generatePKCEChallenge, getAuthorizationUrl } from '../utils/auth/oidc-utils.js';
import { AuthServer } from '../utils/auth/auth-server.js';
import { loadTokens, clearTokens, isTokenExpired, saveTokensWithTenant } from '../utils/auth/token-manager.js';
import { getTenantsAndOrganization, selectTenantInteractive } from '../utils/auth/portal-service.js';
import { selectFolderInteractive } from '../utils/auth/folder-service.js';
import { getBaseUrl } from '../utils/auth/base-url.utils.js';
import { AUTH_CONSTANTS } from '../config/auth-constants.js';

export default class Auth extends Command {
  static description = 'Authenticate with UiPath services';

  static examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> --domain alpha',
    '<%= config.bin %> <%= command.id %> --alpha',
    '<%= config.bin %> <%= command.id %> --cloud',
    '<%= config.bin %> <%= command.id %> --staging',
    '<%= config.bin %> <%= command.id %> --logout',
  ];

  static flags = {
    domain: Flags.string({
      char: 'd',
      description: 'UiPath domain to authenticate with',
      options: ['cloud', 'alpha', 'staging'],
      default: 'cloud',
    }),
    alpha: Flags.boolean({
      description: 'Authenticate with alpha domain (shorthand for --domain alpha)',
      exclusive: ['domain', 'cloud', 'staging'],
    }),
    cloud: Flags.boolean({
      description: 'Authenticate with cloud domain (shorthand for --domain cloud)',
      exclusive: ['domain', 'alpha', 'staging'],
    }),
    staging: Flags.boolean({
      description: 'Authenticate with staging domain (shorthand for --domain staging)',
      exclusive: ['domain', 'alpha', 'cloud'],
    }),
    logout: Flags.boolean({
      char: 'l',
      description: 'Logout and clear stored credentials',
    }),
    port: Flags.integer({
      char: 'p',
      description: 'Local server port for OAuth callback',
      default: AUTH_CONSTANTS.DEFAULT_PORT,
    }),
    force: Flags.boolean({
      char: 'f',
      description: 'Force re-authentication even if valid token exists',
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(Auth);

    // Handle logout
    if (flags.logout) {
      await this.logout();
      return;
    }

    // Determine domain from shorthand flags or use explicit domain
    let domain = flags.domain;
    if (flags.alpha) {
      domain = 'alpha';
    } else if (flags.cloud) {
      domain = 'cloud';
    } else if (flags.staging) {
      domain = 'staging';
    }

    // Check for existing valid token
    if (!flags.force) {
      const existingAuth = await loadTokens();
      if (existingAuth && !isTokenExpired(existingAuth)) {
        this.log(chalk.green('✓ Already authenticated'));
        this.log(chalk.gray(`Organization: ${existingAuth.organization_name || existingAuth.organization_id}`));
        this.log(chalk.gray(`Tenant: ${existingAuth.tenant_name || 'Not selected'}`));
        this.log(chalk.gray(`Domain: ${existingAuth.domain}`));
        this.log(chalk.gray(`Token expires at: ${new Date(existingAuth.expires_at).toLocaleString()}`));
        
        const { reauth } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'reauth',
            message: 'Do you want to re-authenticate?',
            default: false,
          },
        ]);

        if (!reauth) {
          return;
        }
      }
    }

    // Start authentication flow
    await this.authenticate(domain, flags.port);
  }

  private async authenticate(domain: string, port: number): Promise<void> {
    const spinner = ora('Starting authentication process...').start();

    try {
      // Generate PKCE challenge
      const pkce = generatePKCEChallenge();
      
      // Create and start auth server
      const authServer = new AuthServer({
        port,
        domain,
        codeVerifier: pkce.codeVerifier,
        expectedState: pkce.state,
      });

      spinner.text = 'Starting local authentication server...';
      
      // Start server in background
      const authPromise = authServer.start();

      // Generate authorization URL
      const authUrl = getAuthorizationUrl(domain, pkce, port);
      
      spinner.text = 'Opening browser for authentication...';
      
      // Open browser
      await open(authUrl);
      
      spinner.info('Please complete the authentication in your browser');
      this.log(chalk.gray(`\nIf the browser didn't open automatically, visit:`));
      this.log(chalk.blue(authUrl));
      
      // Wait for authentication to complete
      const newSpinner = ora('Waiting for authentication...').start();
      
      try {
        const tokens = await authPromise;
        newSpinner.succeed('Authentication successful!');
        
        // Fetch organizations and tenants
        const orgSpinner = ora('Fetching organization and tenants...').start();
        try {
          const tenantsAndOrg = await getTenantsAndOrganization(tokens.access_token, domain);
          orgSpinner.stop();
          
          // Select tenant interactively
          const selectedTenant = await selectTenantInteractive(tenantsAndOrg, domain);
          
          // Get base URL for folder selection
          const baseUrl = getBaseUrl(domain);
          
          // Select folder
          const folderKey = await selectFolderInteractive(
            tokens.access_token,
            baseUrl,
            selectedTenant.organizationName,
            selectedTenant.tenantName
          );
          
          // Save tokens with tenant information and folder key
          await saveTokensWithTenant(tokens, domain, selectedTenant, folderKey);
          
          this.log(chalk.green('\n✓ Successfully authenticated'));
          this.log(chalk.gray(`Organization: ${selectedTenant.organizationDisplayName} (${selectedTenant.organizationName})`));
          this.log(chalk.gray(`Tenant: ${selectedTenant.tenantDisplayName} (${selectedTenant.tenantName})`));
          if (folderKey) {
            this.log(chalk.gray(`Folder Key: ${folderKey}`));
          }
          this.log(chalk.gray(`Domain: ${domain}`));
          this.log(chalk.gray(`Token expires at: ${new Date(Date.now() + tokens.expires_in * 1000).toLocaleString()}`));
          this.log(chalk.gray('\nCredentials have been saved to .env file'));
        } catch (error) {
          orgSpinner.fail('Failed to fetch organization/tenant information');
          // Log more details about the error
          if (error instanceof Error) {
            this.log(chalk.red(`Error: ${error.message}`));
          }
          throw error;
        }
      } catch (error) {
        newSpinner.fail('Authentication failed');
        throw error;
      }
    } catch (error) {
      spinner.fail('Authentication failed');
      this.error(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  }

  private async logout(): Promise<void> {
    const spinner = ora('Logging out...').start();
    
    try {
      await clearTokens();
      spinner.succeed('Successfully logged out');
      this.log(chalk.gray('Credentials have been removed'));
    } catch (error) {
      spinner.fail('Failed to logout');
      this.error(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  }
}