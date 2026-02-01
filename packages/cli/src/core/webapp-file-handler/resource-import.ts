import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import { MESSAGES } from '../../constants/index.js';
import type {
  WebAppPushConfig,
  Bindings,
  Resource,
  ReferencedResourceRequest,
  ReferencedResourceResponse,
} from './types.js';
import * as api from './api.js';

const BINDINGS_FILE_NAME = 'bindings.json';

function transformKind(kind: string): string {
  return kind ? kind[0].toLowerCase() + kind.slice(1) : kind;
}

function transformType(type: string | null): string | null {
  if (!type) return null;
  const typeMappings: Record<string, string> = {
    text: 'stringAsset',
    integer: 'integerAsset',
    bool: 'booleanAsset',
    credential: 'credentialAsset',
    secret: 'secretAsset',
    orchestrator: 'orchestratorBucket',
    amazon: 'amazonBucket',
    azure: 'azureBucket',
  };
  const lowerType = type.toLowerCase();
  if (lowerType in typeMappings) return typeMappings[lowerType];
  return type[0].toLowerCase() + type.slice(1);
}

export async function runImportReferencedResources(
  config: WebAppPushConfig,
  lockKey: string | null
): Promise<void> {
  const bindingsPath = path.join(config.rootDir, BINDINGS_FILE_NAME);
  let bindings: Bindings;
  try {
    const content = fs.readFileSync(bindingsPath, 'utf-8');
    bindings = JSON.parse(content) as Bindings;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
    const msg = error instanceof Error ? error.message : MESSAGES.ERRORS.UNKNOWN_ERROR;
    config.logger.log(chalk.red(`${MESSAGES.ERRORS.PUSH_BINDINGS_PARSE_FAILED_PREFIX}${BINDINGS_FILE_NAME}: ${msg}`));
    return;
  }

  if (!bindings.resources || bindings.resources.length === 0) return;

  config.logger.log(chalk.gray(`[resources] Processing ${bindings.resources.length} resource(s) from ${BINDINGS_FILE_NAME}...`));

  let resourcesCreated = 0;
  let resourcesUnchanged = 0;
  let resourcesUpdated = 0;
  let resourcesNotFound = 0;

  const solutionId = await api.getSolutionId(config);

  for (const bindingsResource of bindings.resources) {
    const resourceType = bindingsResource.resource;
    let foundResource: Resource | null = null;
    let resourceName = '';
    let folderPath = '';

    try {
      if (resourceType === 'connection') {
        const connectionKeyResourceValue = bindingsResource.value?.ConnectionId;
        if (!connectionKeyResourceValue) continue;
        const connectionKey = connectionKeyResourceValue.defaultValue;
        try {
          const connection = await api.retrieveConnection(config, connectionKey);
          resourceName = connection.name;
          folderPath = connection.folder?.path || '';
          foundResource = {
            resource_key: connection.key || connectionKey,
            name: resourceName,
            resource_type: 'connection',
            resource_sub_type: bindingsResource.metadata?.Connector || null,
            folders: connection.folder
              ? [
                  {
                    folder_key: connection.folder.key,
                    fully_qualified_name: connection.folder.fullyQualifiedName || '',
                    path: folderPath,
                  },
                ]
              : [],
          };
        } catch {
          config.logger.log(
            chalk.yellow(`${MESSAGES.ERRORS.PUSH_CONNECTION_NOT_FOUND_PREFIX}${connectionKey} (${bindingsResource.metadata?.Connector || 'unknown'})`)
          );
          resourcesNotFound++;
          continue;
        }
      } else {
        const nameResourceValue = bindingsResource.value?.name;
        const folderPathResourceValue = bindingsResource.value?.folderPath;
        if (!nameResourceValue) continue;
        resourceName = nameResourceValue.defaultValue;
        folderPath = folderPathResourceValue?.defaultValue || '';
        try {
          foundResource = await api.findResourceInCatalog(
            config,
            resourceType,
            resourceName,
            folderPath,
            api.mapFolder
          );
        } catch {
          const folderInfo = folderPath ? ` at folder path '${folderPath}'` : ' (tenant-scoped)';
          config.logger.log(
            chalk.yellow(`${MESSAGES.ERRORS.PUSH_RESOURCE_NOT_FOUND_PREFIX}${resourceName} (${resourceType})${folderInfo}`)
          );
          resourcesNotFound++;
          continue;
        }
      }

      if (!foundResource || foundResource.folders.length === 0) {
        config.logger.log(chalk.yellow(`${MESSAGES.ERRORS.PUSH_RESOURCE_NOT_FOUND_PREFIX}${resourceName} (${resourceType})`));
        resourcesNotFound++;
        continue;
      }

      const folder = foundResource.folders[0];
      const request: ReferencedResourceRequest = {
        key: foundResource.resource_key,
        kind: transformKind(foundResource.resource_type),
        type: transformType(foundResource.resource_sub_type),
        folder: {
          folder_key: folder.folder_key,
          fully_qualified_name: folder.fully_qualified_name,
          path: folder.path,
        },
      };

      const response: ReferencedResourceResponse = await api.createReferencedResource(
        config,
        solutionId,
        request,
        lockKey
      );

      switch (response.status) {
        case 'ADDED':
          resourcesCreated++;
          config.logger.log(chalk.green(`${MESSAGES.INFO.PUSH_RESOURCE_ADDED_PREFIX}${resourceName} (${resourceType})`));
          break;
        case 'UNCHANGED':
          resourcesUnchanged++;
          config.logger.log(chalk.gray(`${MESSAGES.INFO.PUSH_RESOURCE_UNCHANGED_PREFIX}${resourceName} (${resourceType})`));
          break;
        case 'UPDATED':
          resourcesUpdated++;
          config.logger.log(chalk.blue(`${MESSAGES.INFO.PUSH_RESOURCE_UPDATED_PREFIX}${resourceName} (${resourceType})`));
          break;
      }
    } catch (error) {
      config.logger.log(
        chalk.red(
          `${MESSAGES.ERRORS.PUSH_RESOURCE_PROCESSING_ERROR_PREFIX}${resourceName}: ${error instanceof Error ? error.message : MESSAGES.ERRORS.UNKNOWN_ERROR}`
        )
      );
      resourcesNotFound++;
    }
  }

  config.logger.log(
    chalk.gray(
      `[resources] Summary: ${resourcesCreated} added, ${resourcesUpdated} updated, ${resourcesUnchanged} unchanged, ${resourcesNotFound} not found`
    )
  );
}
