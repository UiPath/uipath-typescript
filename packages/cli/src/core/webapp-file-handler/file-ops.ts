import chalk from 'chalk';
import { MESSAGES } from '../../constants/index.js';
import type { WebAppPushConfig, FileOperationPlan } from './types.js';
import * as api from './api.js';

/** Max concurrent file upload/update requests per batch. Keeps push fast without overloading the server or hitting rate limits. */
const WORKER_POOL_SIZE = 8;

export async function executeFileOperations(
  config: WebAppPushConfig,
  plan: FileOperationPlan,
  lockKey: string | null
): Promise<void> {
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

  if (allOperations.length === 0) return;

  for (let i = 0; i < allOperations.length; i += WORKER_POOL_SIZE) {
    const batch = allOperations.slice(i, i + WORKER_POOL_SIZE);
    const results = await Promise.allSettled(batch.map((op) => op.execute()));
    for (let j = 0; j < results.length; j++) {
      const result = results[j];
      if (result.status === 'rejected') {
        const operation = batch[j];
        config.logger.log(chalk.red(`${MESSAGES.ERRORS.PUSH_FILE_OPERATION_FAILED_PREFIX}${operation.path} — ${result.reason}`));
      }
    }
  }
}

export async function deleteFiles(
  config: WebAppPushConfig,
  files: Array<{ fileId: string; path: string }>,
  lockKey: string | null
): Promise<void> {
  for (const file of files) {
    try {
      await api.deleteItem(config, file.fileId, lockKey);
    } catch (error) {
      const msg = error instanceof Error ? error.message : MESSAGES.ERRORS.UNKNOWN_ERROR;
      config.logger.log(chalk.yellow(`${MESSAGES.ERRORS.PUSH_DELETE_FILE_PREFIX}${file.path}: ${msg}`));
    }
  }
}

export async function deleteFolders(
  config: WebAppPushConfig,
  folders: Array<{ folderId: string; path: string }>,
  lockKey: string | null
): Promise<void> {
  for (const folder of folders) {
    try {
      await api.deleteItem(config, folder.folderId, lockKey);
    } catch (error) {
      const msg = error instanceof Error ? error.message : MESSAGES.ERRORS.UNKNOWN_ERROR;
      config.logger.log(chalk.yellow(`${MESSAGES.ERRORS.PUSH_DELETE_FOLDER_PREFIX}${folder.path}: ${msg}`));
    }
  }
}
