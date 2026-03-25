import * as path from 'node:path';
import chalk from 'chalk';
import inquirer from 'inquirer';
import {
  ALLOWED_PUSH_EXTENSIONS,
  PUSH_FILE_SIZE_WARN_BYTES,
  PUSH_FILE_SIZE_BLOCK_BYTES,
} from '../constants/push-validation.js';
import { MESSAGES } from '../constants/messages.js';
import { collectLocalFiles, collectSourceFiles } from '../core/webapp-file-handler/local-files.js';

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

/**
 * Validates all files that would be pushed (build + source).
 *
 * Checks:
 * 1. Disallowed extensions → hard block
 * 2. Files > 10 MB → hard block
 * 3. Files > 2 MB → soft warning (prompt in TTY, block in non-TTY)
 */
export async function validatePushFiles(
  rootDir: string,
  bundlePath: string,
  logger: { log: (message: string) => void },
): Promise<void> {
  const buildFiles = collectLocalFiles(rootDir, bundlePath);
  const sourceFiles = collectSourceFiles(rootDir, bundlePath);
  const allFiles = [...buildFiles, ...sourceFiles];

  if (allFiles.length === 0) return;

  // 1. Extension check
  const disallowed = allFiles.filter((f) => {
    const ext = path.extname(f.path).toLowerCase();
    // Files without extension (e.g. LICENSE, Makefile) are allowed
    if (!ext) return false;
    return !ALLOWED_PUSH_EXTENSIONS.has(ext);
  });

  if (disallowed.length > 0) {
    logger.log(chalk.red('\nFiles with disallowed extensions:'));
    for (const f of disallowed) {
      logger.log(chalk.red(`  • ${f.path}`));
    }
    logger.log('');
    throw new Error(MESSAGES.ERRORS.PUSH_DISALLOWED_EXTENSIONS);
  }

  // 2. Hard block: files > 10 MB
  const oversized = allFiles.filter((f) => f.content.length >= PUSH_FILE_SIZE_BLOCK_BYTES);

  if (oversized.length > 0) {
    logger.log(chalk.red('\nFiles exceeding 10 MB size limit:'));
    for (const f of oversized) {
      logger.log(chalk.red(`  • ${f.path} (${formatSize(f.content.length)})`));
    }
    logger.log('');
    throw new Error(MESSAGES.ERRORS.PUSH_FILE_TOO_LARGE);
  }

  // 3. Soft warning: files > 2 MB
  const large = allFiles.filter(
    (f) => f.content.length >= PUSH_FILE_SIZE_WARN_BYTES && f.content.length < PUSH_FILE_SIZE_BLOCK_BYTES,
  );

  if (large.length > 0) {
    logger.log(chalk.yellow('\nLarge files detected (> 2 MB):'));
    for (const f of large) {
      logger.log(chalk.yellow(`  • ${f.path} (${formatSize(f.content.length)})`));
    }
    logger.log(chalk.yellow('Consider uploading large assets to cloud storage instead.\n'));

    if (!process.stdin.isTTY) {
      throw new Error(MESSAGES.ERRORS.PUSH_LARGE_FILES_DECLINED);
    }

    const { proceed } = await inquirer.prompt<{ proceed: boolean }>([{
      type: 'confirm',
      name: 'proceed',
      message: 'Some files exceed 2 MB. Continue with push?',
      default: false,
    }]);

    if (!proceed) {
      throw new Error(MESSAGES.ERRORS.PUSH_LARGE_FILES_DECLINED);
    }
  }
}
