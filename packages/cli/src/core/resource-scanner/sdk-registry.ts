import { createRequire } from 'node:module';
import type { ResourceMethodMetadata } from './types.js';

/**
 * Dynamically loads the ResourceMetadataRegistry from the SDK installed in the user's project.
 * Calls loadAllResourceMetadata() which eagerly imports all service modules, triggering
 * @ResourceReference decorator execution and populating the global registry.
 *
 * This eliminates the need for a hand-maintained static mirror — the decorators on
 * SDK service methods are the single source of truth.
 *
 * @param projectRoot - The root directory of the user's project (used to resolve the SDK package)
 */
export async function loadSDKResourceMethods(projectRoot: string): Promise<Map<string, ResourceMethodMetadata>> {
  const methods = new Map<string, ResourceMethodMetadata>();

  let sdkPath: string;
  try {
    // Resolve the SDK from the user's project directory, not from the CLI's own node_modules.
    // createRequire is needed because require.resolve is not available in ESM context.
    const require = createRequire(projectRoot + '/package.json');
    sdkPath = require.resolve('@uipath/uipath-typescript');
  } catch {
    return methods;
  }

  try {
    const sdk = await import(sdkPath);

    // loadAllResourceMetadata eagerly imports all service modules (assets, processes,
    // buckets, queues, etc.) so that @ResourceReference decorators execute and populate
    // the global registry.
    if (typeof sdk.loadAllResourceMetadata !== 'function') {
      return methods;
    }

    const registry: Map<string, { methodName: string; resource: string; options: Record<string, unknown> }> =
      await sdk.loadAllResourceMetadata();

    for (const [key, entry] of registry) {
      const opts = entry.options;
      methods.set(key, {
        resource: opts.resource as ResourceMethodMetadata['resource'],
        idParam: opts.idParam as string | undefined,
        idParamIndex: opts.idParamIndex as number | undefined,
        nameParam: opts.nameParam as string | undefined,
        nameParamIndex: opts.nameParamIndex as number | undefined,
        folderIdParam: opts.folderIdParam as string | undefined,
        folderIdParamIndex: opts.folderIdParamIndex as number | undefined,
        folderParam: opts.folderParam as string | undefined,
        folderParamIndex: opts.folderParamIndex as number | undefined,
      });
    }
  } catch {
    // SDK import failed — return empty map, caller will handle gracefully
  }

  return methods;
}
