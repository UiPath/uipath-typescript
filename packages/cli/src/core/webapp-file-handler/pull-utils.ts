/**
 * Pull command: path and folder helpers. Shared logic for mapping remote paths to local
 * and building the folder set. No I/O except fs for overwrite check and mkdir.
 */
import * as fs from 'fs';
import * as path from 'path';
import { PUSH_METADATA_RELATIVE_PATH, PUSH_METADATA_FILENAME } from '../../constants/api.js';
import { REMOTE_SOURCE_FOLDER_NAME, normalizePathToForwardSlashes } from './structure.js';
import type { ProjectFile } from './types.js';

/** Remote path prefix for content we pull (e.g. "source/"). Only paths under this are pulled. */
const SOURCE_PREFIX = `${REMOTE_SOURCE_FOLDER_NAME}/`;

/**
 * Converts a relative path (forward slashes) to a local absolute path under rootDir.
 * Assumes relativePath uses forward slashes; normalizes for current OS.
 */
export function remotePathToLocal(rootDir: string, relativePath: string): string {
  if (!relativePath) return rootDir;
  const segments = normalizePathToForwardSlashes(relativePath).split('/').filter(Boolean);
  return path.join(rootDir, ...segments);
}

/** Returns true if the remote path is under the source/ folder (only these are pulled). */
export function isUnderSource(remotePath: string): boolean {
  const normalized = normalizePathToForwardSlashes(remotePath);
  return normalized === REMOTE_SOURCE_FOLDER_NAME || normalized.startsWith(SOURCE_PREFIX);
}

/**
 * Strips the "source/" prefix so paths are relative to target-dir root.
 * e.g. "source/dist/index.html" -> "dist/index.html", "source/package.json" -> "package.json"
 */
export function stripSourcePrefix(remotePath: string): string {
  const normalized = normalizePathToForwardSlashes(remotePath);
  if (normalized === REMOTE_SOURCE_FOLDER_NAME) return '';
  if (normalized.startsWith(SOURCE_PREFIX)) return normalized.slice(SOURCE_PREFIX.length);
  return normalized;
}

/**
 * Maps relative path under target-dir. push_metadata.json is placed in .uipath/ to match push behavior.
 */
export function getLocalRelativePath(relativePath: string): string {
  if (relativePath === PUSH_METADATA_FILENAME) return PUSH_METADATA_RELATIVE_PATH;
  return relativePath;
}

/**
 * Returns true if relativePath is exactly buildDir or under buildDir/.
 * Used to exclude build output from pull (no files and no folder skeleton).
 */
export function isPathUnderBuildDir(relativePath: string, buildDir: string | null): boolean {
  if (!buildDir) return false;
  return relativePath === buildDir || relativePath.startsWith(`${buildDir}/`);
}

/**
 * Returns local absolute paths that would be overwritten by pull (existing files that match remote paths).
 * Uses getLocalRelativePath so push_metadata.json is checked at .uipath/push_metadata.json.
 */
export function getPathsThatWouldOverwrite(
  filesMap: Map<string, ProjectFile>,
  rootDir: string
): string[] {
  const overwrites: string[] = [];
  for (const remotePath of filesMap.keys()) {
    const relativePath = getLocalRelativePath(stripSourcePrefix(remotePath));
    const localPath = remotePathToLocal(rootDir, relativePath);
    if (fs.existsSync(localPath) && fs.statSync(localPath).isFile()) {
      overwrites.push(localPath);
    }
  }
  return overwrites;
}

/** Ensures all directory paths exist locally under rootDir (recreates remote folder hierarchy). */
export function ensureLocalFolders(rootDir: string, folderPaths: Iterable<string>): void {
  for (const folderPath of folderPaths) {
    const localDir = remotePathToLocal(rootDir, folderPath);
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
  }
}

/**
 * Collects parent directory paths for all files in the map (keys are remote paths with forward slashes).
 * Used to build the set of folders to create before writing files.
 */
export function getFolderPathsForFiles(filesMap: Map<string, ProjectFile>): Set<string> {
  const dirs = new Set<string>();
  for (const filePath of filesMap.keys()) {
    const normalized = normalizePathToForwardSlashes(filePath);
    const idx = normalized.lastIndexOf('/');
    if (idx > 0) {
      dirs.add(normalized.slice(0, idx));
    }
  }
  return dirs;
}
