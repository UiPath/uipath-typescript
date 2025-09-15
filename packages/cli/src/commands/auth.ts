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
import { MESSAGES } from '../constants/messages.js';
import { isPortAvailable } from '../auth/utils/port-checker.js';
import { track } from '../telemetry/index.js';

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

  @track('Auth')
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
        this.log(chalk.green(MESSAGES.SUCCESS.ALREADY_AUTHENTICATED));
        this.log(chalk.gray(`Organization: ${existingAuth.organizationName || existingAuth.organizationId}`));
        this.log(chalk.gray(`Tenant: ${existingAuth.tenantName || 'Not selected'}`));
        this.log(chalk.gray(`Domain: ${existingAuth.domain}`));
        this.log(chalk.gray(`Token expires at: ${new Date(existingAuth.expiresAt).toLocaleString()}`));
        
        const { reauth } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'reauth',
            message: MESSAGES.PROMPTS.REAUTH_QUESTION,
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
    const spinner = ora(MESSAGES.INFO.FINDING_PORT).start();
    
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
      spinner.fail(MESSAGES.ERRORS.ALL_REGISTERED_PORTS_IN_USE);
      this.log(chalk.red(`\nAll registered ports (${AUTH_CONSTANTS.ALTERNATIVE_PORTS.join(', ')}) ${MESSAGES.ERRORS.PORTS_CURRENTLY_IN_USE}`));
      this.log(chalk.gray(`\n${MESSAGES.ERRORS.FREE_UP_PORTS_INSTRUCTION}`));
      for (const port of AUTH_CONSTANTS.ALTERNATIVE_PORTS) {
        this.log(chalk.gray(`  • Port ${port}: ${chalk.cyan(`lsof -i :${port}`)} (macOS/Linux) or ${chalk.cyan(`netstat -ano | findstr :${port}`)} (Windows)`));
      }
      this.log(chalk.red(MESSAGES.ERRORS.ALL_PORTS_IN_USE));
      process.exit(1);
    }
    
    spinner.succeed(`Using port ${availablePort}`);
    
    spinner.text = MESSAGES.INFO.STARTING_AUTH_PROCESS;
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
      spinner.fail(MESSAGES.ERRORS.AUTHENTICATION_PROCESS_FAILED);
      this.log(chalk.red(error instanceof Error ? error.message : MESSAGES.ERRORS.UNKNOWN_ERROR));
      process.exit(1);
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

    spinner.text = MESSAGES.INFO.STARTING_AUTH_SERVER;
    
    // Start server in background
    const authPromise = authServer.start();

    // Generate authorization URL and open browser
    const authUrl = getAuthorizationUrl(domain, pkce, port);
    
    spinner.text = MESSAGES.INFO.OPENING_BROWSER;
    await open(authUrl);
    
    spinner.info(MESSAGES.PROMPTS.COMPLETE_AUTH_IN_BROWSER);
    this.log(chalk.gray(`\n${MESSAGES.PROMPTS.BROWSER_FALLBACK_INSTRUCTION}`));
    this.log(chalk.blue(authUrl));
    
    return { authServer, authPromise };
  }

  private async waitForBrowserAuthentication(authPromise: Promise<TokenResponse>): Promise<TokenResponse> {
    const spinner = ora(MESSAGES.INFO.WAITING_FOR_AUTH).start();
    
    try {
      const tokens = await authPromise;
      spinner.succeed(MESSAGES.SUCCESS.AUTHENTICATION_SUCCESS.replace('✓ ', ''));
      return tokens;
    } catch (error) {
      spinner.fail(MESSAGES.ERRORS.AUTHENTICATION_PROCESS_FAILED);
      throw error;
    }
  }

  private async configureTenantAndFolder(
    tokens: TokenResponse, 
    domain: string
  ): Promise<SelectedTenant & { folderKey?: string | null }> {
    const orgSpinner = ora(MESSAGES.INFO.FETCHING_ORG_TENANTS).start();
    
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
      orgSpinner.fail(MESSAGES.ERRORS.FAILED_TO_FETCH_ORG_TENANT);
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
    this.log(chalk.green(`\n${MESSAGES.SUCCESS.AUTHENTICATION_SUCCESS}`));
    this.log(chalk.gray(`Organization: ${selectedTenant.organizationDisplayName} (${selectedTenant.organizationName})`));
    this.log(chalk.gray(`Tenant: ${selectedTenant.tenantDisplayName} (${selectedTenant.tenantName})`));
    
    if (selectedTenant.folderKey) {
      this.log(chalk.gray(`Folder Key: ${selectedTenant.folderKey}`));
    }
    
    this.log(chalk.gray(`Domain: ${domain}`));
    this.log(chalk.gray(`Token expires at: ${getFormattedExpirationDate(tokens.expiresIn)}`));
    this.log(chalk.gray(`\n${MESSAGES.INFO.CREDENTIALS_SAVED}`));
  }

  private async logout(): Promise<void> {
    const spinner = ora(MESSAGES.INFO.LOGGING_OUT).start();
    
    try {
      await clearTokens();
      spinner.succeed(MESSAGES.SUCCESS.LOGOUT_SUCCESS);
      this.log(chalk.gray(MESSAGES.INFO.CREDENTIALS_REMOVED));
    } catch (error) {
      spinner.fail(MESSAGES.ERRORS.LOGOUT_FAILED);
      this.log(chalk.red(error instanceof Error ? error.message : MESSAGES.ERRORS.UNKNOWN_ERROR));
      process.exit(1);
    }
  }
}