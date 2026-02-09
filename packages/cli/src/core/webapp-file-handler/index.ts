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

export type {
  Bindings,
  Resource,
  Connection,
  ReferencedResourceRequest,
  ReferencedResourceResponse,
  LockInfo,
} from './types.js';
