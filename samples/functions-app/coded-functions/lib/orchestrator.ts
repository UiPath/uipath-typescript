import { FunctionError } from '@uipath/coded-functions-js-sdk';
import type { FunctionContext } from '@uipath/coded-functions-js-sdk';

/** Everything needed to call Orchestrator as the function's own service account. */
export interface OrchConn {
  baseUrl: string;
  headers: Record<string, string>;
  robotKey: string;
}

/**
 * Builds the connection from platform-injected context.
 *
 * `ctx.platform` and `ctx.robot` are populated only in a deployed run. Locally
 * they are null, which is why this sample is deployed before it is shown.
 */
export function robotConnection(ctx: FunctionContext): OrchConn {
  if (!ctx.platform) {
    throw new FunctionError(
      'Platform context unavailable. This function must run deployed, not locally.',
      500,
      'NO_PLATFORM_CONTEXT',
    );
  }
  const token = ctx.robot?.accessToken;
  const robotKey = ctx.robot?.key;
  if (!token || !robotKey) {
    throw new FunctionError(
      'No robot identity on this run. A Secret asset can only be read by a deployed job.',
      500,
      'NO_ROBOT_IDENTITY',
    );
  }

  const { baseUrl, orgId, tenantId, folderKey } = ctx.platform;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
  if (folderKey) headers['X-UIPATH-FolderKey'] = folderKey;

  return { baseUrl: `${baseUrl}/${orgId}/${tenantId}/orchestrator_`, headers, robotKey };
}

/**
 * Reads a Secret asset.
 *
 * Two things make this the only route: a Secret is omitted entirely from the
 * ordinary assets listing, and this endpoint requires a robot key that only a
 * running job has.
 *
 * The value arrives in `SecretValue`. For a Secret asset the `StringValue`
 * field that works for Text assets is an empty string, so reading that instead
 * looks exactly like a broken feature.
 */
export async function readSecretAsset(conn: OrchConn, assetName: string): Promise<string> {
  const res = await fetch(
    `${conn.baseUrl}/odata/Assets/UiPath.Server.Configuration.OData.GetRobotAssetByNameForRobotKey`,
    {
      method: 'POST',
      headers: conn.headers,
      body: JSON.stringify({ robotKey: conn.robotKey, assetName }),
      signal: AbortSignal.timeout(8_000),
    },
  );

  if (!res.ok) {
    throw new FunctionError(
      `Could not read asset '${assetName}' (HTTP ${res.status}).`,
      502,
      'ASSET_READ_FAILED',
    );
  }

  const body = (await res.json()) as Record<string, unknown>;
  for (const key of ['SecretValue', 'StringValue', 'Value']) {
    const value = body[key];
    if (typeof value === 'string' && value.length > 0) return value;
  }

  throw new FunctionError(
    `Asset '${assetName}' returned no value. Is it a Secret asset with a value set?`,
    502,
    'ASSET_EMPTY',
  );
}
