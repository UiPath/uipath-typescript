import type { ProjectFile, ProjectFolder, ProjectStructure } from './types.js';

export const REMOTE_SOURCE_FOLDER_NAME = 'source';

/** Remote root for pushed content. Content inside the build dir is placed directly under source (no extra folder for dist/output/build). */
export function getRemoteContentRoot(_bundlePath: string): string {
  return REMOTE_SOURCE_FOLDER_NAME;
}

export function localPathToRemotePath(
  localPath: string,
  bundlePath: string,
  remoteContentRoot: string
): string {
  const normalized = localPath.replace(/\\/g, '/');
  const prefix = bundlePath + '/';
  if (normalized.startsWith(prefix)) {
    return remoteContentRoot + '/' + normalized.slice(prefix.length);
  }
  if (normalized === bundlePath) {
    return remoteContentRoot;
  }
  return remoteContentRoot + '/' + normalized;
}

export function filterToSourceFolderFiles(
  files: Map<string, ProjectFile>,
  remoteContentRoot: string
): Map<string, ProjectFile> {
  const prefix = remoteContentRoot + '/';
  const filtered = new Map<string, ProjectFile>();
  for (const [filePath, file] of files.entries()) {
    if (filePath === remoteContentRoot || filePath.startsWith(prefix)) {
      filtered.set(filePath, file);
    }
  }
  return filtered;
}

export function filterToSourceFolderFolders(
  folders: Map<string, ProjectFolder>,
  remoteContentRoot: string
): Map<string, ProjectFolder> {
  const prefix = remoteContentRoot + '/';
  const filtered = new Map<string, ProjectFolder>();
  for (const [folderPath, folder] of folders.entries()) {
    if (folderPath === remoteContentRoot || folderPath.startsWith(prefix)) {
      filtered.set(folderPath, folder);
    }
  }
  return filtered;
}

export function getRemoteFilesMap(structure: ProjectStructure): Map<string, ProjectFile> {
  const files = new Map<string, ProjectFile>();

  const collectFiles = (folder: ProjectFolder, currentPath: string = '') => {
    for (const file of folder.files) {
      const filePath = currentPath ? `${currentPath}/${file.name}` : file.name;
      files.set(filePath, file);
    }
    for (const subfolder of folder.folders) {
      const subfolderPath = currentPath ? `${currentPath}/${subfolder.name}` : subfolder.name;
      collectFiles(subfolder, subfolderPath);
    }
  };

  for (const file of structure.files) {
    files.set(file.name, file);
  }
  for (const folder of structure.folders) {
    collectFiles(folder, folder.name);
  }

  return files;
}

export function getRemoteFoldersMap(structure: ProjectStructure): Map<string, ProjectFolder> {
  const folders = new Map<string, ProjectFolder>();

  const collectFolders = (folder: ProjectFolder, currentPath: string = '') => {
    const pathKey = currentPath || folder.name;
    if (pathKey) folders.set(pathKey, folder);
    for (const subfolder of folder.folders) {
      const subfolderPath = currentPath ? `${currentPath}/${subfolder.name}` : subfolder.name;
      collectFolders(subfolder, subfolderPath);
    }
  };

  for (const folder of structure.folders) {
    collectFolders(folder, folder.name);
  }

  return folders;
}

export function isFolderEmpty(folder: ProjectFolder): boolean {
  if (folder.files.length > 0) return false;
  if (folder.folders.length === 0) return true;
  for (const subfolder of folder.folders) {
    if (!isFolderEmpty(subfolder)) return false;
  }
  return true;
}

export function findEmptyFolders(
  structure: ProjectStructure,
  rootPath?: string
): Array<{ id: string; name: string }> {
  const emptyFolders: Array<{ id: string; name: string }> = [];

  const checkFolder = (folder: ProjectFolder): void => {
    for (const subfolder of folder.folders) {
      checkFolder(subfolder);
    }
    if (isFolderEmpty(folder) && folder.id) {
      emptyFolders.push({ id: folder.id, name: folder.name });
    }
  };

  if (rootPath) {
    const segments = rootPath.replace(/\\/g, '/').split('/').filter(Boolean);
    let folder: ProjectFolder | undefined = structure.folders.find((f) => f.name === segments[0]);
    for (let i = 1; i < segments.length && folder; i++) {
      folder = folder.folders.find((f) => f.name === segments[i]);
    }
    if (folder) checkFolder(folder);
  } else {
    for (const folder of structure.folders) {
      checkFolder(folder);
    }
  }

  return emptyFolders;
}
