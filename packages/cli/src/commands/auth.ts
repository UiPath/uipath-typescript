import { Command, Flags } from '@oclif/core';
import chalk from 'chalk';
import ora, { Ora } from 'ora';
import open from 'open';
import inquirer from 'inquirer';
import { generatePKCEChallenge, getAuthorizationUrl, TokenResponse } from '../auth/core/oidc.js';
import { AuthServer } from '../auth/server/auth-server.js';
import { loadTokens, clearTokens, isTokenExpired, saveTokensWithTenant } from '../auth/core/token-manager.js';
import { getTenantsAndOrganization, selectTenantInteractive, SelectedTenant } from '../auth/services/portal.js';
import { selectFolderInteractive } from '../auth/services/folder.js';
import { getBaseUrl } from '../auth/utils/url.js';
import { getFormattedExpirationDate } from '../auth/utils/date.js';
import { AUTH_CONSTANTS } from '../constants/auth.js';
import { isPortAvailable } from '../auth/utils/port-checker.js';

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
      domain = AUTH_CONSTANTS.DOMAINS.ALPHA;
    } else if (flags.cloud) {
      domain = AUTH_CONSTANTS.DOMAINS.CLOUD;
    } else if (flags.staging) {
      domain = AUTH_CONSTANTS.DOMAINS.STAGING;
    }

    // Check for existing valid token
    if (!flags.force) {
      const existingAuth = await loadTokens();
      if (existingAuth && !isTokenExpired(existingAuth)) {
        this.log(chalk.green('✓ Already authenticated'));
        this.log(chalk.gray(`Organization: ${existingAuth.organizationName || existingAuth.organizationId}`));
        this.log(chalk.gray(`Tenant: ${existingAuth.tenantName || 'Not selected'}`));
        this.log(chalk.gray(`Domain: ${existingAuth.domain}`));
        this.log(chalk.gray(`Token expires at: ${new Date(existingAuth.expiresAt).toLocaleString()}`));
        
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
    await this.authenticate(domain);
  }

  private async authenticate(domain: string): Promise<void> {
    const spinner = ora('Finding available port...').start();
    
    // Try to find an available port from the allowed ports
    let availablePort: number | null = null;
    for (const port of AUTH_CONSTANTS.ALTERNATIVE_PORTS) {
      const portAvailable = await isPortAvailable(port);
      if (portAvailable) {
        availablePort = port;
        break;
      }
    }
    
    if (!availablePort) {
      spinner.fail('All registered ports are in use');
      this.log(chalk.red(`\nAll registered ports (${AUTH_CONSTANTS.ALTERNATIVE_PORTS.join(', ')}) are currently in use.`));
      this.log(chalk.gray(`\nPlease free up one of these ports by stopping applications running on them:`));
      for (const port of AUTH_CONSTANTS.ALTERNATIVE_PORTS) {
        this.log(chalk.gray(`  • Port ${port}: ${chalk.cyan(`lsof -i :${port}`)} (macOS/Linux) or ${chalk.cyan(`netstat -ano | findstr :${port}`)} (Windows)`));
      }
      this.error('All registered ports are in use. Please free up one of the ports listed above and try again.');
    }
    
    spinner.succeed(`Using port ${availablePort}`);
    
    spinner.text = 'Starting authentication process...';
    let authServer: AuthServer | null = null;

    try {
      // Step 1: Set up authentication server and browser flow
      const { authServer: server, authPromise } = await this.startAuthenticationFlow(domain, availablePort, spinner);
      authServer = server;
      
      // Step 2: Wait for user to complete browser authentication
      const tokens = await this.waitForBrowserAuthentication(authPromise);
      
      // Step 3: Configure tenant and folder settings
      const selectedTenant = await this.configureTenantAndFolder(tokens, domain);
      
      // Step 4: Save credentials and display success
      await this.saveCredentialsAndFinish(tokens, domain, selectedTenant);
      
    } catch (error) {
      spinner.fail('Authentication failed');
      this.error(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      // Always clean up the auth server
      authServer?.stop();
    }
  }

  private async startAuthenticationFlow(
    domain: string, 
    port: number, 
    spinner: Ora
  ): Promise<{ authServer: AuthServer; authPromise: Promise<TokenResponse> }> {
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

    // Generate authorization URL and open browser
    const authUrl = getAuthorizationUrl(domain, pkce, port);
    
    spinner.text = 'Opening browser for authentication...';
    await open(authUrl);
    
    spinner.info('Please complete the authentication in your browser');
    this.log(chalk.gray(`\nIf the browser didn't open automatically, visit:`));
    this.log(chalk.blue(authUrl));
    
    return { authServer, authPromise };
  }

  private async waitForBrowserAuthentication(authPromise: Promise<TokenResponse>): Promise<TokenResponse> {
    const spinner = ora('Waiting for authentication...').start();
    
    try {
      const tokens = await authPromise;
      spinner.succeed('Authentication successful!');
      return tokens;
    } catch (error) {
      spinner.fail('Authentication failed');
      throw error;
    }
  }

  private async configureTenantAndFolder(
    tokens: TokenResponse, 
    domain: string
  ): Promise<SelectedTenant & { folderKey?: string | null }> {
    const orgSpinner = ora('Fetching organization and tenants...').start();
    
    try {
      // Fetch and select tenant
      const tenantsAndOrg = await getTenantsAndOrganization(tokens.accessToken, domain);
      orgSpinner.stop();
      
      const selectedTenant = await selectTenantInteractive(tenantsAndOrg, domain);
      
      // Select folder
      const baseUrl = getBaseUrl(domain);
      const folderKey = await selectFolderInteractive(
        tokens.accessToken,
        baseUrl,
        selectedTenant.organizationName,
        selectedTenant.tenantName
      );
      
      return { ...selectedTenant, folderKey };
    } catch (error) {
      orgSpinner.fail('Failed to fetch organization/tenant information');
      if (error instanceof Error) {
        this.log(chalk.red(`Error: ${error.message}`));
      }
      throw error;
    }
  }

  private async saveCredentialsAndFinish(
    tokens: TokenResponse,
    domain: string,
    selectedTenant: SelectedTenant & { folderKey?: string | null }
  ): Promise<void> {
    // Save tokens with tenant information
    await saveTokensWithTenant(tokens, domain, selectedTenant, selectedTenant.folderKey);
    
    // Display success information
    this.displayAuthenticationSuccess(tokens, domain, selectedTenant);
  }

  private displayAuthenticationSuccess(
    tokens: TokenResponse,
    domain: string,
    selectedTenant: SelectedTenant & { folderKey?: string | null }
  ): void {
    this.log(chalk.green('\n✓ Successfully authenticated'));
    this.log(chalk.gray(`Organization: ${selectedTenant.organizationDisplayName} (${selectedTenant.organizationName})`));
    this.log(chalk.gray(`Tenant: ${selectedTenant.tenantDisplayName} (${selectedTenant.tenantName})`));
    
    if (selectedTenant.folderKey) {
      this.log(chalk.gray(`Folder Key: ${selectedTenant.folderKey}`));
    }
    
    this.log(chalk.gray(`Domain: ${domain}`));
    this.log(chalk.gray(`Token expires at: ${getFormattedExpirationDate(tokens.expiresIn)}`));
    this.log(chalk.gray('\nCredentials have been saved to .env file'));
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