import chalk from 'chalk';
import * as fs from 'node:fs';
import * as path from 'node:path';
import inquirer from 'inquirer';
import fetch from 'node-fetch';
import FormData from 'form-data';
import { PUSH_METADATA_RELATIVE_PATH } from '../constants/api.js';
import { ACTION_SCHEMA_CONSTANTS, AUTH_CONSTANTS, MESSAGES } from '../constants/index.js';
import { getEnvironmentConfig } from '../utils/env-config.js';
import { WebAppFileHandler } from '../core/webapp-file-handler/index.js';
import { WEB_APP_MANIFEST_FILENAME, getRemoteFilesMap } from '../core/webapp-file-handler/structure.js';
import * as api from '../core/webapp-file-handler/api.js';
import { Preconditions } from '../core/preconditions.js';
import { validatePushFiles } from '../utils/push-validation.js';
import { cliTelemetryClient } from '../telemetry/index.js';
import type { EnvironmentConfig } from '../types/index.js';
import type { WebAppProjectConfig } from '../core/webapp-file-handler/index.js';

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
  isActionApp: boolean,
  logger: { log: (message: string) => void },
): Promise<string> {
  const url = `${envConfig.baseUrl}/${envConfig.orgId}/studio_/backend/api/Solution`;

  const solutionResourceSubType = isActionApp ? 'CodedAction' : 'Coded';
  const webAppManifest = JSON.stringify({
    type: 'Coded',
    solutionResourceSubType,
    config: {
      isCompiled: true,
      isActionApp,
    },
  });

  const form = new FormData();
  form.append('createDefaultProjectCommand[expressionLanguage]', 'VisualBasic');
  form.append('createDefaultProjectCommand[projectType]', 'AppV2');
  form.append('createDefaultProjectCommand[triggerType]', 'Manual');
  form.append('createDefaultProjectCommand[projectMode]', 'AppV2');
  form.append('createDefaultProjectCommand[isTenantLocked]', 'false');
  form.append('createDefaultProjectCommand[name]', appName);
  form.append('createDefaultProjectCommand[isApp]', 'false');
  form.append('createDefaultProjectCommand[context][expressionLanguage]', 'VB');
  form.append('createDefaultProjectCommand[context][projectSubType]', solutionResourceSubType);
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

    const { appType } = await inquirer.prompt<{ appType: string }>([{
      type: 'list',
      name: 'appType',
      message: 'Select app type:',
      choices: ['Coded', 'CodedAction'],
      default: 'Coded',
    }]);

    const isActionApp = appType === 'CodedAction';
    if (isActionApp && !fs.existsSync(path.join(process.cwd(), ACTION_SCHEMA_CONSTANTS.ACTION_SCHEMA_FILENAME))) {
      throw new Error(MESSAGES.ERRORS.ACTION_SCHEMA_REQUIRED);
    }

    projectId = await createCodedAppProject(envConfig, appName, isActionApp, logger);
  }

  const rootDir = process.cwd();
  const bundlePath = path.normalize(options.buildDir ?? 'dist').replace(/\\/g, '/');

  // Check remote webAppManifest.json to determine if this is an Action app.
  // If CodedAction, validate that action-schema.json exists locally.
  const config: WebAppProjectConfig = {
    projectId,
    rootDir,
    bundlePath,
    manifestFile: PUSH_METADATA_RELATIVE_PATH,
    envConfig,
    logger,
  };
  const remoteStructure = await api.fetchRemoteStructure(config);
  const remoteFiles = getRemoteFilesMap(remoteStructure);
  const manifestFile = remoteFiles.get(WEB_APP_MANIFEST_FILENAME);
  if (manifestFile) {
    try {
      const content = await api.downloadRemoteFile(config, manifestFile.id);
      const manifest = JSON.parse(content.toString('utf8'));
      if (manifest?.solutionResourceSubType === 'CodedAction') {
        if (!fs.existsSync(path.join(rootDir, ACTION_SCHEMA_CONSTANTS.ACTION_SCHEMA_FILENAME))) {
          throw new Error(MESSAGES.ERRORS.ACTION_SCHEMA_REQUIRED);
        }
      }
    } catch (err) {
      // Re-throw action-schema validation errors, ignore manifest parse errors
      if (err instanceof Error && err.message === MESSAGES.ERRORS.ACTION_SCHEMA_REQUIRED) {
        throw err;
      }
    }
  }

  try {
    Preconditions.validate(rootDir, bundlePath);
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : MESSAGES.ERRORS.PUSH_VALIDATION_FAILED
    );
  }

  await validatePushFiles(rootDir, bundlePath, logger);

  const handler = new WebAppFileHandler(config);

  await handler.push();
  await handler.importReferencedResources(options.ignoreResources ?? false);
  logger.log(chalk.green(MESSAGES.SUCCESS.PUSH_COMPLETED));
}
