import chalk from 'chalk';
import { MESSAGES } from '../../constants/index.js';
import type {
  WebAppPushConfig,
  FileOperationPlan,
  ProjectStructure,
} from './types.js';
import {
  getRemoteContentRoot,
  getRemoteFilesMap,
  getRemoteFoldersMap,
  filterToSourceFolderMap,
} from './structure.js';
import { collectLocalFiles, computeHash } from './local-files.js';
import { computeExecutionPlan, computeFirstPushPlan } from './push-plan.js';
import * as api from './api.js';
import { prepareMetadataFileForPlan } from './metadata.js';
import {
  buildFolderIdMap,
  ensureContentRootExists,
  ensureFoldersCreated,
  moveNestedFoldersIntoParents,
  cleanupEmptyFolders,
} from './folder-ops.js';
import {
  executeFileOperations,
  deleteFiles,
  deleteFolders,
} from './file-ops.js';
import { runImportReferencedResources } from './resource-import.js';

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
    const localFiles = collectLocalFiles(this.config.rootDir, this.config.bundlePath);
    this.config.logger.log(chalk.gray(`[push] Local files: ${localFiles.length}`));

    const fullRemoteFiles = getRemoteFilesMap(this.projectStructure);
    const fullRemoteFolders = getRemoteFoldersMap(this.projectStructure);

    const remoteContentRoot = getRemoteContentRoot(this.config.bundlePath);
    const contentRootExists = fullRemoteFolders.has(remoteContentRoot);

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
      plan = computeFirstPushPlan(localFiles, remoteFolders, {
        remoteContentRoot,
        bundlePath: this.config.bundlePath,
      });
      this.config.logger.log(
        chalk.gray(`[push] Plan: ${plan.uploadFiles.length} to upload, ${plan.createFolders.length} folders to create.`)
      );
    } else {
      this.config.logger.log(chalk.gray(`[push] Computing diff (scoped to ${remoteContentRoot})...`));
      const remoteFiles = filterToSourceFolderMap(fullRemoteFiles, remoteContentRoot);
      const remoteFolders = filterToSourceFolderMap(fullRemoteFolders, remoteContentRoot);
      plan = await computeExecutionPlan(
        localFiles,
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
      (config, fileId) => api.downloadRemoteFile(config, fileId)
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
    await moveNestedFoldersIntoParents(
      this.config,
      plan.createFolders,
      folderIdMap,
      this.lockKey
    );

    for (const fileOp of plan.uploadFiles) {
      if (fileOp.parentPath) {
        fileOp.parentId = folderIdMap.get(fileOp.parentPath) ?? null;
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
      remoteContentRoot,
      () => api.fetchRemoteStructure(this.config),
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
