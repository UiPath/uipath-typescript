import * as path from 'path';
import chalk from 'chalk';
import { STUDIO_METADATA_FILENAME, STUDIO_METADATA_RELATIVE_PATH } from '../../constants/api.js';
import { MESSAGES } from '../../constants/index.js';
import type {
  FileOperationPlan,
  LocalFile,
  ProjectFile,
  ProjectFolder,
  StructuralMigration,
} from './types.js';
import { localPathToRemotePath } from './structure.js';

export interface PlanOptions {
  bundlePath: string;
  remoteContentRoot: string;
  downloadRemoteFile: (fileId: string) => Promise<Buffer>;
  /** Path-based: same filePath (e.g. local path) when hashing local and remote content for the same file. */
  computeHash: (content: Buffer | string, filePath: string) => string;
  /** Optional logger for error/debug output during plan computation. */
  logger?: { log: (message: string) => void };
}

export async function computeExecutionPlan(
  localFiles: LocalFile[],
  remoteFiles: Map<string, ProjectFile>,
  remoteFolders: Map<string, ProjectFolder>,
  opts: PlanOptions
): Promise<FileOperationPlan> {
  const { bundlePath, remoteContentRoot, downloadRemoteFile, computeHash, logger } = opts;
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

  for (const localFile of localFiles) {
    const remotePath = localPathToRemotePath(localFile.path, bundlePath, remoteContentRoot);
    localRemotePaths.add(remotePath);
    const remoteFile = remoteFiles.get(remotePath);

    const remoteParentPath = path.dirname(remotePath);
    const parentPathForPlan = remoteParentPath === '.' ? remoteContentRoot : remoteParentPath;
    const pathParts = parentPathForPlan.split('/');
    let currentPath = '';
    for (const part of pathParts) {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      requiredFolders.add(currentPath);
    }

    if (remoteFile) {
      processedFileIds.add(remoteFile.id);
      try {
        const remoteContent = await downloadRemoteFile(remoteFile.id);
        const remoteHash = computeHash(remoteContent, localFile.path);
        if (localFile.hash !== remoteHash) {
          plan.updateFiles.push({
            path: localFile.path,
            localFile,
            fileId: remoteFile.id,
          });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (logger) {
          logger.log(
            chalk.gray(
              `${MESSAGES.ERRORS.PUSH_DOWNLOAD_REMOTE_FILE_FAILED_PREFIX}${localFile.path} — ${msg}`
            )
          );
        }
        plan.updateFiles.push({
          path: localFile.path,
          localFile,
          fileId: remoteFile.id,
        });
      }
    } else {
      if (
        localFile.path === STUDIO_METADATA_RELATIVE_PATH ||
        localFile.path === STUDIO_METADATA_FILENAME
      ) {
        continue;
      }
      plan.uploadFiles.push({
        path: localFile.path,
        localFile,
        parentPath: parentPathForPlan,
      });
    }
  }

  for (const [filePath, remoteFile] of remoteFiles.entries()) {
    if (
      filePath === STUDIO_METADATA_RELATIVE_PATH ||
      filePath === STUDIO_METADATA_FILENAME
    ) {
      continue;
    }
    if (processedFileIds.has(remoteFile.id)) continue;
    const normalizedRemote = filePath.replace(/\\/g, '/');
    if (!localRemotePaths.has(normalizedRemote)) {
      plan.deleteFiles.push({ fileId: remoteFile.id, path: filePath });
    }
  }

  for (const folderPath of requiredFolders) {
    if (!remoteFolders.has(folderPath)) {
      plan.createFolders.push({ path: folderPath });
    }
  }

  const contentRootPrefix = remoteContentRoot + '/';
  for (const [folderPath, folder] of remoteFolders.entries()) {
    if (requiredFolders.has(folderPath)) continue;
    const normalizedRemote = folderPath.replace(/\\/g, '/');
    const isUnderContentRoot = normalizedRemote.startsWith(contentRootPrefix);
    if (isUnderContentRoot && folder.id) {
      plan.deleteFolders.push({ folderId: folder.id, path: folderPath });
    }
  }

  plan.createFolders.sort((a, b) => a.path.split('/').length - b.path.split('/').length);
  plan.deleteFolders.sort(
    (a, b) => b.path.split('/').length - a.path.split('/').length
  );

  return plan;
}

export function computeFirstPushPlan(
  localFiles: LocalFile[],
  remoteFolders: Map<string, ProjectFolder>,
  opts: { remoteContentRoot: string; bundlePath: string }
): FileOperationPlan {
  const { remoteContentRoot, bundlePath } = opts;
  const plan: FileOperationPlan = {
    createFolders: [],
    uploadFiles: [],
    updateFiles: [],
    deleteFiles: [],
    deleteFolders: [],
  };

  const requiredFolders = new Set<string>();

  for (const localFile of localFiles) {
    if (
      localFile.path === STUDIO_METADATA_RELATIVE_PATH ||
      localFile.path === STUDIO_METADATA_FILENAME
    ) {
      continue;
    }
    const remotePath = localPathToRemotePath(localFile.path, bundlePath, remoteContentRoot);
    const remoteParentPath = path.dirname(remotePath);
    const parentPathForPlan = remoteParentPath === '.' ? remoteContentRoot : remoteParentPath;

    plan.uploadFiles.push({
      path: localFile.path,
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
    if (!remoteFolders.has(folderPath)) {
      plan.createFolders.push({ path: folderPath });
    }
  }

  plan.createFolders.sort((a, b) => a.path.split('/').length - b.path.split('/').length);
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
