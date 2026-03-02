import chalk from 'chalk';
import { MESSAGES } from '../../constants/index.js';
import type { WebAppProjectConfig, FileOperationPlan, FileOpsResult } from './types.js';
import * as api from './api.js';

const { FileAlreadyExistsError } = api;

function createFileOpsResult(): FileOpsResult {
  return { succeededCount: 0, failedCount: 0, failedPaths: [] };
}

/**
 * Runs all create/update file operations in parallel. Returns succeeded/failed counts and failed paths.
 * Caller should check result.failedCount and throw (or handle) when operations did not all succeed.
 */
export async function executeFileOperations(
  config: WebAppProjectConfig,
  plan: FileOperationPlan,
  lockKey: string | null
): Promise<FileOpsResult> {
  const allOperations: Array<{ execute: () => Promise<void>; path: string }> = [];

  for (const fileOp of plan.uploadFiles) {
    allOperations.push({
      execute: () =>
        api.createFile(
          config,
          fileOp.path,
          fileOp.localFile,
          fileOp.parentId ?? null,
          fileOp.parentPath,
          lockKey
        ),
      path: fileOp.path,
    });
  }
  for (const fileOp of plan.updateFiles) {
    allOperations.push({
      execute: () =>
        api.updateFile(config, fileOp.path, fileOp.localFile, fileOp.fileId, lockKey),
      path: fileOp.path,
    });
  }

  const result = createFileOpsResult();
  if (allOperations.length === 0) return result;

  const total = allOperations.length;
  const settled = await Promise.allSettled(allOperations.map((op) => op.execute()));

  for (let j = 0; j < settled.length; j++) {
    const s = settled[j];
    const operation = allOperations[j];
    if (s.status === 'fulfilled') {
      result.succeededCount += 1;
    } else {
      const reason = s.reason;
      if (reason instanceof FileAlreadyExistsError) {
        result.succeededCount += 1;
        config.logger.log(chalk.yellow(`${MESSAGES.ERRORS.PUSH_FILE_ALREADY_EXISTS_SKIP}${operation.path}`));
      } else {
        result.failedCount += 1;
        const errorMsg = reason instanceof Error ? reason.message : String(reason);
        result.failedPaths.push({ path: operation.path, error: errorMsg });
        config.logger.log(chalk.red(`${MESSAGES.ERRORS.PUSH_FILE_OPERATION_FAILED_PREFIX}${operation.path} — ${errorMsg}`));
      }
    }
  }
  config.logger.log(chalk.gray(`[push] Processed ${result.succeededCount + result.failedCount}/${total} file operation(s).`));
  return result;
}

/** Runs all file deletes in parallel. */
export async function deleteFiles(
  config: WebAppProjectConfig,
  files: Array<{ fileId: string; path: string }>,
  lockKey: string | null
): Promise<FileOpsResult> {
  const result = createFileOpsResult();
  if (files.length === 0) return result;
  const total = files.length;
  const settled = await Promise.allSettled(
    files.map((file) => api.deleteItem(config, file.fileId, lockKey))
  );
  for (let j = 0; j < settled.length; j++) {
    const s = settled[j];
    const file = files[j];
    if (s.status === 'fulfilled') {
      result.succeededCount += 1;
    } else {
      const msg = s.reason instanceof Error ? s.reason.message : String(s.reason);
      result.failedCount += 1;
      result.failedPaths.push({ path: file.path, error: msg });
      config.logger.log(chalk.yellow(`${MESSAGES.ERRORS.PUSH_DELETE_FILE_PREFIX}${file.path}: ${msg}`));
    }
  }
  config.logger.log(chalk.gray(`[push] Deleted ${result.succeededCount + result.failedCount}/${total} file(s).`));
  return result;
}

/** Deletes folders sequentially to preserve depth order (children before parents). */
export async function deleteFolders(
  config: WebAppProjectConfig,
  folders: Array<{ folderId: string; path: string }>,
  lockKey: string | null
): Promise<FileOpsResult> {
  const result = createFileOpsResult();
  const total = folders.length;
  for (const folder of folders) {
    try {
      await api.deleteItem(config, folder.folderId, lockKey);
      result.succeededCount += 1;
    } catch (error) {
      const msg = error instanceof Error ? error.message : MESSAGES.ERRORS.UNKNOWN_ERROR;
      result.failedCount += 1;
      result.failedPaths.push({ path: folder.path, error: msg });
      config.logger.log(chalk.yellow(`${MESSAGES.ERRORS.PUSH_DELETE_FOLDER_PREFIX}${folder.path}: ${msg}`));
    }
    const processed = result.succeededCount + result.failedCount;
    config.logger.log(chalk.gray(`[push] Deleted ${processed}/${total} folder(s).`));
  }
  return result;
}
