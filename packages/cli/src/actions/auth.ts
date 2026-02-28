import chalk from 'chalk';
import ora, { Ora } from 'ora';
import open from 'open';
import inquirer from 'inquirer';
import {
  generatePKCEChallenge,
  getAuthorizationUrl,
  type TokenResponse,
  authenticateWithClientCredentials,
} from '../auth/core/oidc.js';
import { AuthServer } from '../auth/server/auth-server.js';
import {
  loadTokens,
  clearTokens,
  isTokenExpired,
  saveTokensWithTenant,
} from '../auth/core/token-manager.js';
import {
  getTenantsAndOrganization,
  selectTenantInteractive,
  type SelectedTenant,
} from '../auth/services/portal.js';
import { selectFolderInteractive } from '../auth/services/folder.js';
import { getBaseUrl } from '../auth/utils/url.js';
import { getFormattedExpirationDate } from '../auth/utils/date.js';
import { AUTH_CONSTANTS } from '../constants/auth.js';
import { MESSAGES } from '../constants/messages.js';
import { isPortAvailable } from '../auth/utils/port-checker.js';
import { cliTelemetryClient } from '../telemetry/index.js';

export interface AuthOptions {
  domain?: string;
  alpha?: boolean;
  cloud?: boolean;
  staging?: boolean;
  logout?: boolean;
  force?: boolean;
  clientId?: string;
  clientSecret?: string;
  scope?: string;
  logger?: { log: (message: string) => void };
}

export async function executeAuth(options: AuthOptions): Promise<void> {
  const logger = options.logger ?? { log: console.log };
  cliTelemetryClient.track('Cli.Auth');

  if (options.logout) {
    await executeLogout(logger);
    return;
  }

  let domain = options.domain ?? AUTH_CONSTANTS.DOMAINS.CLOUD;
  if (options.alpha) domain = AUTH_CONSTANTS.DOMAINS.ALPHA;
  else if (options.cloud) domain = AUTH_CONSTANTS.DOMAINS.CLOUD;
  else if (options.staging) domain = AUTH_CONSTANTS.DOMAINS.STAGING;

  if (options.clientId && options.clientSecret) {
    await executeClientCredentialsAuth(domain, options.clientId, options.clientSecret, options.scope, logger);
    return;
  }

  if (!options.force) {
    const existingAuth = await loadTokens();
    if (existingAuth && !isTokenExpired(existingAuth)) {
      logger.log(chalk.green(MESSAGES.SUCCESS.ALREADY_AUTHENTICATED));
      logger.log(chalk.gray(`Organization: ${existingAuth.organizationName ?? existingAuth.organizationId}`));
      logger.log(chalk.gray(`Tenant: ${existingAuth.tenantName ?? 'Not selected'}`));
      logger.log(chalk.gray(`Domain: ${existingAuth.domain}`));
      logger.log(chalk.gray(`Token expires at: ${new Date(existingAuth.expiresAt).toLocaleString()}`));
      const { reauth } = await inquirer.prompt<{ reauth: boolean }>([
        { type: 'confirm', name: 'reauth', message: MESSAGES.PROMPTS.REAUTH_QUESTION, default: false },
      ]);
      if (!reauth) return;
    }
  }

  await executePkceAuth(domain, logger);
}

async function executeLogout(logger: { log: (message: string) => void }): Promise<void> {
  const spinner = ora(MESSAGES.INFO.LOGGING_OUT).start();
  try {
    await clearTokens();
    spinner.succeed(MESSAGES.SUCCESS.LOGOUT_SUCCESS);
    logger.log(chalk.gray(MESSAGES.INFO.CREDENTIALS_REMOVED));
  } catch (error) {
    spinner.fail(MESSAGES.ERRORS.LOGOUT_FAILED);
    throw new Error(error instanceof Error ? error.message : MESSAGES.ERRORS.UNKNOWN_ERROR);
  }
}

async function executeClientCredentialsAuth(
  domain: string,
  clientId: string,
  clientSecret: string,
  scope: string | undefined,
  logger: { log: (message: string) => void }
): Promise<void> {
  const spinner = ora(MESSAGES.INFO.AUTHENTICATING_WITH_CLIENT_CREDENTIALS).start();
  try {
    const tokens = await authenticateWithClientCredentials({ clientId, clientSecret, domain, scope });
    spinner.succeed(MESSAGES.SUCCESS.AUTHENTICATION_SUCCESS.replace('✓ ', ''));
    logger.log(chalk.green(`\n${MESSAGES.INFO.ACCESS_TOKEN_HEADER}`));
    logger.log(tokens.accessToken);
  } catch (error) {
    spinner.fail(MESSAGES.ERRORS.AUTHENTICATION_PROCESS_FAILED);
    throw new Error(error instanceof Error ? error.message : MESSAGES.ERRORS.UNKNOWN_ERROR);
  }
}

async function executePkceAuth(domain: string, logger: { log: (message: string) => void }): Promise<void> {
  const spinner = ora(MESSAGES.INFO.FINDING_PORT).start();
  let availablePort: number | null = null;
  for (const port of AUTH_CONSTANTS.ALTERNATIVE_PORTS) {
    if (await isPortAvailable(port)) {
      availablePort = port;
      break;
    }
  }
  if (!availablePort) {
    spinner.fail(MESSAGES.ERRORS.ALL_REGISTERED_PORTS_IN_USE);
    logger.log(chalk.red(`\nAll registered ports (${AUTH_CONSTANTS.ALTERNATIVE_PORTS.join(', ')}) ${MESSAGES.ERRORS.PORTS_CURRENTLY_IN_USE}`));
    logger.log(chalk.gray(`\n${MESSAGES.ERRORS.FREE_UP_PORTS_INSTRUCTION}`));
    for (const port of AUTH_CONSTANTS.ALTERNATIVE_PORTS) {
      logger.log(chalk.gray(`  • Port ${port}: ${chalk.cyan(`lsof -i :${port}`)} (macOS/Linux) or ${chalk.cyan(`netstat -ano | findstr :${port}`)} (Windows)`));
    }
    throw new Error(MESSAGES.ERRORS.ALL_PORTS_IN_USE);
  }
  spinner.succeed(`Using port ${availablePort}`);
  spinner.text = MESSAGES.INFO.STARTING_AUTH_PROCESS;
  let authServer: AuthServer | null = null;
  try {
    const { authServer: server, authPromise } = await startAuthenticationFlow(domain, availablePort, spinner, logger);
    authServer = server;
    const tokens = await waitForBrowserAuth(authPromise, logger);
    const selectedTenant = await configureTenantAndFolder(tokens, domain, logger);
    await saveCredentialsAndFinish(tokens, domain, selectedTenant, logger);
  } catch (error) {
    spinner.fail(MESSAGES.ERRORS.AUTHENTICATION_PROCESS_FAILED);
    throw error;
  } finally {
    authServer?.stop();
  }
}

async function startAuthenticationFlow(
  domain: string,
  port: number,
  spinner: Ora,
  logger: { log: (message: string) => void }
): Promise<{ authServer: AuthServer; authPromise: Promise<TokenResponse> }> {
  const pkce = generatePKCEChallenge();
  const authServer = new AuthServer({
    port,
    domain,
    codeVerifier: pkce.codeVerifier,
    expectedState: pkce.state,
  });
  spinner.text = MESSAGES.INFO.STARTING_AUTH_SERVER;
  const authPromise = authServer.start();
  const authUrl = getAuthorizationUrl(domain, pkce, port);
  spinner.text = MESSAGES.INFO.OPENING_BROWSER;
  await open(authUrl);
  spinner.info(MESSAGES.PROMPTS.COMPLETE_AUTH_IN_BROWSER);
  logger.log(chalk.gray(`\n${MESSAGES.PROMPTS.BROWSER_FALLBACK_INSTRUCTION}`));
  logger.log(chalk.blue(authUrl));
  return { authServer, authPromise };
}

async function waitForBrowserAuth(
  authPromise: Promise<TokenResponse>,
  logger: { log: (message: string) => void }
): Promise<TokenResponse> {
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

async function configureTenantAndFolder(
  tokens: TokenResponse,
  domain: string,
  logger: { log: (message: string) => void }
): Promise<SelectedTenant & { folderKey?: string | null }> {
  const orgSpinner = ora(MESSAGES.INFO.FETCHING_ORG_TENANTS).start();
  try {
    const tenantsAndOrg = await getTenantsAndOrganization(tokens.accessToken, domain);
    orgSpinner.stop();
    const selectedTenant = await selectTenantInteractive(tenantsAndOrg);
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
    if (error instanceof Error) logger.log(chalk.red(`Error: ${error.message}`));
    throw error;
  }
}

async function saveCredentialsAndFinish(
  tokens: TokenResponse,
  domain: string,
  selectedTenant: SelectedTenant & { folderKey?: string | null },
  logger: { log: (message: string) => void }
): Promise<void> {
  await saveTokensWithTenant(tokens, domain, selectedTenant, selectedTenant.folderKey);
  logger.log(chalk.green(`\n${MESSAGES.SUCCESS.AUTHENTICATION_SUCCESS}`));
  logger.log(chalk.gray(`Organization: ${selectedTenant.organizationDisplayName} (${selectedTenant.organizationName})`));
  logger.log(chalk.gray(`Tenant: ${selectedTenant.tenantDisplayName} (${selectedTenant.tenantName})`));
  if (selectedTenant.folderKey) logger.log(chalk.gray(`Folder Key: ${selectedTenant.folderKey}`));
  logger.log(chalk.gray(`Domain: ${domain}`));
  logger.log(chalk.gray(`Token expires at: ${getFormattedExpirationDate(tokens.expiresIn)}`));
  logger.log(chalk.gray(`\n${MESSAGES.INFO.CREDENTIALS_SAVED}`));
}
