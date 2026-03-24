import { ResourceMetadataRegistry } from './registry';
import type { ResourceMetadataEntry } from './types';

/**
 * Eagerly imports all SDK service modules that use @ResourceReference decorators,
 * ensuring the global ResourceMetadataRegistry is fully populated.
 *
 * This is needed because service modules are lazy-loaded — importing the SDK root
 * alone does not trigger decorator execution. Tooling (e.g. CLI scanner) calls this
 * to get the complete registry.
 *
 * @returns The fully populated ResourceMetadataRegistry
 */
export async function loadAllResourceMetadata(): Promise<Map<string, ResourceMetadataEntry>> {
  await Promise.all([
    import('../../services/orchestrator/assets/assets'),
    import('../../services/orchestrator/processes/processes'),
    import('../../services/orchestrator/buckets/buckets'),
    import('../../services/orchestrator/queues/queues'),
  ]);

  return ResourceMetadataRegistry;
}
