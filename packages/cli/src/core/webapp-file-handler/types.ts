import type { EnvironmentConfig } from '../../types/index.js';

export interface WebAppPushConfig {
  projectId: string;
  rootDir: string;
  bundlePath: string;
  manifestFile: string;
  envConfig: EnvironmentConfig;
  logger: { log: (message: string) => void };
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

export interface FileOperationPlan {
  createFolders: Array<{ path: string; id?: string }>;
  uploadFiles: Array<{
    path: string;
    localFile: LocalFile;
    parentPath: string | null;
    parentId?: string | null;
  }>;
  updateFiles: Array<{ path: string; localFile: LocalFile; fileId: string }>;
  deleteFiles: Array<{ fileId: string; path: string }>;
  deleteFolders: Array<{ folderId: string; path: string }>;
}

/** Result of file/folder operations so callers can detect and handle failures. */
export interface FileOpsResult {
  succeededCount: number;
  failedCount: number;
  failedPaths: Array<{ path: string; error: string }>;
}

export interface AddedResource {
  content_file_path?: string;
  content_string?: string;
  file_name?: string;
  parent_path?: string | null;
}

export interface ModifiedResource {
  id: string;
  content_file_path?: string;
  content_string?: string;
}

export interface StructuralMigration {
  added_resources: AddedResource[];
  modified_resources: ModifiedResource[];
  deleted_resources: string[];
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

export interface ResourceFolder {
  folder_key: string;
  fully_qualified_name: string;
  path: string;
}

export interface Resource {
  resource_key: string;
  name: string;
  resource_type: string;
  resource_sub_type: string | null;
  folders: ResourceFolder[];
}

export interface ConnectionFolder {
  key: string;
  fullyQualifiedName: string;
  path: string;
}

export interface Connection {
  key: string;
  name: string;
  folder: ConnectionFolder | null;
}

export interface ReferencedResourceFolder {
  folder_key: string;
  fully_qualified_name: string;
  path: string;
}

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
