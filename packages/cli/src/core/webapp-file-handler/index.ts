/**
 * Public API for webapp file handler. Implementation in handler.js.
 */
export {
  WebAppFileHandler,
  convertPlanToMigration,
  type WebAppProjectConfig,
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

export { runPull, type RunPullOptions } from './run-pull.js';
export { isProjectRootDirectory } from './pull-utils.js';

export type {
  Bindings,
  Resource,
  Connection,
  ReferencedResourceRequest,
  ReferencedResourceResponse,
  LockInfo,
  PushMetadata,
} from './types.js';
