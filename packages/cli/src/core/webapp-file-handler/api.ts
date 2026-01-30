import * as path from 'path';
import fetch from 'node-fetch';
import FormData from 'form-data';
import chalk from 'chalk';
import { API_ENDPOINTS } from '../../constants/api.js';
import { MESSAGES } from '../../constants/index.js';
import { createHeaders } from '../../utils/api.js';
import { handleHttpError } from '../../utils/error-handler.js';
import { cliTelemetryClient } from '../../telemetry/index.js';
import type {
  WebAppPushConfig,
  LocalFile,
  LockInfo,
  ProjectStructure,
  Resource,
  Connection,
  ReferencedResourceRequest,
  ReferencedResourceResponse,
} from './types.js';

const MAX_TELEMETRY_ERROR_LENGTH = 500;

function trackApiFailure(apiMethod: string, errorMessage: string, statusCode?: number): void {
  cliTelemetryClient.track('Cli.Push.ApiFailure', {
    api_method: apiMethod,
    error_message: errorMessage.length > MAX_TELEMETRY_ERROR_LENGTH
      ? `${errorMessage.slice(0, MAX_TELEMETRY_ERROR_LENGTH)}...`
      : errorMessage,
    ...(statusCode !== undefined && { status_code: statusCode }),
  });
}

export function buildApiUrl(config: WebAppPushConfig, endpoint: string, tenantScoped = false): string {
  const { baseUrl, orgId, tenantId } = config.envConfig;
  if (tenantScoped) {
    return `${baseUrl}/${orgId}/${tenantId}${endpoint}`;
  }
  return `${baseUrl}/${orgId}${endpoint}`;
}

export async function fetchRemoteStructure(
  config: WebAppPushConfig
): Promise<ProjectStructure> {
  const url = buildApiUrl(
    config,
    API_ENDPOINTS.STUDIO_WEB_STRUCTURE.replace('{projectId}', config.projectId)
  );
  const response = await fetch(url, {
    method: 'GET',
    headers: createHeaders({
      bearerToken: config.envConfig.accessToken,
      tenantId: config.envConfig.tenantId,
    }),
  });
  if (!response.ok) {
    if (response.status === 404) {
      return { name: '', files: [], folders: [] };
    }
    const errText = await response.text().catch(() => '');
    trackApiFailure('fetchRemoteStructure', errText || response.statusText, response.status);
    await handleHttpError(response, 'fetch remote structure');
  }
  return (await response.json()) as ProjectStructure;
}

export async function retrieveLock(config: WebAppPushConfig): Promise<LockInfo | null> {
  const url = buildApiUrl(
    config,
    API_ENDPOINTS.STUDIO_WEB_LOCK.replace('{projectId}', config.projectId)
  );
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: createHeaders({
        bearerToken: config.envConfig.accessToken,
        tenantId: config.envConfig.tenantId,
      }),
    });
    if (response.ok) {
      const lockInfo = (await response.json()) as LockInfo;
      if (!lockInfo.projectLockKey && !lockInfo.solutionLockKey) {
        await putLock(config);
        const retry = await fetch(url, {
          method: 'GET',
          headers: createHeaders({
            bearerToken: config.envConfig.accessToken,
            tenantId: config.envConfig.tenantId,
          }),
        });
        if (retry.ok) return (await retry.json()) as LockInfo;
        const retryErr = `Lock was acquired but retrieving the lock key failed (${retry.status} ${retry.statusText}); the project may remain locked on the server.`;
        trackApiFailure('retrieveLock', retryErr, retry.status);
        throw new Error(retryErr);
      }
      return lockInfo;
    }
    return null;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.startsWith('Lock was acquired but retrieving')) throw err;
    trackApiFailure('retrieveLock', msg);
    config.logger.log(chalk.gray(`[retrieveLock] Error: ${msg}`));
    return null;
  }
}

export async function putLock(config: WebAppPushConfig): Promise<void> {
  const url = buildApiUrl(
    config,
    `${API_ENDPOINTS.STUDIO_WEB_LOCK.replace('{projectId}', config.projectId)}/dummy-uuid-Shared?api-version=2`
  );
  await fetch(url, {
    method: 'PUT',
    headers: createHeaders({
      bearerToken: config.envConfig.accessToken,
      tenantId: config.envConfig.tenantId,
    }),
  });
}

export async function createFolderAtRoot(
  config: WebAppPushConfig,
  name: string,
  lockKey: string | null
): Promise<string | null> {
  const url = buildApiUrl(
    config,
    API_ENDPOINTS.STUDIO_WEB_CREATE_FOLDER.replace('{projectId}', config.projectId)
  );
  const headers = createHeaders({
    bearerToken: config.envConfig.accessToken,
    tenantId: config.envConfig.tenantId,
    contentType: 'application/json',
  });
  if (lockKey) headers['x-uipath-sw-lockkey'] = lockKey;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name }),
    });
    if (response.ok) {
      const ct = response.headers.get('content-type');
      if (ct?.includes('application/json')) {
        const data = (await response.json()) as { id?: string };
        if (data.id) return data.id;
      }
      return null;
    }
    if (response.status === 409) return null;
    const err = await response.text().catch(() => '');
    const errMsg = `Create folder '${name}' failed: ${response.status} ${err.slice(0, 80)}`;
    trackApiFailure('createFolderAtRoot', errMsg, response.status);
    throw new Error(errMsg);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    trackApiFailure('createFolderAtRoot', msg);
    config.logger.log(chalk.yellow(`${MESSAGES.ERRORS.PUSH_CREATE_FOLDER_FAILED_PREFIX}${name} — ${msg}`));
    return null;
  }
}

export async function moveFolder(
  config: WebAppPushConfig,
  folderId: string,
  parentId: string,
  lockKey: string | null
): Promise<void> {
  const endpoint = API_ENDPOINTS.STUDIO_WEB_MOVE_FOLDER.replace('{projectId}', config.projectId);
  const baseUrl = buildApiUrl(config, endpoint);
  const url = `${baseUrl}?api-version=2`;
  const headers = createHeaders({
    bearerToken: config.envConfig.accessToken,
    tenantId: config.envConfig.tenantId,
    contentType: 'application/json',
  });
  if (lockKey) headers['x-uipath-sw-lockkey'] = lockKey;
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ folderId, parentId }),
  });
  if (!response.ok) {
    const err = await response.text().catch(() => '');
    const errMsg = `Move folder failed: ${response.status} ${response.statusText} ${err.slice(0, 80)}`;
    trackApiFailure('moveFolder', errMsg, response.status);
    throw new Error(errMsg);
  }
}

export async function downloadRemoteFile(
  config: WebAppPushConfig,
  fileId: string
): Promise<Buffer> {
  const url = buildApiUrl(
    config,
    API_ENDPOINTS.STUDIO_WEB_DOWNLOAD_FILE.replace('{projectId}', config.projectId).replace(
      '{fileId}',
      fileId
    )
  );
  const response = await fetch(url, {
    method: 'GET',
    headers: createHeaders({
      bearerToken: config.envConfig.accessToken,
      tenantId: config.envConfig.tenantId,
    }),
  });
  if (!response.ok) {
    const errMsg = `Failed to download file ${fileId}: ${response.statusText}`;
    trackApiFailure('downloadRemoteFile', errMsg, response.status);
    throw new Error(errMsg);
  }
  return Buffer.from(await response.arrayBuffer());
}

export async function createFile(
  config: WebAppPushConfig,
  filePath: string,
  localFile: LocalFile,
  parentId: string | null,
  parentPath: string | null,
  lockKey: string | null
): Promise<void> {
  const url = buildApiUrl(
    config,
    API_ENDPOINTS.STUDIO_WEB_CREATE_FILE.replace('{projectId}', config.projectId)
  );
  const form = new FormData();
  form.append('file', localFile.content, {
    filename: path.basename(filePath),
    contentType: 'application/octet-stream',
  });
  if (parentId) form.append('parentId', parentId);
  else if (parentPath) form.append('parentPath', parentPath);
  const baseHeaders = createHeaders({
    bearerToken: config.envConfig.accessToken,
    tenantId: config.envConfig.tenantId,
    contentType: undefined,
  });
  delete (baseHeaders as Record<string, string>)['Content-Type'];
  const headers = { ...baseHeaders, ...form.getHeaders() };
  if (lockKey) headers['x-uipath-sw-lockkey'] = lockKey;
  const response = await fetch(url, { method: 'POST', headers, body: form });
  if (!response.ok) {
    const errMsg = `Failed to upload file '${filePath}': ${response.status} ${response.statusText}`;
    trackApiFailure('createFile', errMsg, response.status);
    throw new Error(errMsg);
  }
}

export async function updateFile(
  config: WebAppPushConfig,
  filePath: string,
  localFile: LocalFile,
  fileId: string,
  lockKey: string | null
): Promise<void> {
  const url = buildApiUrl(
    config,
    API_ENDPOINTS.STUDIO_WEB_UPDATE_FILE.replace('{projectId}', config.projectId).replace(
      '{fileId}',
      fileId
    )
  );
  const form = new FormData();
  form.append('file', localFile.content, {
    filename: path.basename(filePath),
    contentType: 'application/octet-stream',
  });
  const baseHeaders = createHeaders({
    bearerToken: config.envConfig.accessToken,
    tenantId: config.envConfig.tenantId,
    contentType: undefined,
  });
  delete (baseHeaders as Record<string, string>)['Content-Type'];
  const headers = { ...baseHeaders, ...form.getHeaders() };
  if (lockKey) headers['x-uipath-sw-lockkey'] = lockKey;
  const response = await fetch(url, { method: 'PUT', headers, body: form });
  if (!response.ok) {
    const errMsg = `Failed to update file '${filePath}': ${response.status} ${response.statusText}`;
    trackApiFailure('updateFile', errMsg, response.status);
    throw new Error(errMsg);
  }
}

export async function deleteItem(
  config: WebAppPushConfig,
  itemId: string,
  lockKey: string | null
): Promise<void> {
  const url = buildApiUrl(
    config,
    API_ENDPOINTS.STUDIO_WEB_DELETE_ITEM.replace('{projectId}', config.projectId).replace(
      '{itemId}',
      itemId
    )
  );
  const headers = createHeaders({
    bearerToken: config.envConfig.accessToken,
    tenantId: config.envConfig.tenantId,
  });
  if (lockKey) headers['x-uipath-sw-lockkey'] = lockKey;
  const response = await fetch(url, { method: 'DELETE', headers });
  if (!response.ok) {
    const errMsg = `Failed to delete item ${itemId}: ${response.status} ${response.statusText}`;
    trackApiFailure('deleteItem', errMsg, response.status);
    throw new Error(errMsg);
  }
}

export async function getSolutionId(config: WebAppPushConfig): Promise<string> {
  const url = buildApiUrl(
    config,
    API_ENDPOINTS.STUDIO_WEB_PROJECT.replace('{projectId}', config.projectId)
  );
  const response = await fetch(url, {
    method: 'GET',
    headers: createHeaders({
      bearerToken: config.envConfig.accessToken,
      tenantId: config.envConfig.tenantId,
    }),
  });
  if (!response.ok) {
    const errMsg = `Failed to get solution ID: ${response.status} ${response.statusText}`;
    trackApiFailure('getSolutionId', errMsg, response.status);
    throw new Error(errMsg);
  }
  const data = (await response.json()) as { solutionId: string };
  return data.solutionId;
}

export async function findResourceInCatalog(
  config: WebAppPushConfig,
  resourceType: string,
  name: string,
  folderPath: string,
  mapFolder: (f: Record<string, unknown>) => { folder_key: string; fully_qualified_name: string; path: string }
): Promise<Resource> {
  const resourceTypeMap: Record<string, string> = {
    asset: 'asset',
    process: 'process',
    bucket: 'bucket',
    index: 'index',
    app: 'app',
    connection: 'connection',
    queue: 'queue',
  };
  const apiResourceType = resourceTypeMap[resourceType.toLowerCase()];
  if (!apiResourceType) throw new Error(`Unknown resource type: ${resourceType}`);

  const url = buildApiUrl(
    config,
    API_ENDPOINTS.RESOURCE_CATALOG_ENTITIES.replace('{resourceType}', apiResourceType),
    true
  );
  const params = new URLSearchParams({ name, skip: '0', take: '100' });
  const fullUrl = `${url}?${params.toString()}`;
  const response = await fetch(fullUrl, {
    method: 'GET',
    headers: createHeaders({
      bearerToken: config.envConfig.accessToken,
      tenantId: config.envConfig.tenantId,
      additionalHeaders: { Accept: 'application/json' },
    }),
  });
  const responseText = await response.text();
  const contentType = response.headers.get('content-type') || '';
  if (!response.ok) {
    const errMsg = `Failed to search resource catalog: ${response.status} ${response.statusText}`;
    trackApiFailure('findResourceInCatalog', errMsg, response.status);
    throw new Error(errMsg);
  }
  if (!contentType.includes('application/json') && responseText.trim().startsWith('<!DOCTYPE')) {
    const errMsg = `API returned HTML instead of JSON. Status: ${response.status}`;
    trackApiFailure('findResourceInCatalog', errMsg, response.status);
    throw new Error(errMsg);
  }
  let data: { value?: unknown[]; items?: unknown[] };
  try {
    data = JSON.parse(responseText) as { value?: unknown[]; items?: unknown[] };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    trackApiFailure('findResourceInCatalog', `Invalid JSON: ${msg}`);
    config.logger.log(chalk.gray(`[findResourceInCatalog] Invalid JSON: ${msg}`));
    throw new Error(`Invalid JSON: ${msg}`);
  }
  const items = data.value || data.items || [];
  for (const item of items as Array<Record<string, unknown>>) {
    if (item.name === name) {
      const itemFolders = (item.folders || []) as Array<Record<string, unknown>>;
      if (!folderPath && itemFolders.length > 0) {
        return {
          resource_key: (item.entityKey || item.resource_key) as string,
          name: item.name as string,
          resource_type: (item.entityType || item.resource_type) as string,
          resource_sub_type: (item.entitySubType || item.resource_sub_type || null) as string | null,
          folders: itemFolders.map(mapFolder),
        };
      }
      for (const folder of itemFolders) {
        if (folder.path === folderPath) {
          return {
            resource_key: (item.entityKey || item.resource_key) as string,
            name: item.name as string,
            resource_type: (item.entityType || item.resource_type) as string,
            resource_sub_type: (item.entitySubType || item.resource_sub_type || null) as string | null,
            folders: itemFolders.map(mapFolder),
          };
        }
      }
    }
  }
  const folderInfo = folderPath ? ` at folder path '${folderPath}'` : ' (tenant-scoped)';
  const errMsg = `Resource '${name}' of type '${resourceType}' not found${folderInfo}`;
  trackApiFailure('findResourceInCatalog', errMsg);
  throw new Error(errMsg);
}

export function mapFolder(f: Record<string, unknown>): {
  folder_key: string;
  fully_qualified_name: string;
  path: string;
} {
  const folderKey =
    (f.key as string) ||
    (f.folderKey as string) ||
    (f.folder_key as string) ||
    (f.path && String(f.path).match(/^[0-9a-f-]{36}$/i) ? (f.path as string) : '');
  return {
    folder_key: folderKey,
    fully_qualified_name: (f.fullyQualifiedName || f.fully_qualified_name || '') as string,
    path: (f.path || '') as string,
  };
}

export async function retrieveConnection(
  config: WebAppPushConfig,
  connectionKey: string
): Promise<Connection> {
  const url = buildApiUrl(
    config,
    API_ENDPOINTS.CONNECTIONS_RETRIEVE.replace('{connectionKey}', connectionKey)
  );
  const response = await fetch(url, {
    method: 'GET',
    headers: createHeaders({
      bearerToken: config.envConfig.accessToken,
      tenantId: config.envConfig.tenantId,
    }),
  });
  if (!response.ok) {
    if (response.status === 404) {
      const errMsg = `Connection '${connectionKey}' not found`;
      trackApiFailure('retrieveConnection', errMsg, 404);
      throw new Error(errMsg);
    }
    const errMsg = `Failed to retrieve connection: ${response.status} ${response.statusText}`;
    trackApiFailure('retrieveConnection', errMsg, response.status);
    throw new Error(errMsg);
  }
  const data = (await response.json()) as {
    Key?: string;
    Name?: string;
    Folder?: { Id?: string; Key?: string; FullyQualifiedName?: string; Path?: string };
  };
  return {
    key: data.Key || connectionKey,
    name: data.Name || connectionKey,
    folder: data.Folder
      ? {
          key: data.Folder.Id || data.Folder.Key || '',
          fullyQualifiedName: data.Folder.FullyQualifiedName || '',
          path: data.Folder.Path || '',
        }
      : null,
  };
}

export async function createReferencedResource(
  config: WebAppPushConfig,
  solutionId: string,
  request: ReferencedResourceRequest,
  lockKey: string | null
): Promise<ReferencedResourceResponse> {
  const baseUrl = buildApiUrl(
    config,
    API_ENDPOINTS.STUDIO_WEB_CREATE_REFERENCED_RESOURCE.replace('{solutionId}', solutionId),
    false
  );
  const url = `${baseUrl}?api-version=2&forceUpdate=true`;
  const payload: Record<string, unknown> = {
    key: request.key,
    kind: request.kind,
    folder: {
      folderKey: request.folder.folder_key,
      fullyQualifiedName: request.folder.fully_qualified_name,
      path: request.folder.path,
    },
  };
  if (request.type != null) payload.type = request.type;

  // Create-referenced-resource API expects the lock key scoped by the resource's folder
  // (projectLockKey-fullyQualifiedFolderName) when creating a resource in a folder.
  let lockKeyHeader = lockKey;
  if (lockKeyHeader && request.folder.fully_qualified_name) {
    lockKeyHeader = `${lockKeyHeader}-${request.folder.fully_qualified_name}`;
  }
  const headers = createHeaders({
    bearerToken: config.envConfig.accessToken,
    contentType: 'application/json',
  }) as Record<string, string>;
  headers['x-uipath-tenantid'] = config.envConfig.tenantId;
  if (lockKeyHeader) headers['x-uipath-sw-lockkey'] = lockKeyHeader;

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorText = await response.text();
    let msg = `Failed to create referenced resource: ${response.status} ${response.statusText}`;
    try {
      const body = JSON.parse(errorText) as { Detail?: string; Message?: string };
      if (body.Detail || body.Message) msg += ` - ${body.Detail || body.Message}`;
    } catch (parseErr) {
      config.logger.log(
        chalk.gray(
          `[createReferencedResource] Could not parse error response body: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`
        )
      );
    }
    trackApiFailure('createReferencedResource', msg, response.status);
    throw new Error(msg);
  }
  const data = (await response.json()) as {
    status?: string;
    resource?: Record<string, unknown>;
    saved?: boolean;
  };
  const rawStatus = (data.status || 'UNCHANGED').toString().toUpperCase();
  // Map API variants (e.g. Added, Created) to our enum
  const statusMap: Record<string, 'ADDED' | 'UNCHANGED' | 'UPDATED'> = {
    ADDED: 'ADDED',
    CREATED: 'ADDED',
    UPDATED: 'UPDATED',
    UNCHANGED: 'UNCHANGED',
  };
  const status = statusMap[rawStatus] ?? 'UNCHANGED';
  return {
    status,
    resource: data.resource || {},
    saved: data.saved || false,
  };
}
