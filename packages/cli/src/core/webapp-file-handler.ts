/**
 * Re-export WebApp file handler and types from the split module for backward compatibility.
 * Implementation lives in ./webapp-file-handler/
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
  type StructuralMigration,
  type AddedResource,
  type ModifiedResource,
} from './webapp-file-handler/index.js';

export type {
  Bindings,
  Resource,
  Connection,
  ReferencedResourceRequest,
  ReferencedResourceResponse,
  LockInfo,
} from './webapp-file-handler/types.js';
