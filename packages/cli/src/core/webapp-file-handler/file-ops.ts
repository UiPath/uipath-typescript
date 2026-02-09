import chalk from 'chalk';
import { MESSAGES } from '../../constants/index.js';
import type { WebAppPushConfig, FileOperationPlan, FileOpsResult } from './types.js';
import * as api from './api.js';

/** Max concurrent file upload/update requests per batch. Keeps push fast without overloading the server or hitting rate limits. */
const WORKER_POOL_SIZE = 8;

function createFileOpsResult(): FileOpsResult {
  return { succeededCount: 0, failedCount: 0, failedPaths: [] };
}

/**
 * Runs create/update file operations in batches. Returns succeeded/failed counts and failed paths.
 * Caller should check result.failedCount and throw (or handle) when operations did not all succeed.
 */
export async function executeFileOperations(
  config: WebAppPushConfig,
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
  for (let i = 0; i < allOperations.length; i += WORKER_POOL_SIZE) {
    const batch = allOperations.slice(i, i + WORKER_POOL_SIZE);
    const settled = await Promise.allSettled(batch.map((op) => op.execute()));
    for (let j = 0; j < settled.length; j++) {
      const s = settled[j];
      const operation = batch[j];
      if (s.status === 'fulfilled') {
        result.succeededCount += 1;
      } else {
        result.failedCount += 1;
        const errorMsg = s.reason instanceof Error ? s.reason.message : String(s.reason);
        result.failedPaths.push({ path: operation.path, error: errorMsg });
        config.logger.log(chalk.red(`${MESSAGES.ERRORS.PUSH_FILE_OPERATION_FAILED_PREFIX}${operation.path} — ${errorMsg}`));
      }
    }
    const processed = result.succeededCount + result.failedCount;
    config.logger.log(chalk.gray(`[push] Processed ${processed}/${total} file operation(s).`));
  }
  return result;
}

/** Runs file deletes in batches (same concurrency as uploads/updates). */
export async function deleteFiles(
  config: WebAppPushConfig,
  files: Array<{ fileId: string; path: string }>,
  lockKey: string | null
): Promise<FileOpsResult> {
  const result = createFileOpsResult();
  if (files.length === 0) return result;
  const total = files.length;
  for (let i = 0; i < files.length; i += WORKER_POOL_SIZE) {
    const batch = files.slice(i, i + WORKER_POOL_SIZE);
    const settled = await Promise.allSettled(
      batch.map((file) => api.deleteItem(config, file.fileId, lockKey))
    );
    for (let j = 0; j < settled.length; j++) {
      const s = settled[j];
      const file = batch[j];
      if (s.status === 'fulfilled') {
        result.succeededCount += 1;
      } else {
        const msg = s.reason instanceof Error ? s.reason.message : String(s.reason);
        result.failedCount += 1;
        result.failedPaths.push({ path: file.path, error: msg });
        config.logger.log(chalk.yellow(`${MESSAGES.ERRORS.PUSH_DELETE_FILE_PREFIX}${file.path}: ${msg}`));
      }
    }
    const processed = result.succeededCount + result.failedCount;
    config.logger.log(chalk.gray(`[push] Deleted ${processed}/${total} file(s).`));
  }
  return result;
}

/** Deletes folders sequentially to preserve depth order (children before parents). */
export async function deleteFolders(
  config: WebAppPushConfig,
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
