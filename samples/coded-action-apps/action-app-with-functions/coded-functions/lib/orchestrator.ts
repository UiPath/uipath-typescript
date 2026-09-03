import { FunctionError } from '@uipath/coded-functions-js-sdk';
import type { FunctionContext } from '@uipath/coded-functions-js-sdk';
import type { ReadCredentialOutput, ResolvedValueType } from './contract.ts';

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
      'No robot identity on this run. A Credential or Secret asset can only be read by a deployed job.',
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

/** The value-carrying field differs per asset type; only one of them is ever populated. */
interface RobotAssetDto {
  Name?: string;
  ValueType?: string;
  StringValue?: string;
  IntValue?: number;
  BoolValue?: boolean;
  CredentialUsername?: string;
  CredentialPassword?: string;
  SecretValue?: string;
}

const VALUE_TYPES: readonly ResolvedValueType[] = ['Text', 'Integer', 'Bool', 'Credential', 'Secret'];

const isResolvedValueType = (value: string | undefined): value is ResolvedValueType =>
  VALUE_TYPES.includes(value as ResolvedValueType);

/**
 * Resolves any asset type by name, the way a robot does.
 *
 * This endpoint is the only route to a Credential or Secret asset: the ordinary
 * assets listing returns a Credential without its password and omits a Secret
 * entirely, and this endpoint requires a robot key that only a running job has.
 *
 * Which field carries the value depends on the type — a Credential answers in
 * `CredentialPassword`, a Secret in `SecretValue`, and a Text asset in
 * `StringValue`. Reading the wrong one returns an empty string, which looks
 * exactly like a broken feature rather than a mismatched asset type.
 */
export async function readRobotAsset(
  conn: OrchConn,
  assetName: string,
): Promise<Omit<ReadCredentialOutput, 'resolvedTime'>> {
  const res = await fetch(
    `${conn.baseUrl}/odata/Assets/UiPath.Server.Configuration.OData.GetRobotAssetByNameForRobotKey`,
    {
      method: 'POST',
      headers: conn.headers,
      body: JSON.stringify({ robotKey: conn.robotKey, assetName }),
      signal: AbortSignal.timeout(8_000),
    },
  );

  if (res.status === 404) {
    throw new FunctionError(
      `No asset named '${assetName}' is available to this robot in the function's folder.`,
      404,
      'ASSET_NOT_FOUND',
    );
  }
  if (!res.ok) {
    throw new FunctionError(
      `Could not read asset '${assetName}' (HTTP ${res.status}).`,
      502,
      'ASSET_READ_FAILED',
    );
  }

  const body = (await res.json()) as RobotAssetDto;
  const valueType: ResolvedValueType = isResolvedValueType(body.ValueType) ? body.ValueType : 'Text';

  switch (valueType) {
    case 'Credential': {
      const password = body.CredentialPassword;
      if (!password) {
        throw new FunctionError(
          `Credential asset '${assetName}' returned no password. Is a value set for this robot?`,
          502,
          'ASSET_EMPTY',
        );
      }
      return { assetName, valueType, value: password, username: body.CredentialUsername };
    }
    case 'Secret': {
      const secret = body.SecretValue;
      if (!secret) {
        throw new FunctionError(
          `Secret asset '${assetName}' returned no value. Is its credential store reachable?`,
          502,
          'ASSET_EMPTY',
        );
      }
      return { assetName, valueType, value: secret };
    }
    case 'Integer':
      if (body.IntValue === undefined) {
        throw new FunctionError(`Asset '${assetName}' returned no value.`, 502, 'ASSET_EMPTY');
      }
      return { assetName, valueType, value: String(body.IntValue) };
    case 'Bool':
      if (body.BoolValue === undefined) {
        throw new FunctionError(`Asset '${assetName}' returned no value.`, 502, 'ASSET_EMPTY');
      }
      return { assetName, valueType, value: String(body.BoolValue) };
    case 'Text': {
      const text = body.StringValue;
      if (!text) {
        throw new FunctionError(`Asset '${assetName}' returned no value.`, 502, 'ASSET_EMPTY');
      }
      return { assetName, valueType, value: text };
    }
  }
}
