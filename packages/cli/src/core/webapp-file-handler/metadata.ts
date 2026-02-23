import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import { MESSAGES } from '../../constants/index.js';
import { cliTelemetryClient } from '../../telemetry/index.js';
import { parseJWT } from '../../auth/core/oidc.js';
import {
  PUSH_METADATA_REMOTE_PATH,
  REMOTE_SOURCE_FOLDER_NAME,
  WEB_APP_MANIFEST_FILENAME,
  normalizeBundlePath,
} from './structure.js';
import type { WebAppPushConfig, ProjectFile, FileOperationPlan, PushMetadata } from './types.js';
import type { LocalFile } from './types.js';
import * as api from './api.js';
import { computeHash } from './local-files.js';

/** Default schemaVersion for first-time push (no existing local or remote metadata). */
const DEFAULT_SCHEMA_VERSION = '1.0.0';

/** Max length of error message sent to telemetry to avoid oversized payloads. */
const MAX_TELEMETRY_ERROR_LENGTH = 500;

/**
 * Get push author email from access token (JWT email claim). Returns '' if missing or decode fails.
 * Uses parseJWT from auth/core/oidc for token parsing.
 */
export function getPushAuthorEmail(
  accessToken?: string,
  logger?: { log: (message: string) => void }
): string {
  if (!accessToken) return '';
  try {
    const claims = parseJWT(accessToken);
    return claims.email ?? '';
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (logger) logger.log(chalk.gray(MESSAGES.ERRORS.PUSH_EMAIL_FROM_TOKEN_FAILED_PREFIX + msg));
    return '';
  }
}

/**
 * Parses schemaVersion string (e.g. "major.minor.patch" or "major.minor") into numeric parts.
 * Invalid or missing values default to 1.0.0 (major=1, minor=0, patch=0).
 */
function parseSchemaVersion(version: unknown): { major: number; minor: number; patch: number } {
  const str = typeof version === 'string' ? version : DEFAULT_SCHEMA_VERSION;
  const parts = str.trim().split('.').map((s) => parseInt(s, 10));
  return {
    major: Number.isFinite(parts[0]) ? parts[0] : 1,
    minor: Number.isFinite(parts[1]) ? parts[1] : 0,
    patch: Number.isFinite(parts[2]) ? parts[2] : 0,
  };
}

/**
 * Computes the next schemaVersion from the current version and the push plan.
 * Uses the same counts as the handler's plan log: add (uploadFiles), update (updateFiles), delete (deleteFiles), folders to delete (deleteFolders).
 * - Major bump (e.g. 1.0.0 → 2.0.0): only when something is removed — deleteFiles or deleteFolders.
 * - Minor bump (e.g. 1.0.0 → 1.1.0): when there are add or update (uploadFiles or updateFiles), and no removals.
 * - Unchanged: no add/update and no delete.
 */
function computeNextSchemaVersion(
  currentVersion: unknown,
  plan: FileOperationPlan
): string {
  const hasRemovals =
    plan.deleteFiles.length > 0 || plan.deleteFolders.length > 0;
  const hasAddOrUpdate =
    plan.uploadFiles.length > 0 || plan.updateFiles.length > 0;

  const { major, minor } = parseSchemaVersion(currentVersion);

  if (hasRemovals) {
    return `${major + 1}.0.0`;
  }
  if (hasAddOrUpdate) {
    return `${major}.${minor + 1}.0`;
  }
  return typeof currentVersion === 'string' ? currentVersion : DEFAULT_SCHEMA_VERSION;
}

/** Builds a new metadata payload for first-time push (schemaVersion 1.0.0). */
function createNewMetadataPayload(config: WebAppPushConfig): PushMetadata {
  return {
    schemaVersion: DEFAULT_SCHEMA_VERSION,
    projectId: config.projectId,
    description: '',
    lastPushDate: new Date().toISOString(),
    lastPushAuthor: getPushAuthorEmail(config.envConfig.accessToken, config.logger),
    buildDir: config.bundlePath,
  };
}

/**
 * Prepares the local push_metadata.json for the current push.
 * Source of truth: if local file is missing, we use remote push_metadata.json when present;
 * only when both are missing do we create new metadata with schemaVersion 1.0.0.
 * Updates lastPushDate, lastPushAuthor, and schemaVersion (from plan).
 */
export async function prepareMetadataFileForPlan(
  config: WebAppPushConfig,
  remoteFiles: Map<string, ProjectFile>,
  downloadRemoteFile: (config: WebAppPushConfig, fileId: string) => Promise<Buffer>,
  plan: FileOperationPlan
): Promise<void> {
  const metadataPath = path.join(config.rootDir, config.manifestFile);
  const metadataDir = path.dirname(metadataPath);

  fs.mkdirSync(metadataDir, { recursive: true });

  let metadata: PushMetadata;
  let isNewMetadata = false;
  try {
    const content = fs.readFileSync(metadataPath, 'utf-8');
    const parsed = JSON.parse(content) as unknown;
    if (parsed == null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new SyntaxError('Metadata must be a JSON object');
    }
    metadata = parsed as PushMetadata;
  } catch (error) {
    const err = error as NodeJS.ErrnoException & { name?: string };
    if (err.code === 'ENOENT') {
      // Local file missing: use remote as source of truth when present.
      const remoteEntry = remoteFiles.get(PUSH_METADATA_REMOTE_PATH);
      if (remoteEntry) {
        try {
          const remoteContent = await downloadRemoteFile(config, remoteEntry.id);
          const parsed = JSON.parse(remoteContent.toString()) as unknown;
          if (parsed == null || typeof parsed !== 'object' || Array.isArray(parsed)) {
            throw new SyntaxError('Remote push_metadata.json is not a valid JSON object');
          }
          metadata = parsed as PushMetadata;
        } catch (remoteErr) {
          const msg = remoteErr instanceof Error ? remoteErr.message : String(remoteErr);
          config.logger.log(
            chalk.gray(
              MESSAGES.ERRORS.PUSH_REMOTE_METADATA_LOAD_FALLBACK_PREFIX + msg + MESSAGES.ERRORS.PUSH_REMOTE_METADATA_LOAD_FALLBACK_SUFFIX
            )
          );
          cliTelemetryClient.track('Cli.Push.MetadataRemoteLoadFailed', {
            error_message: msg.length > MAX_TELEMETRY_ERROR_LENGTH ? msg.slice(0, MAX_TELEMETRY_ERROR_LENGTH) + '...' : msg,
          });
          metadata = createNewMetadataPayload(config);
          isNewMetadata = true;
        }
      } else {
        metadata = createNewMetadataPayload(config);
        isNewMetadata = true;
      }
    } else {
      throw error;
    }
  }

  if (!isNewMetadata) {
    metadata.lastPushDate = new Date().toISOString();
    metadata.lastPushAuthor = getPushAuthorEmail(config.envConfig.accessToken, config.logger);
  }

  metadata.buildDir = config.bundlePath;

  if (!isNewMetadata) {
    metadata.schemaVersion = computeNextSchemaVersion(metadata.schemaVersion, plan);
  }

  const metadataContent = JSON.stringify(metadata, null, 2);
  const tempPath = `${metadataPath}.${process.pid}.${Date.now()}.tmp`;
  try {
    // Atomic write: write to temp then rename so readers never see partial content.
    fs.writeFileSync(tempPath, metadataContent, { mode: 0o600 });
    fs.renameSync(tempPath, metadataPath);
  } catch (error) {
    try {
      fs.unlinkSync(tempPath);
    } catch (unlinkErr) {
      const msg = unlinkErr instanceof Error ? unlinkErr.message : String(unlinkErr);
      config.logger.log(chalk.gray(MESSAGES.ERRORS.PUSH_TEMP_METADATA_REMOVE_FAILED_PREFIX + msg));
    }
    throw error;
  }
}

/**
 * Uploads the local push_metadata.json to the remote at source/push_metadata.json (not under build dir).
 */
export async function uploadPushMetadataToRemote(
  config: WebAppPushConfig,
  metadataPath: string,
  fullRemoteFiles: Map<string, ProjectFile>,
  folderIdMap: Map<string, string>,
  lockKey: string | null
): Promise<void> {
  const content = fs.readFileSync(metadataPath);
  const localFile: LocalFile = {
    path: PUSH_METADATA_REMOTE_PATH,
    absPath: metadataPath,
    hash: computeHash(content, metadataPath),
    content,
  };
  const sourceFolderId = folderIdMap.get(REMOTE_SOURCE_FOLDER_NAME) ?? null;
  const existing = fullRemoteFiles.get(PUSH_METADATA_REMOTE_PATH);
  if (existing) {
    await api.updateFile(config, PUSH_METADATA_REMOTE_PATH, localFile, existing.id, lockKey);
  } else {
    await api.createFile(
      config,
      PUSH_METADATA_REMOTE_PATH,
      localFile,
      sourceFolderId,
      REMOTE_SOURCE_FOLDER_NAME,
      lockKey
    );
  }
}

/**
 * Updates the remote project-root webAppManifest.json so that config.bundlePath is set to
 * "source/<buildDirName>". The manifest lives at project root on the remote (not under source).
 * If the file does not exist or update fails, the error is logged and not thrown.
 */
export async function updateRemoteWebAppManifest(
  config: WebAppPushConfig,
  bundlePath: string,
  fullRemoteFiles: Map<string, ProjectFile>,
  lockKey: string | null
): Promise<void> {
  const remoteFile = fullRemoteFiles.get(WEB_APP_MANIFEST_FILENAME);
  if (!remoteFile) return;

  try {
    const content = await api.downloadRemoteFile(config, remoteFile.id);
    const parsed = JSON.parse(content.toString()) as Record<string, unknown>;
    if (typeof parsed !== 'object' || parsed === null) return;
    const buildDirName = normalizeBundlePath(bundlePath);
    const configObj = (parsed.config as Record<string, unknown>) ?? {};
    parsed.config = {
      ...configObj,
      bundlePath: `${REMOTE_SOURCE_FOLDER_NAME}/${buildDirName}`,
    };

    const jsonString = JSON.stringify(parsed, null, 2);
    const newContent = Buffer.from(jsonString);
    const localFile: LocalFile = {
      path: WEB_APP_MANIFEST_FILENAME,
      absPath: '',
      hash: computeHash(newContent, WEB_APP_MANIFEST_FILENAME),
      content: newContent,
    };
    await api.updateFile(
      config,
      WEB_APP_MANIFEST_FILENAME,
      localFile,
      remoteFile.id,
      lockKey
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    config.logger.log(chalk.gray(MESSAGES.ERRORS.PUSH_WEB_APP_MANIFEST_UPDATE_FAILED_PREFIX + msg));
  }
}
