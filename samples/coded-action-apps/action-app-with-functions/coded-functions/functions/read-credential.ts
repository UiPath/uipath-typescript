import { defineFunction, FunctionError, logger } from '@uipath/coded-functions-js-sdk';
import { RESOLVABLE_ASSET_PREFIX } from '../lib/contract.ts';
import type { ReadCredentialOutput } from '../lib/contract.ts';
import { readRobotAsset, robotConnection } from '../lib/orchestrator.ts';

/**
 * Resolves an Orchestrator asset by name and returns its value.
 *
 * This is why the sample needs a function. A Credential asset's password and a
 * Secret asset's value are never returned by the ordinary Assets API — they are
 * resolved only through the robot endpoint, which needs a robot key that exists
 * only on a deployed run. The browser has no route to either, with or without
 * the signed-in user's token.
 */
export default defineFunction({
  name: 'read-credential',
  description: "Resolves an Orchestrator asset by name and returns its value.",
  method: 'POST',
  path: '/read-credential',
  input: {
    type: 'object',
    properties: {
      assetName: { type: 'string', minLength: 1, maxLength: 256 },
    },
    required: ['assetName'],
    additionalProperties: false,
  },
  handler: async (input, ctx): Promise<ReadCredentialOutput> => {
    // Authorize BEFORE touching the robot identity. The name is caller-supplied and the
    // robot can read every secret in the folder, so an unconstrained read here would let
    // any caller enumerate all of them.
    if (!input.assetName.startsWith(RESOLVABLE_ASSET_PREFIX)) {
      logger.info(`read-credential: refused '${input.assetName}' — outside the resolvable prefix`);
      throw new FunctionError(
        `This function only resolves assets named '${RESOLVABLE_ASSET_PREFIX}*'.`,
        403,
        'ASSET_NOT_RESOLVABLE',
      );
    }

    const conn = robotConnection(ctx);
    const resolved = await readRobotAsset(conn, input.assetName);

    // Log the identity of what was read, never the value.
    logger.info(`read-credential: resolved '${resolved.assetName}' (${resolved.valueType})`);

    return { ...resolved, resolvedTime: new Date().toISOString() };
  },
});
