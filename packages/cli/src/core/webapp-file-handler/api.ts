import * as path from 'path';
import fetch from 'node-fetch';
import FormData from 'form-data';
import chalk from 'chalk';
import {
  API_ENDPOINTS,
  STUDIO_WEB_HEADERS,
  STUDIO_WEB_API_VERSION,
  STUDIO_WEB_LOCK_ACQUIRE_PATH,
  STUDIO_WEB_REFERENCED_RESOURCE_FORCE_UPDATE,
  RESOURCE_CATALOG_SKIP,
  RESOURCE_CATALOG_TAKE,
  MAX_TELEMETRY_ERROR_LENGTH,
} from '../../constants/api.js';
import { AUTH_CONSTANTS } from '../../constants/auth.js';
import { MESSAGES } from '../../constants/index.js';
import { createHeaders } from '../../utils/api.js';
import { handleHttpError } from '../../utils/error-handler.js';
import { cliTelemetryClient } from '../../telemetry/index.js';
import type {
  WebAppProjectConfig,
  LocalFile,
  LockInfo,
  ProjectStructure,
  Resource,
  ResourceFolder,
  Connection,
  ReferencedResourceRequest,
  ReferencedResourceResponse,
} from './types.js';

const RESOURCE_CATALOG_TYPE_MAP: Record<string, string> = {
  asset: 'asset',
  process: 'process',
  bucket: 'bucket',
  index: 'index',
  app: 'app',
  connection: 'connection',
  queue: 'queue',
};

const REFERENCED_RESOURCE_STATUS_MAP: Record<string, 'ADDED' | 'UNCHANGED' | 'UPDATED'> = {
  ADDED: 'ADDED',
  CREATED: 'ADDED',
  UPDATED: 'UPDATED',
  UNCHANGED: 'UNCHANGED',
};

/** Thrown when createFile receives 409 Conflict (file already exists). Callers can treat as non-fatal and skip. */
export class FileAlreadyExistsError extends Error {
  constructor(public readonly filePath: string) {
    super(`File already exists: ${filePath}`);
    this.name = 'FileAlreadyExistsError';
  }
}

function trackApiFailure(apiMethod: string, errorMessage: string, statusCode?: number): void {
  cliTelemetryClient.track('Cli.Push.ApiFailure', {
    api_method: apiMethod,
    error_message: errorMessage.length > MAX_TELEMETRY_ERROR_LENGTH
      ? `${errorMessage.slice(0, MAX_TELEMETRY_ERROR_LENGTH)}...`
      : errorMessage,
    ...(statusCode !== undefined && { status_code: statusCode }),
  });
}

export function buildApiUrl(config: WebAppProjectConfig, endpoint: string, tenantScoped = false): string {
  const { baseUrl, orgId, tenantId } = config.envConfig;
  if (tenantScoped) {
    return `${baseUrl}/${orgId}/${tenantId}${endpoint}`;
  }
  return `${baseUrl}/${orgId}${endpoint}`;
}

export async function fetchRemoteStructure(
  config: WebAppProjectConfig
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

/**
 * Releases the project lock. Call after push completes (success or failure) so the project is not
 * left locked until backend timeout. DELETE /Project/{projectId}/Lock/{lockKey}.
 */
export async function releaseLock(config: WebAppProjectConfig, lockKey: string): Promise<void> {
  const url = buildApiUrl(
    config,
    `${API_ENDPOINTS.STUDIO_WEB_LOCK.replace('{projectId}', config.projectId)}/${encodeURIComponent(lockKey)}?api-version=${STUDIO_WEB_API_VERSION}`
  );
  const response = await fetch(url, {
    method: 'DELETE',
    headers: createHeaders({
      bearerToken: config.envConfig.accessToken,
      tenantId: config.envConfig.tenantId,
    }),
  });
  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    const errMsg = `Release lock failed: ${response.status} ${response.statusText}${errText ? ` — ${errText.slice(0, 80)}` : ''}`;
    trackApiFailure('releaseLock', errMsg, response.status);
    throw new Error(errMsg);
  }
}

/**
 * Acquires the project/solution lock for push operations.
 * GET returns lock info; if none exists (projectLockKey/solutionLockKey empty), we acquire via PUT
 * and then retry GET to obtain the keys. Call releaseLock when done (success or failure).
 */
export async function retrieveLock(config: WebAppProjectConfig): Promise<LockInfo | null> {
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
    if (msg.startsWith('Lock was acquired but retrieving') || msg.startsWith('Acquire lock failed')) throw err;
    trackApiFailure('retrieveLock', msg);
    config.logger.log(chalk.gray(`[retrieveLock] Error: ${msg}`));
    return null;
  }
}

export async function putLock(config: WebAppProjectConfig): Promise<void> {
  const url = buildApiUrl(
    config,
    `${API_ENDPOINTS.STUDIO_WEB_LOCK.replace('{projectId}', config.projectId)}/${STUDIO_WEB_LOCK_ACQUIRE_PATH}?api-version=${STUDIO_WEB_API_VERSION}`
  );
  const response = await fetch(url, {
    method: 'PUT',
    headers: createHeaders({
      bearerToken: config.envConfig.accessToken,
      tenantId: config.envConfig.tenantId,
    }),
  });
  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    const errMsg = `Acquire lock failed: ${response.status} ${response.statusText}${errText ? ` — ${errText.slice(0, 80)}` : ''}`;
    trackApiFailure('putLock', errMsg, response.status);
    throw new Error(errMsg);
  }
}

export async function createFolder(
  config: WebAppProjectConfig,
  name: string,
  lockKey: string | null,
  parentId?: string | null,
  path?: string | null
): Promise<string | null> {
  const url = buildApiUrl(
    config,
    API_ENDPOINTS.STUDIO_WEB_CREATE_FOLDER.replace('{projectId}', config.projectId)
  );
  const headers = createHeaders({
    bearerToken: config.envConfig.accessToken,
    tenantId: config.envConfig.tenantId,
    contentType: AUTH_CONSTANTS.CONTENT_TYPES.JSON,
  });
  if (lockKey) headers[STUDIO_WEB_HEADERS.LOCK_KEY] = lockKey;
  const body: { name: string; parentId?: string; path?: string } = { name };
  if (parentId) body.parentId = parentId;
  if (path) body.path = path;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (response.ok) {
      const ct = response.headers.get('content-type');
      if (ct?.includes(AUTH_CONSTANTS.CONTENT_TYPES.JSON)) {
        const data = (await response.json()) as { id?: string };
        if (data.id) return data.id;
      }
      return null;
    }
    if (response.status === 409) return null;
    const err = await response.text().catch(() => '');
    const errMsg = `Create folder '${name}' failed: ${response.status} ${err.slice(0, 80)}`;
    trackApiFailure('createFolder', errMsg, response.status);
    throw new Error(errMsg);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    trackApiFailure('createFolder', msg);
    config.logger.log(chalk.yellow(`${MESSAGES.ERRORS.PUSH_CREATE_FOLDER_FAILED_PREFIX}${name} — ${msg}`));
    return null;
  }
}

export async function downloadRemoteFile(
  config: WebAppProjectConfig,
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

function buildFileUploadForm(
  config: WebAppProjectConfig,
  filePath: string,
  localFile: LocalFile,
  lockKey: string | null
): { form: FormData; headers: Record<string, string> } {
  const form = new FormData();
  form.append('file', localFile.content, {
    filename: path.basename(filePath),
    contentType: AUTH_CONSTANTS.CONTENT_TYPES.OCTET_STREAM,
  });
  const baseHeaders = createHeaders({
    bearerToken: config.envConfig.accessToken,
    tenantId: config.envConfig.tenantId,
    contentType: undefined,
  });
  delete (baseHeaders as Record<string, string>)['Content-Type'];
  const headers = { ...baseHeaders, ...form.getHeaders() } as Record<string, string>;
  if (lockKey) headers[STUDIO_WEB_HEADERS.LOCK_KEY] = lockKey;
  return { form, headers };
}

export async function createFile(
  config: WebAppProjectConfig,
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
  const { form, headers } = buildFileUploadForm(config, filePath, localFile, lockKey);
  form.append('path', filePath); // Full remote path (e.g. source/src/App.tsx) so backend can create folder hierarchy
  if (parentId) form.append('parentId', parentId);
  else if (parentPath) form.append('parentPath', parentPath);
  const response = await fetch(url, { method: 'POST', headers, body: form });
  if (!response.ok) {
    if (response.status === 409) {
      throw new FileAlreadyExistsError(filePath);
    }
    const errMsg = `Failed to upload file '${filePath}': ${response.status} ${response.statusText}`;
    trackApiFailure('createFile', errMsg, response.status);
    throw new Error(errMsg);
  }
}

export async function updateFile(
  config: WebAppProjectConfig,
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
  const { form, headers } = buildFileUploadForm(config, filePath, localFile, lockKey);
  const response = await fetch(url, { method: 'PUT', headers, body: form });
  if (!response.ok) {
    const errMsg = `Failed to update file '${filePath}': ${response.status} ${response.statusText}`;
    trackApiFailure('updateFile', errMsg, response.status);
    throw new Error(errMsg);
  }
}

export async function deleteItem(
  config: WebAppProjectConfig,
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
  if (lockKey) headers[STUDIO_WEB_HEADERS.LOCK_KEY] = lockKey;
  const response = await fetch(url, { method: 'DELETE', headers });
  if (!response.ok) {
    const errMsg = `Failed to delete item ${itemId}: ${response.status} ${response.statusText}`;
    trackApiFailure('deleteItem', errMsg, response.status);
    throw new Error(errMsg);
  }
}

export async function getSolutionId(config: WebAppProjectConfig): Promise<string> {
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

function catalogItemToResource(
  item: Record<string, unknown>,
  itemFolders: Array<Record<string, unknown>>,
  mapFolder: (f: Record<string, unknown>) => ResourceFolder
): Resource {
  return {
    resourceKey: (item.entityKey || item.resource_key) as string,
    name: item.name as string,
    resourceType: (item.entityType || item.resource_type) as string,
    resourceSubType: (item.entitySubType || item.resource_sub_type || null) as string | null,
    folders: itemFolders.map(mapFolder),
  };
}

function findMatchingResourceInItems(
  items: Array<Record<string, unknown>>,
  name: string,
  folderPath: string,
  mapFolder: (f: Record<string, unknown>) => ResourceFolder
): Resource | null {
  for (const item of items) {
    if (item.name !== name) continue;
    const itemFolders = (item.folders || []) as Array<Record<string, unknown>>;
    if (!folderPath && itemFolders.length > 0) return catalogItemToResource(item, itemFolders, mapFolder);
    for (const folder of itemFolders) {
      if (folder.path === folderPath) return catalogItemToResource(item, itemFolders, mapFolder);
    }
  }
  return null;
}

function parseCatalogResponse(
  responseText: string,
  contentType: string,
  response: { status: number; statusText: string },
  config: WebAppProjectConfig
): { value?: unknown[]; items?: unknown[] } {
  if (!contentType.includes(AUTH_CONSTANTS.CONTENT_TYPES.JSON) && responseText.trim().startsWith('<!DOCTYPE')) {
    const errMsg = `API returned HTML instead of JSON. Status: ${response.status}`;
    trackApiFailure('findResourceInCatalog', errMsg, response.status);
    throw new Error(errMsg);
  }
  try {
    return JSON.parse(responseText) as { value?: unknown[]; items?: unknown[] };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    trackApiFailure('findResourceInCatalog', `Invalid JSON: ${msg}`);
    config.logger.log(chalk.gray(`[findResourceInCatalog] Invalid JSON: ${msg}`));
    throw new Error(`Invalid JSON: ${msg}`);
  }
}

export async function findResourceInCatalog(
  config: WebAppProjectConfig,
  resourceType: string,
  name: string,
  folderPath: string,
  mapFolder: (f: Record<string, unknown>) => ResourceFolder
): Promise<Resource> {
  const apiResourceType = RESOURCE_CATALOG_TYPE_MAP[resourceType.toLowerCase()];
  if (!apiResourceType) throw new Error(`Unknown resource type: ${resourceType}`);

  const url = buildApiUrl(
    config,
    API_ENDPOINTS.RESOURCE_CATALOG_ENTITIES.replace('{resourceType}', apiResourceType),
    true
  );
  const params = new URLSearchParams({ name, skip: RESOURCE_CATALOG_SKIP, take: RESOURCE_CATALOG_TAKE });
  const response = await fetch(`${url}?${params.toString()}`, {
    method: 'GET',
    headers: createHeaders({
      bearerToken: config.envConfig.accessToken,
      tenantId: config.envConfig.tenantId,
      additionalHeaders: { Accept: AUTH_CONSTANTS.CONTENT_TYPES.JSON },
    }),
  });
  const responseText = await response.text();
  const contentType = response.headers.get('content-type') || '';
  if (!response.ok) {
    const errMsg = `Failed to search resource catalog: ${response.status} ${response.statusText}`;
    trackApiFailure('findResourceInCatalog', errMsg, response.status);
    throw new Error(errMsg);
  }
  const data = parseCatalogResponse(responseText, contentType, response, config);
  const items = (data.value || data.items || []) as Array<Record<string, unknown>>;
  const match = findMatchingResourceInItems(items, name, folderPath, mapFolder);
  if (match) return match;

  const folderInfo = folderPath ? ` at folder path '${folderPath}'` : ' (tenant-scoped)';
  const errMsg = `Resource '${name}' of type '${resourceType}' not found${folderInfo}`;
  trackApiFailure('findResourceInCatalog', errMsg);
  throw new Error(errMsg);
}

export function mapFolder(f: Record<string, unknown>): ResourceFolder {
  const folderKey =
    (f.key as string) ||
    (f.folderKey as string) ||
    (f.folder_key as string) ||
    (f.path && String(f.path).match(/^[0-9a-f-]{36}$/i) ? (f.path as string) : '');
  return {
    folderKey,
    fullyQualifiedName: (f.fullyQualifiedName || f.fully_qualified_name || '') as string,
    path: (f.path || '') as string,
  };
}

export async function retrieveConnection(
  config: WebAppProjectConfig,
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
          folderKey: data.Folder.Id || data.Folder.Key || '',
          fullyQualifiedName: data.Folder.FullyQualifiedName || '',
          path: data.Folder.Path || '',
        }
      : null,
  };
}

function buildCreateReferencedResourcePayload(request: ReferencedResourceRequest): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    key: request.key,
    kind: request.kind,
    folder: {
      folderKey: request.folder.folderKey,
      fullyQualifiedName: request.folder.fullyQualifiedName,
      path: request.folder.path,
    },
  };
  if (request.type != null) payload.type = request.type;
  return payload;
}

/** Create-referenced-resource API expects the lock key scoped by the resource's folder (projectLockKey-fullyQualifiedFolderName). */
function getScopedLockKey(lockKey: string | null, fullyQualifiedName: string): string | null {
  if (!lockKey || !fullyQualifiedName) return lockKey;
  return `${lockKey}-${fullyQualifiedName}`;
}

function buildCreateReferencedResourceHeaders(
  config: WebAppProjectConfig,
  lockKeyHeader: string | null
): Record<string, string> {
  const headers = createHeaders({
    bearerToken: config.envConfig.accessToken,
    contentType: AUTH_CONSTANTS.CONTENT_TYPES.JSON,
  }) as Record<string, string>;
  headers[STUDIO_WEB_HEADERS.TENANT_ID] = config.envConfig.tenantId;
  if (lockKeyHeader) headers[STUDIO_WEB_HEADERS.LOCK_KEY] = lockKeyHeader;
  return headers;
}

function parseCreateReferencedResourceError(
  errorText: string,
  status: number,
  statusText: string,
  config: WebAppProjectConfig
): string {
  let msg = `Failed to create referenced resource: ${status} ${statusText}`;
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
  return msg;
}

function parseCreateReferencedResourceResponse(data: {
  status?: string;
  resource?: Record<string, unknown>;
  saved?: boolean;
}): ReferencedResourceResponse {
  const rawStatus = (data.status || 'UNCHANGED').toString().toUpperCase();
  const status = REFERENCED_RESOURCE_STATUS_MAP[rawStatus] ?? 'UNCHANGED';
  return {
    status,
    resource: data.resource || {},
    saved: data.saved || false,
  };
}

export async function createReferencedResource(
  config: WebAppProjectConfig,
  solutionId: string,
  request: ReferencedResourceRequest,
  lockKey: string | null
): Promise<ReferencedResourceResponse> {
  const baseUrl = buildApiUrl(
    config,
    API_ENDPOINTS.STUDIO_WEB_CREATE_REFERENCED_RESOURCE.replace('{solutionId}', solutionId),
    false
  );
  const url = `${baseUrl}?api-version=${STUDIO_WEB_API_VERSION}&forceUpdate=${STUDIO_WEB_REFERENCED_RESOURCE_FORCE_UPDATE}`;
  const payload = buildCreateReferencedResourcePayload(request);
  const lockKeyHeader = getScopedLockKey(lockKey, request.folder.fullyQualifiedName);
  const headers = buildCreateReferencedResourceHeaders(config, lockKeyHeader);

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorText = await response.text();
    const msg = parseCreateReferencedResourceError(
      errorText,
      response.status,
      response.statusText,
      config
    );
    trackApiFailure('createReferencedResource', msg, response.status);
    throw new Error(msg);
  }
  const data = (await response.json()) as {
    status?: string;
    resource?: Record<string, unknown>;
    saved?: boolean;
  };
  return parseCreateReferencedResourceResponse(data);
}
