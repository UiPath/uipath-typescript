import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import { STUDIO_METADATA_FILENAME, STUDIO_METADATA_RELATIVE_PATH } from '../../constants/api.js';
import { MESSAGES } from '../../constants/index.js';
import type { WebAppPushConfig, ProjectFile } from './types.js';

export function getCurrentUser(): string {
  return process.env.USER || process.env.USERNAME || process.env.UIPATH_USER || 'unknown';
}

export async function prepareMetadataFileForPlan(
  config: WebAppPushConfig,
  remoteFiles: Map<string, ProjectFile>,
  downloadRemoteFile: (config: WebAppPushConfig, fileId: string) => Promise<Buffer>
): Promise<void> {
  const metadataPath = path.join(config.rootDir, config.manifestFile);
  const metadataDir = path.dirname(metadataPath);

  fs.mkdirSync(metadataDir, { recursive: true });

  let metadata: Record<string, unknown>;
  try {
    const content = fs.readFileSync(metadataPath, 'utf-8');
    metadata = JSON.parse(content) as Record<string, unknown>;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      metadata = {
        schemaVersion: '1.0.0',
        name: config.projectId,
        description: '',
        lastPushDate: new Date().toISOString(),
        lastPushAuthor: getCurrentUser(),
      };
    } else {
      throw error;
    }
  }

  metadata.lastPushDate = new Date().toISOString();
  metadata.lastPushAuthor = getCurrentUser();

  const remoteMetadata =
    remoteFiles.get(STUDIO_METADATA_RELATIVE_PATH) || remoteFiles.get(STUDIO_METADATA_FILENAME);
  if (remoteMetadata) {
    try {
      const remoteContent = await downloadRemoteFile(config, remoteMetadata.id);
      const remoteMetadataObj = JSON.parse(remoteContent.toString('utf-8')) as {
        codeVersion?: string;
      };
      if (remoteMetadataObj.codeVersion) {
        const versionParts = remoteMetadataObj.codeVersion.split('.');
        if (versionParts.length >= 3) {
          versionParts[2] = String(parseInt(versionParts[2], 10) + 1);
          metadata.codeVersion = versionParts.join('.');
        } else {
          metadata.codeVersion = '0.1.1';
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      config.logger.log(
        chalk.gray(
          MESSAGES.ERRORS.PUSH_REMOTE_METADATA_READ_FAILED_PREFIX + msg + MESSAGES.ERRORS.PUSH_METADATA_DEFAULT_VERSION_SUFFIX
        )
      );
      metadata.codeVersion = '0.1.1';
    }
  }

  const metadataContent = JSON.stringify(metadata, null, 2);
  const tempPath = `${metadataPath}.${process.pid}.${Date.now()}.tmp`;
  try {
    fs.writeFileSync(tempPath, metadataContent, { mode: 0o600 });
    fs.renameSync(tempPath, metadataPath);
  } catch (error) {
    try {
      fs.unlinkSync(tempPath);
    } catch (unlinkErr) {
      const msg = unlinkErr instanceof Error ? unlinkErr.message : String(unlinkErr);
      config.logger.log(
        chalk.gray(MESSAGES.ERRORS.PUSH_TEMP_METADATA_REMOVE_FAILED_PREFIX + msg)
      );
    }
    throw error;
  }
}
