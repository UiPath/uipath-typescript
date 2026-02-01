import * as path from 'path';
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
  computeNormalizedHash: (content: Buffer | string) => string;
}

export async function computeExecutionPlan(
  localFiles: LocalFile[],
  remoteFiles: Map<string, ProjectFile>,
  remoteFolders: Map<string, ProjectFolder>,
  opts: PlanOptions
): Promise<FileOperationPlan> {
  const { bundlePath, remoteContentRoot, downloadRemoteFile, computeNormalizedHash } = opts;
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
        const remoteHash = computeNormalizedHash(remoteContent);
        if (localFile.hash !== remoteHash) {
          plan.updateFiles.push({
            path: localFile.path,
            localFile,
            fileId: remoteFile.id,
          });
        }
      } catch {
        plan.updateFiles.push({
          path: localFile.path,
          localFile,
          fileId: remoteFile.id,
        });
      }
    } else {
      if (
        localFile.path === '.uipath/studio_metadata.json' ||
        localFile.path === 'studio_metadata.json'
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
      filePath === '.uipath/studio_metadata.json' ||
      filePath === 'studio_metadata.json'
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
      localFile.path === '.uipath/studio_metadata.json' ||
      localFile.path === 'studio_metadata.json'
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
    added_resources: plan.uploadFiles.map((op) => ({
      content_file_path: op.localFile.absPath,
      parent_path: op.parentPath,
    })),
    modified_resources: plan.updateFiles.map((op) => ({
      id: op.fileId,
      content_file_path: op.localFile.absPath,
    })),
    deleted_resources: plan.deleteFiles.map((op) => op.fileId),
  };
}
