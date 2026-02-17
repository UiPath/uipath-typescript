import path from 'path';
import chalk from 'chalk';
import { MESSAGES } from '../../constants/index.js';
import type {
  WebAppPushConfig,
  FileOperationPlan,
  ProjectStructure,
} from './types.js';
import type { LocalFileWithRemote } from './types.js';
import {
  getRemoteContentRoot,
  getRemoteFilesMap,
  getRemoteFoldersMap,
  filterToSourceFolderMap,
  getRemotePathForLocalPath,
  REMOTE_SOURCE_FOLDER_NAME,
  normalizeFolderPath,
} from './structure.js';
import { collectLocalFiles, collectSourceFiles, computeHash } from './local-files.js';
import { computeExecutionPlan, computeFirstPushPlan } from './push-plan.js';
import * as api from './api.js';
import {
  prepareMetadataFileForPlan,
  uploadPushMetadataToRemote,
  updateRemoteWebAppManifest,
} from './metadata.js';
import {
  buildFolderIdMap,
  ensureContentRootExists,
  ensureFoldersCreated,
  cleanupEmptyFolders,
  hasFolderByPath,
} from './folder-ops.js';
import {
  executeFileOperations,
  deleteFiles,
  deleteFolders,
} from './file-ops.js';
import { runImportReferencedResources } from './resource-import.js';

/** Builds combined list of local files with their remote path (build then source) and counts. */
function buildLocalFilesWithRemote(
  rootDir: string,
  bundlePath: string
): { localFilesWithRemote: LocalFileWithRemote[]; buildCount: number; sourceCount: number } {
  const remoteContentRoot = getRemoteContentRoot(bundlePath);
  const buildFiles = collectLocalFiles(rootDir, bundlePath);
  const sourceFiles = collectSourceFiles(rootDir, bundlePath);
  const localFilesWithRemote: LocalFileWithRemote[] = [];
  for (const f of buildFiles) {
    localFilesWithRemote.push({ localFile: f, remotePath: getRemotePathForLocalPath(f.path, bundlePath, remoteContentRoot) });
  }
  for (const f of sourceFiles) {
    localFilesWithRemote.push({ localFile: f, remotePath: getRemotePathForLocalPath(f.path, bundlePath, remoteContentRoot) });
  }
  return { localFilesWithRemote, buildCount: buildFiles.length, sourceCount: sourceFiles.length };
}

export type {
  WebAppPushConfig,
  LocalFile,
  ProjectFile,
  ProjectFolder,
  ProjectStructure,
  FileOperationPlan,
  FileOpsResult,
} from './types.js';
export { convertPlanToMigration } from './push-plan.js';
export type { StructuralMigration, AddedResource, ModifiedResource } from './types.js';

export class WebAppFileHandler {
  private config: WebAppPushConfig;
  private projectStructure: ProjectStructure | null = null;
  private lockKey: string | null = null;

  constructor(config: WebAppPushConfig) {
    this.config = config;
  }

  async push(): Promise<void> {
    this.config.logger.log(chalk.gray('[push] Acquiring lock...'));
    const lockInfo = await api.retrieveLock(this.config);
    const hasLock =
      lockInfo && (lockInfo.projectLockKey ?? lockInfo.solutionLockKey);
    if (!hasLock) {
      throw new Error(MESSAGES.ERRORS.PUSH_LOCK_NOT_ACQUIRED);
    }
    this.lockKey = lockInfo.projectLockKey ?? lockInfo.solutionLockKey ?? null;
    this.config.logger.log(chalk.gray('[push] Lock acquired.'));

    this.config.logger.log(chalk.gray('[push] Fetching remote structure...'));
    this.projectStructure = await api.fetchRemoteStructure(this.config);
    const { localFilesWithRemote, buildCount, sourceCount } = buildLocalFilesWithRemote(
      this.config.rootDir,
      this.config.bundlePath
    );
    this.config.logger.log(
      chalk.gray(`[push] Local files: ${buildCount} build + ${sourceCount} source = ${localFilesWithRemote.length}`)
    );

    const fullRemoteFiles = getRemoteFilesMap(this.projectStructure);
    const fullRemoteFolders = getRemoteFoldersMap(this.projectStructure);
    const remoteContentRoot = getRemoteContentRoot(this.config.bundlePath);
    const contentRootExists = hasFolderByPath(fullRemoteFolders, remoteContentRoot);

    let plan: FileOperationPlan;
    if (!contentRootExists) {
      this.config.logger.log(chalk.gray(`[push] First push: ensuring ${remoteContentRoot}...`));
      await ensureContentRootExists(
        this.config,
        this.lockKey,
        () => this.projectStructure!,
        (s) => {
          this.projectStructure = s;
        }
      );
      const remoteFolders = getRemoteFoldersMap(this.projectStructure!);
      plan = computeFirstPushPlan(localFilesWithRemote, remoteFolders);
      this.config.logger.log(
        chalk.gray(`[push] Plan: ${plan.uploadFiles.length} to upload, ${plan.createFolders.length} folders to create.`)
      );
    } else {
      this.config.logger.log(chalk.gray('[push] Computing diff (scoped to source/)...'));
      const remoteFiles = filterToSourceFolderMap(fullRemoteFiles, REMOTE_SOURCE_FOLDER_NAME);
      const remoteFolders = filterToSourceFolderMap(fullRemoteFolders, REMOTE_SOURCE_FOLDER_NAME);
      plan = await computeExecutionPlan(
        localFilesWithRemote,
        remoteFiles,
        remoteFolders,
        {
          bundlePath: this.config.bundlePath,
          remoteContentRoot,
          downloadRemoteFile: (fileId) => api.downloadRemoteFile(this.config, fileId),
          computeHash,
          logger: this.config.logger,
        }
      );
      this.config.logger.log(
        chalk.gray(
          `[push] Plan: ${plan.uploadFiles.length} add, ${plan.updateFiles.length} update, ${plan.deleteFiles.length} delete, ${plan.deleteFolders.length} folders to delete.`
        )
      );
    }

    this.config.logger.log(chalk.gray('[push] Preparing metadata...'));
    await prepareMetadataFileForPlan(
      this.config,
      fullRemoteFiles,
      (config, fileId) => api.downloadRemoteFile(config, fileId),
      plan
    );

    const folderIdMap = buildFolderIdMap(this.projectStructure!);
    if (plan.createFolders.length > 0) {
      this.config.logger.log(chalk.gray(`[push] Creating ${plan.createFolders.length} folder(s)...`));
    }
    await ensureFoldersCreated(
      this.config,
      plan,
      folderIdMap,
      (s) => {
        this.projectStructure = s;
      },
      this.lockKey
    );

    for (const fileOp of plan.uploadFiles) {
      if (fileOp.parentPath) {
        fileOp.parentId = folderIdMap.get(normalizeFolderPath(fileOp.parentPath)) ?? null;
      }
    }

    const hasFileOps =
      plan.uploadFiles.length > 0 ||
      plan.updateFiles.length > 0 ||
      plan.deleteFiles.length > 0;
    let totalFailed = 0;
    if (hasFileOps) {
      const total = plan.uploadFiles.length + plan.updateFiles.length;
      this.config.logger.log(chalk.gray(`[push] Executing ${total} file operation(s)...`));
      const fileOpsResult = await executeFileOperations(this.config, plan, this.lockKey);
      totalFailed += fileOpsResult.failedCount;
    }
    if (plan.deleteFiles.length > 0) {
      this.config.logger.log(chalk.gray(`[push] Deleting ${plan.deleteFiles.length} file(s)...`));
      const deleteFilesResult = await deleteFiles(this.config, plan.deleteFiles, this.lockKey);
      totalFailed += deleteFilesResult.failedCount;
    }
    if (plan.deleteFolders.length > 0) {
      this.config.logger.log(chalk.gray(`[push] Deleting ${plan.deleteFolders.length} folder(s)...`));
      const deleteFoldersResult = await deleteFolders(this.config, plan.deleteFolders, this.lockKey);
      totalFailed += deleteFoldersResult.failedCount;
    }
    if (totalFailed > 0) {
      throw new Error(`${MESSAGES.ERRORS.PUSH_FAILED_PREFIX}${totalFailed} operation(s) failed.`);
    }

    this.config.logger.log(chalk.gray('[push] Cleaning up empty folders...'));
    await cleanupEmptyFolders(
      this.config,
      REMOTE_SOURCE_FOLDER_NAME,
      () => api.fetchRemoteStructure(this.config),
      this.lockKey
    );

    this.config.logger.log(chalk.gray('[push] Uploading metadata to remote...'));
    const metadataPath = path.join(this.config.rootDir, this.config.manifestFile);
    try {
      await uploadPushMetadataToRemote(
        this.config,
        metadataPath,
        fullRemoteFiles,
        folderIdMap,
        this.lockKey
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.config.logger.log(chalk.yellow(MESSAGES.ERRORS.PUSH_METADATA_UPLOAD_FAILED_PREFIX + msg));
    }
    this.config.logger.log(chalk.gray('[push] Updating web app manifest...'));
    await updateRemoteWebAppManifest(
      this.config,
      this.config.bundlePath,
      fullRemoteFiles,
      this.lockKey
    );
    this.config.logger.log(chalk.gray('[push] Done.'));
  }

  public async importReferencedResources(ignoreResources = false): Promise<void> {
    if (ignoreResources) return;
    this.config.logger.log(chalk.gray('[resources] Importing referenced resources...'));
    const lockInfo = await api.retrieveLock(this.config);
    const lockKey = lockInfo?.projectLockKey ?? null;
    await runImportReferencedResources(this.config, lockKey);
    this.config.logger.log(chalk.gray('[resources] Done.'));
  }
}
