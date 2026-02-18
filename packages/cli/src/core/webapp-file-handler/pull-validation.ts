/**
 * Pull command: project type validation. Ensures remote is a supported project
 * (webAppManifest.json with type "App_ProCode" or .uiproj with ProjectType "WebApp").
 */
import { MESSAGES } from '../../constants/index.js';
import {
  PULL_WEB_APP_MANIFEST,
  PULL_WEB_APP_MANIFEST_TYPE,
  PULL_UIPROJ_EXTENSION,
  PULL_UIPROJ_PROJECT_TYPE,
} from '../../constants/pull.js';
import type { WebAppPushConfig, ProjectFile } from './types.js';
import * as api from './api.js';
import { ProjectPullError } from './pull-errors.js';

/** Finds the remote path for webAppManifest.json (exact or path ending with /webAppManifest.json). */
export function findWebAppManifestPath(filesMap: Map<string, ProjectFile>): string | null {
  const exact = filesMap.get(PULL_WEB_APP_MANIFEST);
  if (exact) return PULL_WEB_APP_MANIFEST;
  for (const p of filesMap.keys()) {
    if (p.endsWith(`/${PULL_WEB_APP_MANIFEST}`)) return p;
  }
  return null;
}

/** Finds the first remote path ending with .uiproj (case-insensitive). */
export function findUiprojPath(filesMap: Map<string, ProjectFile>): string | null {
  for (const p of filesMap.keys()) {
    if (p.toLowerCase().endsWith(PULL_UIPROJ_EXTENSION)) return p;
  }
  return null;
}

/**
 * Validates project type by downloading and checking manifest keys:
 * - webAppManifest.json must have "type": "App_ProCode"
 * - .uiproj must have "ProjectType": "WebApp"
 * Throws ProjectPullError if no valid manifest or key mismatch.
 * Assumes filesMap keys are remote paths as returned by getRemoteFilesMap.
 */
export async function validateProjectType(
  config: WebAppPushConfig,
  filesMap: Map<string, ProjectFile>
): Promise<void> {
  const webAppPath = findWebAppManifestPath(filesMap);
  const uiprojPath = findUiprojPath(filesMap);

  if (webAppPath) {
    const file = filesMap.get(webAppPath);
    if (!file) throw new ProjectPullError(MESSAGES.ERRORS.PULL_WEB_APP_MANIFEST_TYPE_INVALID);
    const content = await api.downloadRemoteFile(config, file.id);
    let parsed: { type?: string };
    try {
      parsed = JSON.parse(content.toString('utf8')) as { type?: string };
    } catch {
      throw new ProjectPullError(MESSAGES.ERRORS.PULL_WEB_APP_MANIFEST_TYPE_INVALID);
    }
    if (parsed.type !== PULL_WEB_APP_MANIFEST_TYPE) {
      throw new ProjectPullError(MESSAGES.ERRORS.PULL_WEB_APP_MANIFEST_TYPE_INVALID);
    }
    return;
  }

  if (uiprojPath) {
    const file = filesMap.get(uiprojPath);
    if (!file) throw new ProjectPullError(MESSAGES.ERRORS.PULL_UIPROJ_PROJECT_TYPE_INVALID);
    const content = await api.downloadRemoteFile(config, file.id);
    let parsed: { ProjectType?: string };
    try {
      parsed = JSON.parse(content.toString('utf8')) as { ProjectType?: string };
    } catch {
      throw new ProjectPullError(MESSAGES.ERRORS.PULL_UIPROJ_PROJECT_TYPE_INVALID);
    }
    if (parsed.ProjectType !== PULL_UIPROJ_PROJECT_TYPE) {
      throw new ProjectPullError(MESSAGES.ERRORS.PULL_UIPROJ_PROJECT_TYPE_INVALID);
    }
    return;
  }

  throw new ProjectPullError(MESSAGES.ERRORS.PULL_PROJECT_TYPE_UNSUPPORTED);
}
