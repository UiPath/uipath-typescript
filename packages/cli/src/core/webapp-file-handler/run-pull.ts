/**
 * Pull command: main orchestration. Validates target and project type, filters files
 * (source/ only, excludes buildDir), checks overwrite, recreates folders, downloads files with progress.
 */
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import { MESSAGES } from '../../constants/index.js';
import { PUSH_METADATA_RELATIVE_PATH } from '../../constants/api.js';
import {
  PULL_DOWNLOAD_CONCURRENCY,
  PULL_OVERWRITE_LIST_MAX_DISPLAY,
} from '../../constants/pull.js';
import type { WebAppPushConfig, ProjectFile } from './types.js';
import { getRemoteFilesMap, getRemoteFoldersMap, PUSH_METADATA_REMOTE_PATH } from './structure.js';
import * as api from './api.js';
import { cliTelemetryClient } from '../../telemetry/index.js';
import {
  remotePathToLocal,
  isUnderSource,
  stripSourcePrefix,
  getLocalRelativePath,
  isPathUnderBuildDir,
  getPathsThatWouldOverwrite,
  ensureLocalFolders,
  getFolderPathsForFiles,
} from './pull-utils.js';
import { validateProjectType } from './pull-validation.js';
import { ProjectPullError } from './pull-errors.js';

export { ProjectPullError };

/** Max length of error message sent to telemetry (align with api.ts). */
const MAX_TELEMETRY_ERROR_LENGTH = 500;

/** Options for runPull. promptOverwrite is called when there are conflicting paths and overwrite is false (e.g. for interactive Y/N). */
export interface RunPullOptions {
  overwrite: boolean;
  /** When provided and overwrite is false, called with conflicting local paths; return true to proceed, false to abort. */
  promptOverwrite?: (conflictingLocalPaths: string[]) => Promise<boolean>;
}

/**
 * Runs the full pull: validates project type and overwrite, fetches structure, recreates folders, downloads files.
 * Reuses fetchRemoteStructure and downloadRemoteFile from api; getRemoteFilesMap/getRemoteFoldersMap from structure.
 *
 * Assumptions:
 * - Remote structure uses forward slashes in paths.
 * - push_metadata.json, when present, contains optional buildDir (string); invalid JSON or missing key is non-fatal (we pull all under source/).
 */
export async function runPull(
  config: WebAppPushConfig,
  options: RunPullOptions
): Promise<void> {
  const { rootDir, logger } = config;

  if (!fs.existsSync(rootDir)) {
    cliTelemetryClient.track('Cli.Pull.Failed', {
      reason: 'target_dir_invalid',
      error_message: MESSAGES.ERRORS.PULL_TARGET_DIR_NOT_FOUND,
    });
    throw new ProjectPullError(MESSAGES.ERRORS.PULL_TARGET_DIR_NOT_FOUND);
  }
  if (!fs.statSync(rootDir).isDirectory()) {
    cliTelemetryClient.track('Cli.Pull.Failed', {
      reason: 'target_dir_invalid',
      error_message: MESSAGES.ERRORS.PULL_TARGET_DIR_NOT_DIRECTORY,
    });
    throw new ProjectPullError(MESSAGES.ERRORS.PULL_TARGET_DIR_NOT_DIRECTORY);
  }

  logger.log(chalk.gray('[pull] Fetching remote structure...'));
  const structure = await api.fetchRemoteStructure(config);

  const hasFiles = structure.files.length > 0 || structure.folders.length > 0;
  if (!structure.name && !hasFiles) {
    cliTelemetryClient.track('Cli.Pull.Failed', {
      reason: 'project_not_found',
      error_message: MESSAGES.ERRORS.PULL_PROJECT_NOT_FOUND,
    });
    throw new ProjectPullError(MESSAGES.ERRORS.PULL_PROJECT_NOT_FOUND);
  }

  const fullFilesMap = getRemoteFilesMap(structure);
  const fullFoldersMap = getRemoteFoldersMap(structure);

  config.logger.log(chalk.gray('[pull] Validating project type (webAppManifest.json or .uiproj)...'));
  try {
    await validateProjectType(config, fullFilesMap);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    cliTelemetryClient.track('Cli.Pull.Failed', {
      reason: 'validation',
      error_message: msg.length > MAX_TELEMETRY_ERROR_LENGTH ? `${msg.slice(0, MAX_TELEMETRY_ERROR_LENGTH)}...` : msg,
    });
    throw err;
  }

  // Only pull files under source/; they will be written at target-dir root (source/ prefix stripped)
  let filesMap = new Map<string, ProjectFile>();
  for (const [remotePath, file] of fullFilesMap) {
    if (isUnderSource(remotePath)) filesMap.set(remotePath, file);
  }

  // Exclude source/<buildDir>/ so build output is not pulled (buildDir from remote push_metadata.json).
  // If metadata is missing or invalid, we assume no buildDir and pull everything under source/.
  let buildDirToExclude: string | null = null;
  const remoteMetadataEntry = fullFilesMap.get(PUSH_METADATA_REMOTE_PATH);
  if (remoteMetadataEntry) {
    try {
      const metadataContent = await api.downloadRemoteFile(config, remoteMetadataEntry.id);
      const metadata = JSON.parse(metadataContent.toString('utf8')) as { buildDir?: string };
      const buildDir = metadata?.buildDir?.trim();
      if (buildDir) {
        buildDirToExclude = buildDir;
        const filtered = new Map<string, ProjectFile>();
        for (const [remotePath, file] of filesMap) {
          const relativePath = stripSourcePrefix(remotePath);
          const underBuildDir = isPathUnderBuildDir(relativePath, buildDir);
          if (!underBuildDir) filtered.set(remotePath, file);
        }
        filesMap = filtered;
        logger.log(chalk.gray(`[pull] Skipping build output folder: ${buildDir}`));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.log(chalk.gray(`${MESSAGES.INFO.PULL_METADATA_READ_FALLBACK} (${msg}); pulling all files under source/`));
    }
  }

  if (filesMap.size === 0) {
    logger.log(chalk.yellow('[pull] No files under source/ in remote project. Nothing to pull.'));
    return;
  }

  if (!options.overwrite) {
    const overwrites = getPathsThatWouldOverwrite(filesMap, rootDir);
    if (overwrites.length > 0) {
      if (options.promptOverwrite) {
        const proceed = await options.promptOverwrite(overwrites);
        if (!proceed) {
          cliTelemetryClient.track('Cli.Pull.Failed', { reason: 'overwrite_aborted' });
          throw new ProjectPullError(MESSAGES.ERRORS.PULL_OVERWRITE_CONFLICTS);
        }
      } else {
        logger.log(chalk.yellow(MESSAGES.ERRORS.PULL_OVERWRITE_CONFLICTS));
        overwrites
          .slice(0, PULL_OVERWRITE_LIST_MAX_DISPLAY)
          .forEach((p) => logger.log(chalk.yellow(`  - ${p}`)));
        if (overwrites.length > PULL_OVERWRITE_LIST_MAX_DISPLAY) {
          logger.log(chalk.yellow(`  ... and ${overwrites.length - PULL_OVERWRITE_LIST_MAX_DISPLAY} more.`));
        }
        cliTelemetryClient.track('Cli.Pull.Failed', { reason: 'overwrite_conflicts' });
        throw new ProjectPullError(MESSAGES.ERRORS.PULL_OVERWRITE_CONFLICTS);
      }
    }
  }

  const folderPathsFromFiles = getFolderPathsForFiles(filesMap);
  const folderPathsFromFolders = new Set<string>();
  for (const p of fullFoldersMap.keys()) {
    if (!isUnderSource(p)) continue;
    const stripped = stripSourcePrefix(p);
    if (!isPathUnderBuildDir(stripped, buildDirToExclude)) folderPathsFromFolders.add(stripped);
  }
  const folderPathsFromFilesStripped = new Set<string>();
  for (const p of folderPathsFromFiles) {
    if (isUnderSource(p)) folderPathsFromFilesStripped.add(stripSourcePrefix(p));
  }
  const allFolderPaths = new Set<string>([...folderPathsFromFolders, ...folderPathsFromFilesStripped]);
  allFolderPaths.delete('');
  if (buildDirToExclude) {
    const toRemove = [...allFolderPaths].filter((fp) => isPathUnderBuildDir(fp, buildDirToExclude));
    toRemove.forEach((fp) => allFolderPaths.delete(fp));
  }
  const hasPushMetadata = [...filesMap.keys()].some(
    (p) => getLocalRelativePath(stripSourcePrefix(p)) === PUSH_METADATA_RELATIVE_PATH
  );
  if (hasPushMetadata) allFolderPaths.add(path.dirname(PUSH_METADATA_RELATIVE_PATH));

  logger.log(chalk.gray(`[pull] Recreating ${allFolderPaths.size} folder(s) under target-dir...`));
  ensureLocalFolders(rootDir, allFolderPaths);

  const failedPaths: Array<{ path: string; error: string }> = [];
  const entries = [...filesMap.entries()];
  const total = entries.length;
  let completedCount = 0;
  const progressPrefix = MESSAGES.INFO.PULL_PROGRESS;

  const processOne = async ([remotePath, file]: [string, ProjectFile]): Promise<void> => {
    const relativePath = getLocalRelativePath(stripSourcePrefix(remotePath));
    const localPath = remotePathToLocal(rootDir, relativePath);
    try {
      const content = await api.downloadRemoteFile(config, file.id);
      const dir = path.dirname(localPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(localPath, content);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      failedPaths.push({ path: remotePath, error: msg });
      logger.log(chalk.red(`${MESSAGES.ERRORS.PULL_FILE_DOWNLOAD_FAILED_PREFIX}${remotePath} — ${msg}`));
    } finally {
      completedCount += 1;
      if (total > 0) {
        process.stdout.write(`\r${chalk.gray(`[pull] ${progressPrefix} ${completedCount}/${total} completed`)}    `);
      }
    }
  };

  if (total > 0) {
    process.stdout.write(chalk.gray(`[pull] ${progressPrefix} 0/${total} completed`));
  }
  const running = new Set<Promise<void>>();
  for (const entry of entries) {
    const promise = processOne(entry);
    running.add(promise);
    promise.finally(() => {
      running.delete(promise);
    });
    while (running.size >= PULL_DOWNLOAD_CONCURRENCY) {
      await Promise.race(running);
    }
  }
  await Promise.all(running);
  if (total > 0) {
    process.stdout.write('\n');
  }

  if (failedPaths.length > 0) {
    const msg = `${MESSAGES.ERRORS.PULL_FAILED_PREFIX}${failedPaths.length} file(s) failed to download.`;
    cliTelemetryClient.track('Cli.Pull.Failed', {
      reason: 'download_failed',
      error_message: msg.length > MAX_TELEMETRY_ERROR_LENGTH ? `${msg.slice(0, MAX_TELEMETRY_ERROR_LENGTH)}...` : msg,
      failed_count: failedPaths.length,
    });
    throw new ProjectPullError(msg, failedPaths);
  }

  cliTelemetryClient.track('Cli.Pull.Completed', { file_count: entries.length });
  logger.log(chalk.gray(`[pull] Done. ${entries.length} file(s) synced.`));
}
