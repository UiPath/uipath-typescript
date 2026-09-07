// Action Center task URL helpers for embedding HITL tasks in an iframe.
// The API base URL and the cloud UI URL use different hostnames, so we map
// explicitly rather than with naive string replacement (which breaks for
// staging/alpha). See the uipath-coded-apps skill: "Embedding Action Center Tasks".
import { ENV } from '@/lib/env';

/** Maps an API base URL (uipath:base-url) to the corresponding cloud UI origin. */
export function apiToCloudUrl(apiBaseUrl: string): string {
  try {
    const url = new URL(apiBaseUrl);
    const cloudHost = url.hostname.replace('api.uipath.com', 'uipath.com');
    return `${url.protocol}//${cloudHost}`;
  } catch {
    return apiBaseUrl;
  }
}

/** Constructs the standard Action Center task URL for a task id. */
export function buildTaskUrl(taskId: number | string, opts?: { tenant?: string }): string {
  const cloudHost = apiToCloudUrl(ENV.baseUrl);
  const tenant = opts?.tenant || ENV.tenantName;
  return `${cloudHost}/${ENV.orgName}/${tenant}/actions_/current-task/tasks/${taskId}`;
}

/**
 * Converts a standard Action Center task URL into an embeddable (chrome-free)
 * iframe URL by inserting the `embed_/` prefix after the origin. The iframe
 * loads from the same UiPath domain, so the user's session handles auth.
 */
export function getEmbedTaskUrl(taskUrl: string): string {
  try {
    const url = new URL(taskUrl);
    const parts = url.pathname.split('/');
    const org = parts[1];
    const tenant = parts[2];
    const taskId = parts[parts.length - 1];
    return `${url.origin}/embed_/${org}/${tenant}/actions_/current-task/tasks/${taskId}`;
  } catch {
    return taskUrl;
  }
}
