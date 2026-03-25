import chalk from 'chalk';
import * as path from 'node:path';
import inquirer from 'inquirer';
import fetch from 'node-fetch';
import FormData from 'form-data';
import { PUSH_METADATA_RELATIVE_PATH } from '../constants/api.js';
import { AUTH_CONSTANTS, MESSAGES } from '../constants/index.js';
import { getEnvironmentConfig } from '../utils/env-config.js';
import { WebAppFileHandler } from '../core/webapp-file-handler/index.js';
import { Preconditions } from '../core/preconditions.js';
import { cliTelemetryClient } from '../telemetry/index.js';
import type { EnvironmentConfig } from '../types/index.js';

export interface PushOptions {
  projectId?: string;
  buildDir?: string;
  ignoreResources?: boolean;
  baseUrl?: string;
  orgId?: string;
  tenantId?: string;
  accessToken?: string;
  logger?: { log: (message: string) => void };
}

async function createCodedAppProject(
  envConfig: EnvironmentConfig,
  appName: string,
  logger: { log: (message: string) => void },
): Promise<string> {
  const url = `${envConfig.baseUrl}/${envConfig.orgId}/studio_/backend/api/Solution`;

  const form = new FormData();
  form.append('createDefaultProjectCommand[expressionLanguage]', 'VisualBasic');
  form.append('createDefaultProjectCommand[projectType]', 'WebApp');
  form.append('createDefaultProjectCommand[triggerType]', 'Manual');
  form.append('createDefaultProjectCommand[projectMode]', 'WebApp');
  form.append('createDefaultProjectCommand[isTenantLocked]', 'false');
  form.append('createDefaultProjectCommand[name]', appName);
  form.append('createDefaultProjectCommand[isApp]', 'false');
  form.append('createDefaultProjectCommand[context][expressionLanguage]', 'VB');
  const webAppManifest = JSON.stringify({ type: 'App_ProCode', config: { isCompiled: true } });
  form.append(
    'createDefaultProjectCommand[context][serializedWebAppManifest]',
    webAppManifest,
  );
  form.append('createDefaultProjectCommand[isWindows]', 'false');
  form.append('createDefaultProjectCommand.file', Buffer.from(webAppManifest), { filename: 'webAppManifest.json', contentType: 'application/octet-stream' });
  form.append('createDefaultProjectCommand.IsMain', 'false');
  form.append('name', 'Solution');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${envConfig.accessToken}`,
      ...form.getHeaders(),
    },
    body: form as any,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to create coded app project (${response.status}): ${body}`);
  }

  const data = (await response.json()) as any;
  const projectId = data?.projects?.[0]?.rootFolder?.name;
  if (!projectId) {
    throw new Error('Solution created but could not extract projectId from response');
  }

  logger.log(chalk.green(`Created coded app project "${appName}" with ID: ${projectId}`));

  // Set in process.env so the current run can use it immediately.
  // Callers (e.g. codedapp-tool) handle persisting to their credential store.
  process.env.UIPATH_PROJECT_ID = projectId;

  return projectId;
}

export async function executePush(options: PushOptions): Promise<void> {
  const logger = options.logger ?? { log: console.log };
  cliTelemetryClient.track('Cli.Push');

  logger.log(chalk.blue(MESSAGES.INFO.PUSH_HEADER));
  logger.log('');

  const envConfig = getEnvironmentConfig(
    AUTH_CONSTANTS.REQUIRED_ENV_VARS.PUSH,
    logger,
    {
      baseUrl: options.baseUrl,
      orgId: options.orgId,
      tenantId: options.tenantId,
      accessToken: options.accessToken,
    }
  );
  if (!envConfig) throw new Error('Missing required configuration');

  let projectId = options.projectId ?? process.env.UIPATH_PROJECT_ID;

  if (!projectId) {
    if (!process.stdin.isTTY) {
      throw new Error(MESSAGES.ERRORS.PUSH_PROJECT_ID_REQUIRED);
    }

    const { shouldCreate } = await inquirer.prompt<{ shouldCreate: boolean }>([{
      type: 'confirm',
      name: 'shouldCreate',
      message: 'No project ID found. Create a new Coded App project?',
      default: true,
    }]);

    if (!shouldCreate) {
      throw new Error(MESSAGES.ERRORS.PUSH_PROJECT_ID_REQUIRED);
    }

    const { appName } = await inquirer.prompt<{ appName: string }>([{
      type: 'input',
      name: 'appName',
      message: 'Enter a name for the new Coded App:',
      default: 'App',
    }]);
    projectId = await createCodedAppProject(envConfig, appName, logger);
  }

  const rootDir = process.cwd();
  const bundlePath = path.normalize(options.buildDir ?? 'dist').replace(/\\/g, '/');

  try {
    Preconditions.validate(rootDir, bundlePath);
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : MESSAGES.ERRORS.PUSH_VALIDATION_FAILED
    );
  }

  const handler = new WebAppFileHandler({
    projectId,
    rootDir,
    bundlePath,
    manifestFile: PUSH_METADATA_RELATIVE_PATH,
    envConfig,
    logger,
  });

  await handler.push();
  await handler.importReferencedResources(options.ignoreResources ?? false);
  logger.log(chalk.green(MESSAGES.SUCCESS.PUSH_COMPLETED));
}
