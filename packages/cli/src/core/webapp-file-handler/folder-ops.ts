import chalk from 'chalk';
import { MESSAGES } from '../../constants/index.js';
import type { WebAppPushConfig, FileOperationPlan, ProjectFolder, ProjectStructure } from './types.js';
import {
  getRemoteFoldersMap,
  REMOTE_SOURCE_FOLDER_NAME,
  findEmptyFolders,
} from './structure.js';
import * as api from './api.js';

export function buildFolderIdMap(structure: ProjectStructure): Map<string, string> {
  const map = new Map<string, string>();
  const folders = getRemoteFoldersMap(structure);
  for (const [folderPath, folder] of folders.entries()) {
    if (folder.id) map.set(folderPath, folder.id);
  }
  return map;
}

export async function ensureContentRootExists(
  config: WebAppPushConfig,
  lockKey: string | null,
  getStructure: () => ProjectStructure | null,
  setStructure: (s: ProjectStructure) => void
): Promise<void> {
  const fullRemoteFolders = getRemoteFoldersMap(getStructure()!);

  if (!fullRemoteFolders.has(REMOTE_SOURCE_FOLDER_NAME)) {
    await api.createFolderAtRoot(config, REMOTE_SOURCE_FOLDER_NAME, lockKey);
    const next = await api.fetchRemoteStructure(config);
    setStructure(next);
  }
}

export async function ensureFoldersCreated(
  config: WebAppPushConfig,
  plan: FileOperationPlan,
  folderIdMap: Map<string, string>,
  getStructure: () => ProjectStructure | null,
  setStructure: (s: ProjectStructure) => void,
  lockKey: string | null
): Promise<void> {
  if (plan.createFolders.length === 0) return;
  for (const folder of plan.createFolders) {
    if (folderIdMap.has(folder.path)) continue;
    const folderName = folder.path.split('/').filter(Boolean).pop()!;
    const id = await api.createFolderAtRoot(config, folderName, lockKey);
    if (id) folderIdMap.set(folder.path, id);
  }
  const next = await api.fetchRemoteStructure(config);
  setStructure(next);
  const afterCreate = getRemoteFoldersMap(next);
  for (const folder of plan.createFolders) {
    if (folderIdMap.has(folder.path)) continue;
    const folderName = folder.path.split('/').filter(Boolean).pop()!;
    const byPath = afterCreate.get(folder.path);
    const byName = afterCreate.get(folderName);
    if (byPath?.id) folderIdMap.set(folder.path, byPath.id);
    else if (byName?.id) folderIdMap.set(folder.path, byName.id);
  }
}

export async function moveNestedFoldersIntoParents(
  config: WebAppPushConfig,
  createFolders: FileOperationPlan['createFolders'],
  folderIdMap: Map<string, string>,
  lockKey: string | null
): Promise<void> {
  const moves: Array<{ folderPath: string; folderId: string; parentId: string }> = [];
  for (const folder of createFolders) {
    const pathParts = folder.path.split('/').filter(Boolean);
    if (pathParts.length <= 1) continue;
    const parentPath = pathParts.slice(0, -1).join('/');
    const folderId = folderIdMap.get(folder.path);
    const parentId = folderIdMap.get(parentPath);
    if (folderId && parentId && folderId !== parentId) {
      moves.push({ folderPath: folder.path, folderId, parentId });
    }
  }
  for (const m of moves) {
    try {
      await api.moveFolder(config, m.folderId, m.parentId, lockKey);
    } catch (e) {
      const msg = e instanceof Error ? e.message : MESSAGES.ERRORS.UNKNOWN_ERROR;
      config.logger.log(chalk.yellow(`${MESSAGES.ERRORS.PUSH_MOVE_FOLDER_FAILED_PREFIX}${m.folderPath} — ${msg}`));
    }
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
    } catch {
      /* ignore */
    }
  }
}
