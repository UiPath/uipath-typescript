import chalk from 'chalk';
import inquirer from 'inquirer';
import fetch from 'node-fetch';
import { API_ENDPOINTS } from '../constants/api.js';
import { createHeaders } from './api.js';
import type { EnvironmentConfig } from '../types/index.js';

interface StudioProject {
  id: string;
  name: string;
}

export async function listUserProjects(
  envConfig: EnvironmentConfig,
): Promise<StudioProject[]> {
  const url = `${envConfig.baseUrl}/${envConfig.orgId}${API_ENDPOINTS.STUDIO_WEB_LIST_PROJECTS}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: createHeaders({
      bearerToken: envConfig.accessToken,
      tenantId: envConfig.tenantId,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch projects: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as any;

  const items: any[] = Array.isArray(data) ? data : (data.value ?? data.items ?? data.PageItems ?? []);

  return items.map((item: any) => ({
    id: String(item.rootFolder?.name ?? item.id ?? item.projectId ?? ''),
    name: String(item.name ?? item.displayName ?? item.rootFolder?.name ?? 'Unnamed'),
  })).filter((p: StudioProject) => p.id);
}

export async function promptProjectSelection(
  envConfig: EnvironmentConfig,
  logger: { log: (message: string) => void },
  context: 'push' | 'pull' = 'pull',
): Promise<string> {
  logger.log(chalk.gray('Fetching your projects...'));
  const projects = await listUserProjects(envConfig);

  if (projects.length === 0) {
    throw new Error(
      'No projects found. Create a project in Studio Web first, or provide a project ID directly:\n' +
      `  uipcli codedapp ${context} <project-id>\n` +
      '  or set UIPATH_PROJECT_ID in your .env file'
    );
  }

  const { selectedId } = await inquirer.prompt<{ selectedId: string }>([{
    type: 'list',
    name: 'selectedId',
    message: `Select a project to ${context === 'push' ? 'push to' : 'pull from'}:`,
    choices: projects.map((p) => ({
      name: `${p.name} (${p.id})`,
      value: p.id,
    })),
    pageSize: 15,
  }]);

  logger.log(chalk.green(`Selected project: ${selectedId}`));
  return selectedId;
}
