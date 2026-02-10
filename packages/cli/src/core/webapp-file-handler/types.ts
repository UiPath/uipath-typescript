import type { EnvironmentConfig } from '../../types/index.js';

export interface WebAppPushConfig {
  projectId: string;
  rootDir: string;
  bundlePath: string;
  manifestFile: string;
  envConfig: EnvironmentConfig;
  logger: { log: (message: string) => void };
}

/**
 * Shape of push_metadata.json (local: .uipath/push_metadata.json, remote: source/push_metadata.json).
 * All fields are required except codeVersion (legacy).
 */
export interface PushMetadata {
  schemaVersion: string;
  projectId: string;
  description: string;
  lastPushDate: string;
  lastPushAuthor: string;
  /** Optional; used for legacy/backward compatibility. */
  codeVersion?: string;
}

export interface LocalFile {
  path: string;
  absPath: string;
  hash: string;
  content: Buffer;
}

export interface ProjectFile {
  id: string;
  name: string;
  path?: string;
}

export interface ProjectFolder {
  id: string | null;
  name: string;
  files: ProjectFile[];
  folders: ProjectFolder[];
}

export interface ProjectStructure {
  name: string;
  files: ProjectFile[];
  folders: ProjectFolder[];
}

export interface CreateFolderEntry {
  path: string;
  id?: string;
}

export interface UploadFileEntry {
  path: string;
  localFile: LocalFile;
  parentPath: string | null;
  parentId?: string | null;
}

export interface UpdateFileEntry {
  path: string;
  localFile: LocalFile;
  fileId: string;
}

export interface DeleteFileEntry {
  fileId: string;
  path: string;
}

export interface DeleteFolderEntry {
  folderId: string;
  path: string;
}

export interface FileOperationPlan {
  createFolders: CreateFolderEntry[];
  uploadFiles: UploadFileEntry[];
  updateFiles: UpdateFileEntry[];
  deleteFiles: DeleteFileEntry[];
  deleteFolders: DeleteFolderEntry[];
}

export interface FailedPathEntry {
  path: string;
  error: string;
}

/** Result of file/folder operations so callers can detect and handle failures. */
export interface FileOpsResult {
  succeededCount: number;
  failedCount: number;
  failedPaths: FailedPathEntry[];
}

export interface AddedResource {
  contentFilePath?: string;
  contentString?: string;
  fileName?: string;
  parentPath?: string | null;
}

export interface ModifiedResource {
  id: string;
  contentFilePath?: string;
  contentString?: string;
}

export interface StructuralMigration {
  addedResources: AddedResource[];
  modifiedResources: ModifiedResource[];
  deletedResources: string[];
}

export interface LockInfo {
  projectLockKey?: string | null;
  solutionLockKey?: string | null;
}

// Resource import / bindings
export interface PropertyDefinition {
  defaultValue: string;
  isExpression: boolean;
  displayName: string;
}

export interface BindingResource {
  resource: 'asset' | 'process' | 'bucket' | 'index' | 'app' | 'connection' | 'queue';
  key: string;
  value: {
    name?: PropertyDefinition;
    folderPath?: PropertyDefinition;
    ConnectionId?: PropertyDefinition;
  };
  metadata?: {
    ActivityName?: string;
    BindingsVersion?: string;
    DisplayLabel?: string;
    Connector?: string;
    UseConnectionService?: string;
  };
}

export interface Bindings {
  version: string;
  resources: BindingResource[];
}

/** Shared shape for folder with key, fully-qualified name, and path (resource catalog, connections, referenced resources). */
export interface QualifiedFolder {
  folderKey: string;
  fullyQualifiedName: string;
  path: string;
}

export type ResourceFolder = QualifiedFolder;

export interface Resource {
  resourceKey: string;
  name: string;
  resourceType: string;
  resourceSubType: string | null;
  folders: ResourceFolder[];
}

export type ConnectionFolder = QualifiedFolder;

export interface Connection {
  key: string;
  name: string;
  folder: ConnectionFolder | null;
}

export type ReferencedResourceFolder = QualifiedFolder;

export interface ReferencedResourceRequest {
  key: string;
  kind: string;
  type: string | null;
  folder: ReferencedResourceFolder;
}

export interface ReferencedResourceResponse {
  status: 'ADDED' | 'UNCHANGED' | 'UPDATED';
  resource: Record<string, unknown>;
  saved: boolean;
}
