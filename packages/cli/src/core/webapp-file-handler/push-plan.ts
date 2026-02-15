import * as path from 'path';
import chalk from 'chalk';
import { PUSH_METADATA_FILENAME, PUSH_METADATA_RELATIVE_PATH } from '../../constants/api.js';
import { MESSAGES } from '../../constants/index.js';
import type {
  FileOperationPlan,
  LocalFile,
  LocalFileWithRemote,
  ProjectFile,
  ProjectFolder,
  StructuralMigration,
} from './types.js';
import { REMOTE_PATH_SEP } from '../../constants/index.js';
import { PUSH_METADATA_REMOTE_PATH, REMOTE_SOURCE_FOLDER_NAME, normalizeFolderPath } from './structure.js';

export interface PlanOptions {
  bundlePath: string;
  remoteContentRoot: string;
  downloadRemoteFile: (fileId: string) => Promise<Buffer>;
  /** Path-based: same filePath (e.g. local path) when hashing local and remote content for the same file. */
  computeHash: (content: Buffer | string, filePath: string) => string;
  /** Optional logger for error/debug output during plan computation. */
  logger?: { log: (message: string) => void };
}

/**
 * Computes add/update/delete plan by diffing local files (with remote paths) against remote files/folders.
 * Uses normalized path comparison so backend path casing (e.g. Source vs source) does not cause false diffs.
 * Remote file downloads and hash comparisons run in parallel to speed up the diff.
 */
export async function computeExecutionPlan(
  localFilesWithRemote: LocalFileWithRemote[],
  remoteFiles: Map<string, ProjectFile>,
  remoteFolders: Map<string, ProjectFolder>,
  opts: PlanOptions
): Promise<FileOperationPlan> {
  const { downloadRemoteFile, computeHash, logger } = opts;
  const plan: FileOperationPlan = {
    createFolders: [],
    uploadFiles: [],
    updateFiles: [],
    deleteFiles: [],
    deleteFolders: [],
  };

  const processedFileIds = new Set<string>();
  const requiredFolders = new Set<string>();
  const localRemotePaths = new Set<string>();
  /** Files that exist on both sides: we need to download and compare hashes in parallel. */
  const toCompare: Array<{ localFile: LocalFile; remotePath: string; remoteFile: ProjectFile }> = [];

  for (const { localFile, remotePath } of localFilesWithRemote) {
    localRemotePaths.add(remotePath);
    const remoteParentPath = path.dirname(remotePath);
    const parentPathForPlan =
      remoteParentPath === '.' ? REMOTE_SOURCE_FOLDER_NAME : remoteParentPath;
    const pathParts = parentPathForPlan.split('/');
    let currentPath = '';
    for (const part of pathParts) {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      requiredFolders.add(currentPath);
    }

    const remoteFile = remoteFiles.get(remotePath);
    if (remoteFile) {
      toCompare.push({ localFile, remotePath, remoteFile });
    } else {
      if (
        remotePath === PUSH_METADATA_REMOTE_PATH ||
        remotePath.endsWith(REMOTE_PATH_SEP + PUSH_METADATA_FILENAME)
      ) {
        continue;
      }
      plan.uploadFiles.push({
        path: remotePath,
        localFile,
        parentPath: parentPathForPlan,
      });
    }
  }

  const compareResults = await Promise.allSettled(
    toCompare.map(async ({ localFile, remotePath, remoteFile }) => {
      const remoteContent = await downloadRemoteFile(remoteFile.id);
      const remoteHash = computeHash(remoteContent, localFile.path);
      return { remotePath, localFile, remoteFile, remoteHash };
    })
  );

  for (let i = 0; i < compareResults.length; i++) {
    const result = compareResults[i];
    const { remotePath, localFile, remoteFile } = toCompare[i];
    processedFileIds.add(remoteFile.id);
    if (result.status === 'fulfilled') {
      if (result.value.remoteHash !== localFile.hash) {
        plan.updateFiles.push({ path: remotePath, localFile, fileId: remoteFile.id });
      }
    } else {
      const msg = result.reason instanceof Error ? result.reason.message : String(result.reason);
      if (logger) {
        logger.log(
          chalk.gray(
            `${MESSAGES.ERRORS.PUSH_DOWNLOAD_REMOTE_FILE_FAILED_PREFIX}${remotePath} — ${msg} (will update anyway)`
          )
        );
      }
      plan.updateFiles.push({ path: remotePath, localFile, fileId: remoteFile.id });
    }
  }

  for (const [filePath, remoteFile] of remoteFiles.entries()) {
    if (
      filePath === PUSH_METADATA_REMOTE_PATH ||
      filePath === PUSH_METADATA_RELATIVE_PATH ||
      filePath === PUSH_METADATA_FILENAME
    ) {
      continue;
    }
    if (processedFileIds.has(remoteFile.id)) continue;
    const normalizedRemote = normalizeFolderPath(filePath);
    if (!localRemotePaths.has(normalizedRemote)) {
      plan.deleteFiles.push({ fileId: remoteFile.id, path: filePath });
    }
  }

  const requiredFoldersNormalized = new Set([...requiredFolders].map(normalizeFolderPath));
  const remoteFoldersByNormalized = new Map<string, string>();
  for (const key of remoteFolders.keys()) {
    remoteFoldersByNormalized.set(normalizeFolderPath(key), key);
  }
  for (const folderPath of requiredFolders) {
    if (!remoteFoldersByNormalized.has(normalizeFolderPath(folderPath))) {
      plan.createFolders.push({ path: folderPath });
    }
  }

  const contentRootPrefix = REMOTE_SOURCE_FOLDER_NAME + REMOTE_PATH_SEP;
  const normalizedContentRootPrefix = normalizeFolderPath(contentRootPrefix);
  const sourceFolderNorm = normalizeFolderPath(REMOTE_SOURCE_FOLDER_NAME);
  for (const [folderPath, folder] of remoteFolders.entries()) {
    const normalizedFolder = normalizeFolderPath(folderPath);
    if (requiredFoldersNormalized.has(normalizedFolder)) continue;
    const isUnderContentRoot =
      normalizedFolder === sourceFolderNorm ||
      normalizedFolder.startsWith(normalizedContentRootPrefix);
    if (isUnderContentRoot && folder.id) {
      plan.deleteFolders.push({ folderId: folder.id, path: folderPath });
    }
  }

  plan.createFolders.sort((a, b) => a.path.split(REMOTE_PATH_SEP).length - b.path.split(REMOTE_PATH_SEP).length);
  plan.deleteFolders.sort(
    (a, b) => b.path.split(REMOTE_PATH_SEP).length - a.path.split(REMOTE_PATH_SEP).length
  );

  return plan;
}

/**
 * Plan for first push: all local files as uploads and required folders as creates.
 * Skips push_metadata.json (handled separately). Uses normalized path for folder existence check.
 */
export function computeFirstPushPlan(
  localFilesWithRemote: LocalFileWithRemote[],
  remoteFolders: Map<string, ProjectFolder>,
  _opts: { remoteContentRoot: string; bundlePath: string }
): FileOperationPlan {
  const plan: FileOperationPlan = {
    createFolders: [],
    uploadFiles: [],
    updateFiles: [],
    deleteFiles: [],
    deleteFolders: [],
  };

  const requiredFolders = new Set<string>();

  for (const { localFile, remotePath } of localFilesWithRemote) {
    if (
      remotePath === PUSH_METADATA_REMOTE_PATH ||
      remotePath.endsWith(REMOTE_PATH_SEP + PUSH_METADATA_FILENAME)
    ) {
      continue;
    }
    const remoteParentPath = path.dirname(remotePath);
    const parentPathForPlan =
      remoteParentPath === '.' ? REMOTE_SOURCE_FOLDER_NAME : remoteParentPath;

    plan.uploadFiles.push({
      path: remotePath,
      localFile,
      parentPath: parentPathForPlan,
    });

    const pathParts = parentPathForPlan.split('/');
    let currentPath = '';
    for (const part of pathParts) {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      requiredFolders.add(currentPath);
    }
  }

  for (const folderPath of requiredFolders) {
    const normPath = normalizeFolderPath(folderPath);
    const hasFolder = remoteFolders.has(folderPath) || [...remoteFolders.keys()].some((k) => normalizeFolderPath(k) === normPath);
    if (!hasFolder) {
      plan.createFolders.push({ path: folderPath });
    }
  }

  plan.createFolders.sort((a, b) => a.path.split(REMOTE_PATH_SEP).length - b.path.split(REMOTE_PATH_SEP).length);
  return plan;
}

export function convertPlanToMigration(plan: FileOperationPlan): StructuralMigration {
  return {
    addedResources: plan.uploadFiles.map((op) => ({
      contentFilePath: op.localFile.absPath,
      parentPath: op.parentPath,
    })),
    modifiedResources: plan.updateFiles.map((op) => ({
      id: op.fileId,
      contentFilePath: op.localFile.absPath,
    })),
    deletedResources: plan.deleteFiles.map((op) => op.fileId),
  };
}
