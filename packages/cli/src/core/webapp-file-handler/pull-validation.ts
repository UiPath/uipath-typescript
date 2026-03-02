/**
 * Pull command: project type validation. Ensures remote is a supported Studio Web project
 * (webAppManifest.json with type "App_ProCode").
 */
import { MESSAGES } from '../../constants/index.js';
import { PULL_WEB_APP_MANIFEST, PULL_WEB_APP_MANIFEST_TYPE } from '../../constants/pull.js';
import type { WebAppProjectConfig, ProjectFile } from './types.js';
import * as api from './api.js';

/** Finds the remote path for webAppManifest.json (exact or path ending with /webAppManifest.json). */
export function findWebAppManifestPath(filesMap: Map<string, ProjectFile>): string | null {
  const exact = filesMap.get(PULL_WEB_APP_MANIFEST);
  if (exact) return PULL_WEB_APP_MANIFEST;
  for (const p of filesMap.keys()) {
    if (p.endsWith(`/${PULL_WEB_APP_MANIFEST}`)) return p;
  }
  return null;
}

/**
 * Downloads a remote file and parses it as JSON. Throws Error with invalidMessage on parse failure.
 */
async function downloadAndParseRemoteJson(
  config: WebAppProjectConfig,
  file: ProjectFile,
  invalidMessage: string
): Promise<Record<string, unknown>> {
  const content = await api.downloadRemoteFile(config, file.id);
  try {
    return JSON.parse(content.toString('utf8')) as Record<string, unknown>;
  } catch {
    throw new Error(invalidMessage);
  }
}

/**
 * Validates project type by checking webAppManifest.json has "type": "App_ProCode".
 * Throws Error if no manifest, parse failure, or key mismatch.
 * Assumes filesMap keys are remote paths as returned by getRemoteFilesMap.
 */
export async function validateProjectType(
  config: WebAppProjectConfig,
  filesMap: Map<string, ProjectFile>
): Promise<void> {
  const webAppPath = findWebAppManifestPath(filesMap);
  if (!webAppPath) {
    throw new Error(MESSAGES.ERRORS.PULL_PROJECT_NOT_SUPPORTED);
  }

  // findWebAppManifestPath only returns a path that is a key in filesMap, so get() is defined.
  const file = filesMap.get(webAppPath)!;
  const parsed = await downloadAndParseRemoteJson(
    config,
    file,
    MESSAGES.ERRORS.PULL_PROJECT_NOT_SUPPORTED
  );
  if (parsed['type'] !== PULL_WEB_APP_MANIFEST_TYPE) {
    throw new Error(MESSAGES.ERRORS.PULL_PROJECT_NOT_SUPPORTED);
  }
}
