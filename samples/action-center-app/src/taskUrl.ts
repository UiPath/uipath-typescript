// Action Center task URL helpers, used to embed a task in an iframe.
//
// The SDK talks to the API host (`https://alpha.api.uipath.com`), while the
// Action Center UI lives on the cloud host (`https://alpha.uipath.com`). The
// mapping is explicit — a naive `replace('api.', 'cloud.')` breaks on staging
// and alpha. See the uipath-coded-apps skill, "Embedding Action Center Tasks".

/** Maps an API base URL (`uipath:base-url` meta tag) to the corresponding cloud UI origin. */
export function apiToCloudUrl(apiBaseUrl: string): string {
  try {
    const url = new URL(apiBaseUrl)
    // "alpha.api.uipath.com" → "alpha.uipath.com"; the bare production API host
    // "api.uipath.com" maps to "cloud.uipath.com", not "uipath.com".
    let cloudHost = url.hostname.replace('api.uipath.com', 'uipath.com')
    if (cloudHost === 'uipath.com') cloudHost = 'cloud.uipath.com'
    return `${url.protocol}//${cloudHost}`
  } catch {
    return apiBaseUrl
  }
}

export interface TaskUrlContext {
  baseUrl: string
  orgName: string
  tenantName: string
}

/** The standard Action Center URL for a task — what a user would open in a new tab. */
export function buildTaskUrl(taskId: number | string, ctx: TaskUrlContext): string {
  return `${apiToCloudUrl(ctx.baseUrl)}/${ctx.orgName}/${ctx.tenantName}/actions_/current-task/tasks/${taskId}`
}

/**
 * The chrome-free embeddable variant: `embed_/` is inserted right after the
 * origin. The iframe loads from the UiPath domain, so the user's own session
 * authenticates it — no token is passed.
 */
export function buildEmbedTaskUrl(taskId: number | string, ctx: TaskUrlContext): string {
  return `${apiToCloudUrl(ctx.baseUrl)}/embed_/${ctx.orgName}/${ctx.tenantName}/actions_/current-task/tasks/${taskId}`
}
