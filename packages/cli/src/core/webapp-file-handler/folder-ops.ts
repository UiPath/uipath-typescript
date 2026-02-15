import chalk from 'chalk';
import { MESSAGES } from '../../constants/index.js';
import { cliTelemetryClient } from '../../telemetry/index.js';
import type { WebAppPushConfig, FileOperationPlan, ProjectFolder, ProjectStructure } from './types.js';
import {
  getRemoteFoldersMap,
  getRemoteContentRoot,
  REMOTE_SOURCE_FOLDER_NAME,
  findEmptyFolders,
  normalizeFolderPath,
} from './structure.js';
import * as api from './api.js';

/** Returns true if folderPath exists in the map (by exact or normalized key). Backend may return different casing. */
function hasFolderByPath(foldersMap: Map<string, ProjectFolder>, folderPath: string): boolean {
  const norm = normalizeFolderPath(folderPath);
  return (
    foldersMap.has(folderPath) ||
    foldersMap.has(norm) ||
    [...foldersMap.keys()].some((k) => normalizeFolderPath(k) === norm)
  );
}

/** Resolves folder id from map by path (exact or normalized). Returns undefined if not found. */
function getFolderIdFromMap(foldersMap: Map<string, ProjectFolder>, folderPath: string): string | undefined {
  const folder = foldersMap.get(folderPath) ?? foldersMap.get(normalizeFolderPath(folderPath));
  const id = folder?.id;
  if (id) return id;
  const entry = [...foldersMap.entries()].find(([k]) => normalizeFolderPath(k) === normalizeFolderPath(folderPath));
  const entryId = entry?.[1]?.id;
  return entryId ?? undefined;
}

/** Builds path -> folder id map with normalized keys so lookups match (e.g. Source vs source). */
export function buildFolderIdMap(structure: ProjectStructure): Map<string, string> {
  const map = new Map<string, string>();
  const folders = getRemoteFoldersMap(structure);
  for (const [folderPath, folder] of folders.entries()) {
    if (folder.id) map.set(normalizeFolderPath(folderPath), folder.id);
  }
  return map;
}

/**
 * Ensures remote has "source" and source/<buildDir> (e.g. source/dist). Creates missing segments with parentId
 * so hierarchy is correct. Uses normalized path comparison for backend path casing.
 */
export async function ensureContentRootExists(
  config: WebAppPushConfig,
  lockKey: string | null,
  getStructure: () => ProjectStructure | null,
  setStructure: (s: ProjectStructure) => void
): Promise<void> {
  const structure = getStructure();
  if (!structure) {
    throw new Error(MESSAGES.ERRORS.PUSH_PROJECT_STRUCTURE_REQUIRED);
  }
  const fullRemoteFolders = getRemoteFoldersMap(structure);
  const remoteContentRoot = getRemoteContentRoot(config.bundlePath);

  if (!hasFolderByPath(fullRemoteFolders, REMOTE_SOURCE_FOLDER_NAME)) {
    await api.createFolder(config, REMOTE_SOURCE_FOLDER_NAME, lockKey, null, REMOTE_SOURCE_FOLDER_NAME);
    const next = await api.fetchRemoteStructure(config);
    setStructure(next);
    const afterFolders = getRemoteFoldersMap(next);
    if (!hasFolderByPath(afterFolders, REMOTE_SOURCE_FOLDER_NAME)) {
      throw new Error(MESSAGES.ERRORS.PUSH_SOURCE_FOLDER_CREATE_FAILED);
    }
  }

  const segments = remoteContentRoot.split('/').filter(Boolean);
  let currentFolders = getRemoteFoldersMap(getStructure()!);
  let currentPath = '';
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    currentPath = currentPath ? `${currentPath}/${segment}` : segment;
    if (hasFolderByPath(currentFolders, currentPath)) continue;
    const parentPath = i > 0 ? segments.slice(0, i).join('/') : '';
    const parentId = parentPath ? (getFolderIdFromMap(currentFolders, parentPath) ?? null) : null;
    await api.createFolder(config, segment, lockKey, parentId, currentPath);
    const next = await api.fetchRemoteStructure(config);
    setStructure(next);
    currentFolders = getRemoteFoldersMap(next);
    if (!hasFolderByPath(currentFolders, currentPath)) {
      throw new Error(MESSAGES.ERRORS.PUSH_SOURCE_FOLDER_CREATE_FAILED);
    }
  }
}

/**
 * Refetches remote structure and merges folder ids into folderIdMap (normalized keys).
 * Used when createFolder returns null (e.g. 409 conflict) so subsequent creates get correct parentId.
 */
async function refetchAndMergeFolderIds(
  config: WebAppPushConfig,
  folderIdMap: Map<string, string>,
  setStructure: (s: ProjectStructure) => void
): Promise<Map<string, ProjectFolder>> {
  const next = await api.fetchRemoteStructure(config);
  setStructure(next);
  const afterCreate = getRemoteFoldersMap(next);
  for (const [pathKey, folder] of afterCreate.entries()) {
    if (folder.id && !folderIdMap.has(normalizeFolderPath(pathKey))) {
      folderIdMap.set(normalizeFolderPath(pathKey), folder.id);
    }
  }
  return afterCreate;
}

/** Resolves folder id from refetched map by path or by segment name (for fallback when path differs). */
function resolveFolderIdAfterCreate(
  afterCreate: Map<string, ProjectFolder>,
  folderPath: string,
  folderName: string
): string | undefined {
  const norm = normalizeFolderPath(folderPath);
  const byPath = afterCreate.get(folderPath) ?? afterCreate.get(norm);
  const pathId = byPath?.id;
  if (pathId) return pathId;
  const byName = afterCreate.get(folderName);
  const nameId = byName?.id;
  return nameId ?? undefined;
}

/**
 * Groups folder paths by depth (segment count). Folders at the same depth can be created in parallel.
 */
function groupFoldersByDepth(createFolders: FileOperationPlan['createFolders']): Map<number, typeof createFolders> {
  const byDepth = new Map<number, FileOperationPlan['createFolders']>();
  for (const folder of createFolders) {
    const depth = folder.path.split('/').filter(Boolean).length;
    const list = byDepth.get(depth) ?? [];
    list.push(folder);
    byDepth.set(depth, list);
  }
  return byDepth;
}

/**
 * Creates all folders in the plan under source/ with correct parentId. Folders at the same depth
 * are created in parallel; levels are processed in order so parent ids are available. When any
 * createFolder returns null (e.g. 409), refetches once for that level and merges ids.
 */
export async function ensureFoldersCreated(
  config: WebAppPushConfig,
  plan: FileOperationPlan,
  folderIdMap: Map<string, string>,
  setStructure: (s: ProjectStructure) => void,
  lockKey: string | null
): Promise<void> {
  if (plan.createFolders.length === 0) return;
  const norm = (p: string) => normalizeFolderPath(p);
  const byDepth = groupFoldersByDepth(plan.createFolders);
  const depths = [...byDepth.keys()].sort((a, b) => a - b);

  for (const depth of depths) {
    const folders = byDepth.get(depth)!;
    const toCreate = folders.filter((f) => !folderIdMap.has(norm(f.path)));
    if (toCreate.length === 0) continue;

    const results = await Promise.all(
      toCreate.map(async (folder) => {
        const pathParts = folder.path.split('/').filter(Boolean);
        const folderName = pathParts.pop()!;
        const parentPath = pathParts.length > 0 ? pathParts.join('/') : '';
        const parentId = parentPath ? folderIdMap.get(norm(parentPath)) ?? null : null;
        const id = await api.createFolder(config, folderName, lockKey, parentId, folder.path);
        return { folder, folderName, id };
      })
    );

    for (const { folder, folderName, id } of results) {
      if (id) folderIdMap.set(norm(folder.path), id);
    }

    const hadNull = results.some((r) => !r.id);
    if (hadNull) {
      cliTelemetryClient.track('Cli.Push.FolderCreateConflict', {
        message: 'One or more create folder returned null; refetching to resolve parent ids',
        depth: String(depth),
      });
      const afterCreate = await refetchAndMergeFolderIds(config, folderIdMap, setStructure);
      for (const { folder, folderName } of results) {
        if (folderIdMap.has(norm(folder.path))) continue;
        const resolvedId = resolveFolderIdAfterCreate(afterCreate, folder.path, folderName);
        if (resolvedId) folderIdMap.set(norm(folder.path), resolvedId);
      }
    }
  }

  const next = await api.fetchRemoteStructure(config);
  setStructure(next);
  const afterCreate = getRemoteFoldersMap(next);
  for (const folder of plan.createFolders) {
    if (folderIdMap.has(norm(folder.path))) continue;
    const folderName = folder.path.split('/').filter(Boolean).pop()!;
    const resolvedId = resolveFolderIdAfterCreate(afterCreate, folder.path, folderName);
    if (resolvedId) folderIdMap.set(norm(folder.path), resolvedId);
  }
}

export async function cleanupEmptyFolders(
  config: WebAppPushConfig,
  remoteContentRoot: string,
  fetchStructure: () => Promise<ProjectStructure>,
  lockKey: string | null
): Promise<void> {
  const structure = await fetchStructure();
  const emptyFolders = findEmptyFolders(structure, remoteContentRoot);
  for (const folder of emptyFolders) {
    if (!folder.id) continue;
    try {
      await api.deleteItem(config, folder.id, lockKey);
    } catch (e) {
      const msg = e instanceof Error ? e.message : MESSAGES.ERRORS.UNKNOWN_ERROR;
      config.logger.log(chalk.yellow(`${MESSAGES.ERRORS.PUSH_DELETE_FOLDER_PREFIX}${folder.name}: ${msg}`));
    }
  }
}
