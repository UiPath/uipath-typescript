/**
 * Public API for webapp file handler. Implementation in handler.js.
 */
export {
  WebAppFileHandler,
  convertPlanToMigration,
  type WebAppPushConfig,
  type LocalFile,
  type ProjectFile,
  type ProjectFolder,
  type ProjectStructure,
  type FileOperationPlan,
  type FileOpsResult,
  type StructuralMigration,
  type AddedResource,
  type ModifiedResource,
} from './handler.js';

export { runPull, ProjectPullError, type RunPullOptions } from './run-pull.js';

export type {
  Bindings,
  Resource,
  Connection,
  ReferencedResourceRequest,
  ReferencedResourceResponse,
  LockInfo,
  PushMetadata,
} from './types.js';
