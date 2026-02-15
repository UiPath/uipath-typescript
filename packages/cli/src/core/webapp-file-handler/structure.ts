import type { ProjectFile, ProjectFolder, ProjectStructure } from './types.js';

/** Remote root folder name for pushed content (build + source). All pushed files live under this. */
export const REMOTE_SOURCE_FOLDER_NAME = 'source';

/** Normalize folder path for map lookups. Backend may return different casing (e.g. Source); this avoids false mismatches. */
export function normalizeFolderPath(p: string): string {
  return p.replace(/\\/g, '/').toLowerCase();
}

/** Remote path for push metadata file (under source, not under build dir). */
export const PUSH_METADATA_REMOTE_PATH = `${REMOTE_SOURCE_FOLDER_NAME}/push_metadata.json`;

/** Remote project-root manifest filename (at root, not under source). Updated on push with config.bundlePath. */
export const WEB_APP_MANIFEST_FILENAME = 'webAppManifest.json';

/** Normalize bundle path (strip leading/trailing slashes, use forward slashes). */
function normalizeBundlePath(bundlePath: string): string {
  return bundlePath.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '') || bundlePath;
}

/** Remote root for pushed content: source/<buildDir> (e.g. source/dist). All build dir files go under this path. */
export function getRemoteContentRoot(bundlePath: string): string {
  const name = normalizeBundlePath(bundlePath);
  return name ? `${REMOTE_SOURCE_FOLDER_NAME}/${name}` : REMOTE_SOURCE_FOLDER_NAME;
}

/**
 * Remote path for a file under the build dir (e.g. local "dist/index.html" -> "source/dist/index.html").
 */
export function localPathToRemotePath(
  localPath: string,
  bundlePath: string,
  remoteContentRoot: string
): string {
  const normalized = localPath.replace(/\\/g, '/');
  const prefix = bundlePath.replace(/\\/g, '/').replace(/\/+$/, '') + '/';
  if (normalized.startsWith(prefix)) {
    return remoteContentRoot + '/' + normalized.slice(prefix.length);
  }
  if (normalized === bundlePath.replace(/\\/g, '/').replace(/\/+$/, '')) {
    return remoteContentRoot;
  }
  return remoteContentRoot + '/' + normalized;
}

/**
 * Remote path for a source file at project root (e.g. "package.json" -> "source/package.json").
 */
export function sourceLocalPathToRemotePath(localPath: string): string {
  const normalized = localPath.replace(/\\/g, '/');
  return normalized ? `${REMOTE_SOURCE_FOLDER_NAME}/${normalized}` : REMOTE_SOURCE_FOLDER_NAME;
}

/**
 * Given a local path (relative to project root), returns the remote path.
 * - If under bundlePath: source/<buildDir>/...
 * - Otherwise: source/...
 */
export function getRemotePathForLocalPath(
  localPath: string,
  bundlePath: string,
  remoteContentRoot: string
): string {
  const normalized = localPath.replace(/\\/g, '/');
  const buildDirNorm = bundlePath.replace(/\\/g, '/').replace(/\/+$/, '');
  const prefix = buildDirNorm ? buildDirNorm + '/' : '';
  if (buildDirNorm && (normalized === buildDirNorm || normalized.startsWith(prefix))) {
    return localPathToRemotePath(localPath, bundlePath, remoteContentRoot);
  }
  return sourceLocalPathToRemotePath(localPath);
}

/** Keeps only entries whose key equals remoteContentRoot or starts with remoteContentRoot + '/'. */
export function filterToSourceFolderMap<T>(
  map: Map<string, T>,
  remoteContentRoot: string
): Map<string, T> {
  const prefix = remoteContentRoot + '/';
  const filtered = new Map<string, T>();
  for (const [pathKey, value] of map.entries()) {
    if (pathKey === remoteContentRoot || pathKey.startsWith(prefix)) {
      filtered.set(pathKey, value);
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
