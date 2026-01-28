import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import fetch from 'node-fetch';
import FormData from 'form-data';
import chalk from 'chalk';
import { EnvironmentConfig } from '../types/index.js';
import { API_ENDPOINTS } from '../constants/api.js';
import { createHeaders } from '../utils/api.js';
import { handleHttpError } from '../utils/error-handler.js';

export interface WebAppPushConfig {
  projectId: string; // solution ID
  rootDir: string;
  bundlePath: string; // "dist"
  manifestFile: string; 
  envConfig: EnvironmentConfig;
  logger: {
    log: (message: string) => void;
  };
}

export interface LocalFile {
  path: string; // relative path from rootDir, e.g., "dist/index.html"
  absPath: string;
  hash: string;
  content: Buffer;
}

// Studio Web Project Structure
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

// Execution plan for per-file operations
export interface FileOperationPlan {
  createFolders: Array<{ path: string; id?: string }>; // Not used anymore - folders created automatically
  uploadFiles: Array<{ path: string; localFile: LocalFile; parentPath: string | null; parentId?: string | null }>; // parentId if folder exists, parentPath if needs creation
  updateFiles: Array<{ path: string; localFile: LocalFile; fileId: string }>;
  deleteFiles: Array<{ fileId: string; path: string }>;
  deleteFolders: Array<{ folderId: string; path: string }>; // Folders that no longer exist locally
}

// Legacy interfaces (kept for backward compatibility during migration)
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
  deleted_resources: string[]; // File IDs to delete
}

interface LockInfo {
  projectLockKey?: string | null;
  solutionLockKey?: string | null;
}

export class WebAppFileHandler {
  private config: WebAppPushConfig;
  private projectStructure: ProjectStructure | null = null;
  private lockKey: string | null = null;

  constructor(config: WebAppPushConfig) {
    this.config = config;
  }

  /**
   * Remote "source" folder name: outer boundary on remote. Inside it we have dist/ (same as local bundlePath).
   * Structure: source/dist/index.html, source/dist/css/, etc. All push operations are scoped to source/dist/;
   * we never touch files/folders outside it.
   */
  private static readonly REMOTE_SOURCE_FOLDER_NAME = 'source';

  private get sourceFolderName(): string {
    return WebAppFileHandler.REMOTE_SOURCE_FOLDER_NAME;
  }

  /**
   * Remote content root: source/dist. This is the root for diff; we only consider paths under source/dist/.
   */
  private get remoteContentRoot(): string {
    return this.sourceFolderName + '/' + this.config.bundlePath;
  }

  /**
   * Map local path (under bundlePath, e.g. dist/index.html) to remote path (under source/dist, e.g. source/dist/index.html).
   */
  private localPathToRemotePath(localPath: string): string {
    const normalized = localPath.replace(/\\/g, '/');
    const prefix = this.config.bundlePath + '/';
    if (normalized.startsWith(prefix)) {
      return this.remoteContentRoot + '/' + normalized.slice(prefix.length);
    }
    if (normalized === this.config.bundlePath) {
      return this.remoteContentRoot;
    }
    return this.remoteContentRoot + '/' + normalized;
  }

  /**
   * Filter remote files map to only entries under source/dist/ (our push boundary; don't touch outer env).
   */
  private filterToSourceFolderFiles(files: Map<string, ProjectFile>): Map<string, ProjectFile> {
    const root = this.remoteContentRoot;
    const prefix = root + '/';
    const filtered = new Map<string, ProjectFile>();
    for (const [filePath, file] of files.entries()) {
      if (filePath === root || filePath.startsWith(prefix)) {
        filtered.set(filePath, file);
      }
    }
    return filtered;
  }

  /**
   * Filter remote folders map to only entries under source/dist/ (our push boundary).
   */
  private filterToSourceFolderFolders(folders: Map<string, ProjectFolder>): Map<string, ProjectFolder> {
    const root = this.remoteContentRoot;
    const prefix = root + '/';
    const filtered = new Map<string, ProjectFolder>();
    for (const [folderPath, folder] of folders.entries()) {
      if (folderPath === root || folderPath.startsWith(prefix)) {
        filtered.set(folderPath, folder);
      }
    }
    return filtered;
  }

  async push(): Promise<void> {
    try {
      const lockInfo = await this.retrieveLock();
      this.lockKey = lockInfo?.projectLockKey ?? null;

      this.projectStructure = await this.fetchRemoteStructure();
      const localFiles = this.collectLocalFiles();
      const fullRemoteFiles = this.getRemoteFilesMap(this.projectStructure);
      const fullRemoteFolders = this.getRemoteFoldersMap(this.projectStructure);

      const plan = await this.buildExecutionPlan(localFiles, fullRemoteFiles, fullRemoteFolders);
      await this.prepareMetadataFileForPlan(plan, fullRemoteFiles);

      const folderIdMap = this.buildFolderIdMap();
      await this.ensureFoldersCreated(plan, folderIdMap);
      await this.moveNestedFoldersIntoParents(plan.createFolders, folderIdMap);

      for (const fileOp of plan.uploadFiles) {
        if (fileOp.parentPath) {
          fileOp.parentId = folderIdMap.get(fileOp.parentPath) ?? null;
        }
      }

      // File operations
      const hasFileOps = plan.uploadFiles.length > 0 || plan.updateFiles.length > 0 || plan.deleteFiles.length > 0;
      if (hasFileOps) {
        await this.executeFileOperations(plan);
      }

      if (plan.deleteFiles.length > 0) {
        await this.deleteFiles(plan.deleteFiles);
      }

      // Delete folders that no longer exist locally (after files are deleted)
      if (plan.deleteFolders.length > 0) {
        await this.deleteFolders(plan.deleteFolders);
      }

      await this.cleanupEmptyFolders();
    } catch (error) {
      throw error;
    }
  }

  /** Build execution plan: first-push (create source/dist + upload only) or diff-based plan. */
  private async buildExecutionPlan(
    localFiles: LocalFile[],
    fullRemoteFiles: Map<string, ProjectFile>,
    fullRemoteFolders: Map<string, ProjectFolder>
  ): Promise<FileOperationPlan> {
    const contentRootExists = fullRemoteFolders.has(this.remoteContentRoot);

    if (!contentRootExists) {
      await this.ensureContentRootExists(fullRemoteFolders);
      const remoteFolders = this.getRemoteFoldersMap(this.projectStructure!);
      return this.computeFirstPushPlan(localFiles, remoteFolders);
    }

    const remoteFiles = this.filterToSourceFolderFiles(fullRemoteFiles);
    const remoteFolders = this.filterToSourceFolderFolders(fullRemoteFolders);
    return this.computeExecutionPlan(localFiles, remoteFiles, remoteFolders);
  }

  /** Ensure source and source/dist exist on remote (first push). */
  private async ensureContentRootExists(fullRemoteFolders: Map<string, ProjectFolder>): Promise<void> {
    if (!fullRemoteFolders.has(this.sourceFolderName)) {
      await this.createFolderAtRoot(this.sourceFolderName);
      this.projectStructure = await this.fetchRemoteStructure();
    }
    let currentFolders = this.getRemoteFoldersMap(this.projectStructure!);
    if (!currentFolders.has(this.remoteContentRoot)) {
      await this.createFolderAtRoot(this.config.bundlePath);
      this.projectStructure = await this.fetchRemoteStructure();
      currentFolders = this.getRemoteFoldersMap(this.projectStructure!);
      const distId = currentFolders.get(this.config.bundlePath)?.id;
      const sourceId = currentFolders.get(this.sourceFolderName)?.id;
      if (distId && sourceId) {
        await this.moveFolder(distId, sourceId);
      }
      this.projectStructure = await this.fetchRemoteStructure();
    }
  }

  private buildFolderIdMap(): Map<string, string> {
    const map = new Map<string, string>();
    const folders = this.getRemoteFoldersMap(this.projectStructure!);
    for (const [folderPath, folder] of folders.entries()) {
      if (folder.id) map.set(folderPath, folder.id);
    }
    return map;
  }

  private async ensureFoldersCreated(plan: FileOperationPlan, folderIdMap: Map<string, string>): Promise<void> {
    if (plan.createFolders.length === 0) return;
    for (const folder of plan.createFolders) {
      if (folderIdMap.has(folder.path)) continue;
      const folderName = folder.path.split('/').filter(Boolean).pop()!;
      const id = await this.createFolderAtRoot(folderName);
      if (id) folderIdMap.set(folder.path, id);
    }
    this.projectStructure = await this.fetchRemoteStructure();
    const afterCreate = this.getRemoteFoldersMap(this.projectStructure!);
    for (const folder of plan.createFolders) {
      if (folderIdMap.has(folder.path)) continue;
      const folderName = folder.path.split('/').filter(Boolean).pop()!;
      const byPath = afterCreate.get(folder.path);
      const byName = afterCreate.get(folderName);
      if (byPath?.id) folderIdMap.set(folder.path, byPath.id);
      else if (byName?.id) folderIdMap.set(folder.path, byName.id);
    }
  }

  private async moveNestedFoldersIntoParents(
    createFolders: FileOperationPlan['createFolders'],
    folderIdMap: Map<string, string>
  ): Promise<void> {
    const moves: Array<{ folderPath: string; folderId: string; parentId: string }> = [];
    for (const folder of createFolders) {
      const pathParts = folder.path.split('/').filter(Boolean);
      if (pathParts.length <= 1) continue;
      const parentPath = pathParts.slice(0, -1).join('/');
      const folderId = folderIdMap.get(folder.path);
      const parentId = folderIdMap.get(parentPath);
      if (folderId && parentId && folderId !== parentId) {
        moves.push({ folderPath: folder.path, folderId, parentId });
      }
    }
    for (const m of moves) {
      try {
        await this.moveFolder(m.folderId, m.parentId);
      } catch (e) {
        this.config.logger.log(chalk.yellow(`Move folder failed: ${m.folderPath} — ${e instanceof Error ? e.message : 'Unknown error'}`));
      }
    }
  }

  /**
   * Import referenced resources from bindings.json
   */
  public async importReferencedResources(ignoreResources: boolean = false): Promise<void> {
    if (ignoreResources) {
      return;
    }

    const bindingsPath = path.join(this.config.rootDir, 'bindings.json');
    let bindings: Bindings;
    try {
      const bindingsContent = fs.readFileSync(bindingsPath, 'utf-8');
      bindings = JSON.parse(bindingsContent);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
      this.config.logger.log(chalk.red(`Failed to parse bindings.json: ${error instanceof Error ? error.message : 'Unknown error'}`));
      return;
    }

    if (!bindings.resources || bindings.resources.length === 0) return;

    let resourcesNotFound = 0;
    let resourcesUnchanged = 0;
    let resourcesCreated = 0;
    let resourcesUpdated = 0;

    // Get solution ID
    const solutionId = await this.getSolutionId();

    // Process each resource
    for (const bindingsResource of bindings.resources) {
      const resourceType = bindingsResource.resource;
      let foundResource: Resource | null = null;
      let resourceName = '';
      let folderPath = '';

      try {
        if (resourceType === 'connection') {
          // Handle connections
          const connectionKeyResourceValue = bindingsResource.value?.ConnectionId;
          if (!connectionKeyResourceValue) {
            continue;
          }
          const connectionKey = connectionKeyResourceValue.defaultValue;
          
          try {
            const connection = await this.retrieveConnection(connectionKey);
            resourceName = connection.name;
            folderPath = connection.folder?.path || '';
            foundResource = {
              resource_key: connection.key || connectionKey,
              name: resourceName,
              resource_type: 'connection',
              resource_sub_type: bindingsResource.metadata?.Connector || null,
              folders: connection.folder ? [{
                folder_key: connection.folder.key,
                fully_qualified_name: connection.folder.fullyQualifiedName || '',
                path: folderPath,
              }] : [],
            };
          } catch (error) {
            const connectorName = bindingsResource.metadata?.Connector || 'unknown';
            this.config.logger.log(chalk.yellow(`Connection not found: ${connectionKey} (${connectorName})`));
            resourcesNotFound++;
            continue;
          }
        } else {
          // Handle other resources (asset, process, bucket, index, app, queue)
          const nameResourceValue = bindingsResource.value?.name;
          const folderPathResourceValue = bindingsResource.value?.folderPath;

          if (!nameResourceValue) {
            continue;
          }

          resourceName = nameResourceValue.defaultValue;
          // Make folderPath optional - if not provided, search tenant-scoped
          folderPath = folderPathResourceValue?.defaultValue || '';

          try {
            foundResource = await this.findResourceInCatalog(resourceType, resourceName, folderPath);
          } catch (error) {
            const folderInfo = folderPath ? ` at folder path '${folderPath}'` : ' (tenant-scoped)';
            this.config.logger.log(chalk.yellow(`Resource not found: ${resourceName} (${resourceType})${folderInfo}`));
            resourcesNotFound++;
            continue;
          }
        }

        if (!foundResource || foundResource.folders.length === 0) {
          this.config.logger.log(chalk.yellow(`Resource not found: ${resourceName} (${resourceType})`));
          resourcesNotFound++;
          continue;
        }

        const folder = foundResource.folders[0];
        const transformedKind = this.transformKind(foundResource.resource_type);
        const transformedType = this.transformType(foundResource.resource_sub_type);
        
        const referencedResourceRequest: ReferencedResourceRequest = {
          key: foundResource.resource_key,
          kind: transformedKind,
          type: transformedType,
          folder: {
            folder_key: folder.folder_key,
            fully_qualified_name: folder.fully_qualified_name,
            path: folder.path,
          },
        };

        const response = await this.createReferencedResource(solutionId, referencedResourceRequest);

        switch (response.status) {
          case 'ADDED':
            resourcesCreated++;
            break;
          case 'UNCHANGED':
            resourcesUnchanged++;
            break;
          case 'UPDATED':
            resourcesUpdated++;
            break;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.config.logger.log(chalk.red(`Error processing resource ${resourceName}: ${errorMessage}`));
        resourcesNotFound++;
      }
    }

    const totalResources = resourcesCreated + resourcesUnchanged + resourcesNotFound + resourcesUpdated;
    if (resourcesCreated > 0 || resourcesUpdated > 0 || resourcesNotFound > 0) {
      this.config.logger.log(
        `Resources: ${resourcesCreated} created, ${resourcesUpdated} updated, ${resourcesUnchanged} unchanged, ${resourcesNotFound} not found`
      );
    }
  }

  private collectLocalFiles(): LocalFile[] {
    const files: LocalFile[] = [];
    
    const distPath = path.join(this.config.rootDir, this.config.bundlePath);
    try {
      this.collectFilesRecursive(distPath, distPath, files);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return files;
      }
      throw error;
    }

    return files;
  }

  private collectFilesRecursive(dir: string, baseDir: string, files: LocalFile[]): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        this.collectFilesRecursive(fullPath, baseDir, files);
      } else if (entry.isFile()) {
        const relPath = path.relative(this.config.rootDir, fullPath);
        const content = fs.readFileSync(fullPath);
        
        files.push({
          path: relPath.replace(/\\/g, '/'),
          absPath: fullPath,
          hash: this.computeNormalizedHash(content),
          content,
        });
      }
    }
  }

  /**
   * Compute normalized hash for content comparison
   * JSON files are normalized by parsing and re-stringifying
   * Other files have line endings normalized
   */
  private computeNormalizedHash(content: Buffer | string): string {
    let contentStr: string;
    if (Buffer.isBuffer(content)) {
      contentStr = content.toString('utf-8');
    } else {
      contentStr = content;
    }

    let normalized: string;
    try {
      const jsonContent = JSON.parse(contentStr);
      normalized = JSON.stringify(jsonContent, null, 2);
    } catch {
      normalized = contentStr.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    }
    
    return crypto.createHash('sha256').update(normalized, 'utf-8').digest('hex');
  }

  private async fetchRemoteStructure(): Promise<ProjectStructure> {
    const url = this.buildApiUrl(
      API_ENDPOINTS.STUDIO_WEB_STRUCTURE.replace('{projectId}', this.config.projectId)
    );

    const response = await fetch(url, {
      method: 'GET',
      headers: createHeaders({
        bearerToken: this.config.envConfig.accessToken,
        tenantId: this.config.envConfig.tenantId,
      }),
    });

    if (!response.ok) {
      if (response.status === 404) {
        // Project structure doesn't exist - create lock and return empty structure
        await this.putLock();
        return { name: '', files: [], folders: [] };
      }
      await handleHttpError(response, 'fetch remote structure');
    }

    return await response.json() as ProjectStructure;
  }

  /**
   * Get all remote files as a flat map indexed by path
   */
  private getRemoteFilesMap(structure: ProjectStructure): Map<string, ProjectFile> {
    const files = new Map<string, ProjectFile>();
    
    const collectFiles = (folder: ProjectFolder, currentPath: string = '') => {
      // Add files from current folder
      for (const file of folder.files) {
        const filePath = currentPath ? `${currentPath}/${file.name}` : file.name;
        files.set(filePath, file);
      }
      
      // Recursively process subfolders
      for (const subfolder of folder.folders) {
        const subfolderPath = currentPath ? `${currentPath}/${subfolder.name}` : subfolder.name;
        collectFiles(subfolder, subfolderPath);
      }
    };

    // Process root files
    for (const file of structure.files) {
      files.set(file.name, file);
    }

    // Process root-level folders with folder name as path prefix so paths match local (e.g. dist/index.html)
    for (const folder of structure.folders) {
      collectFiles(folder, folder.name);
    }

    return files;
  }

  /**
   * Get all remote folders as a flat map indexed by path
   */
  private getRemoteFoldersMap(structure: ProjectStructure): Map<string, ProjectFolder> {
    const folders = new Map<string, ProjectFolder>();

    const collectFolders = (folder: ProjectFolder, currentPath: string = '') => {
      const pathKey = currentPath || folder.name;
      if (pathKey) {
        folders.set(pathKey, folder);
      }
      for (const subfolder of folder.folders) {
        const subfolderPath = currentPath ? `${currentPath}/${subfolder.name}` : subfolder.name;
        collectFolders(subfolder, subfolderPath);
      }
    };

    // Use folder name as path prefix so paths match local (e.g. dist, dist/css)
    for (const folder of structure.folders) {
      collectFolders(folder, folder.name);
    }

    return folders;
  }

  /**
   * Compute execution plan for file operations
   * Phase 3: Diff Computation
   */
  private async computeExecutionPlan(
    localFiles: LocalFile[],
    remoteFiles: Map<string, ProjectFile>,
    remoteFolders: Map<string, ProjectFolder>
  ): Promise<FileOperationPlan> {
    const plan: FileOperationPlan = {
      createFolders: [],
      uploadFiles: [],
      updateFiles: [],
      deleteFiles: [],
      deleteFolders: [],
    };

    const processedFileIds = new Set<string>();
    const requiredFolders = new Set<string>();

    // Process local files: remote paths are under source/dist/ (e.g. source/dist/index.html), local are under dist/
    for (const localFile of localFiles) {
      const remotePath = this.localPathToRemotePath(localFile.path);
      const remoteFile = remoteFiles.get(remotePath);

      // Always track required folders for every local file (so we don't delete folders that have files)
      const remoteParentPath = path.dirname(remotePath);
      const parentPathForPlan = remoteParentPath === '.' ? this.remoteContentRoot : remoteParentPath;
      const pathParts = parentPathForPlan.split('/');
      let currentPath = '';
      for (const part of pathParts) {
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        requiredFolders.add(currentPath);
      }

      if (remoteFile) {
        processedFileIds.add(remoteFile.id);

        // Download remote file to compare
        try {
          const remoteContent = await this.downloadRemoteFile(remoteFile.id);
          const remoteHash = this.computeNormalizedHash(remoteContent);

          if (localFile.hash !== remoteHash) {
            plan.updateFiles.push({
              path: localFile.path,
              localFile,
              fileId: remoteFile.id,
            });
          }
        } catch (error) {
          // If comparison fails, proceed with update
          plan.updateFiles.push({
            path: localFile.path,
            localFile,
            fileId: remoteFile.id,
          });
        }
      } else {
        // Skip studio_metadata.json - it's local metadata only
        if (localFile.path === '.uipath/studio_metadata.json' || localFile.path === 'studio_metadata.json') {
          continue;
        }

        // New file: parent path on remote is under source/dist (e.g. source/dist, source/dist/css)
        plan.uploadFiles.push({
          path: localFile.path,
          localFile,
          parentPath: parentPathForPlan,
        });
      }
    }

    // Find deleted files: remote paths are under source/; delete if no local file maps to that remote path
    const localRemotePaths = new Set<string>();
    for (const localFile of localFiles) {
      localRemotePaths.add(this.localPathToRemotePath(localFile.path));
    }

    for (const [filePath, remoteFile] of remoteFiles.entries()) {
      if (filePath === '.uipath/studio_metadata.json' || filePath === 'studio_metadata.json') {
        continue;
      }
      if (processedFileIds.has(remoteFile.id)) {
        continue;
      }
      const normalizedRemote = filePath.replace(/\\/g, '/');
      if (!localRemotePaths.has(normalizedRemote)) {
        plan.deleteFiles.push({
          fileId: remoteFile.id,
          path: filePath,
        });
      }
    }

    // Determine folders to create (remote path: source, source/css, etc.)
    for (const folderPath of requiredFolders) {
      if (!remoteFolders.has(folderPath)) {
        plan.createFolders.push({ path: folderPath });
      }
    }

    // Find folders to delete: only under source/dist/ and not required; never delete source/dist itself
    const contentRootPrefix = this.remoteContentRoot + '/';
    for (const [folderPath, folder] of remoteFolders.entries()) {
      if (requiredFolders.has(folderPath)) {
        continue;
      }
      const normalizedRemote = folderPath.replace(/\\/g, '/');
      const isUnderContentRoot = normalizedRemote.startsWith(contentRootPrefix);
      if (isUnderContentRoot && folder.id) {
        plan.deleteFolders.push({
          folderId: folder.id,
          path: folderPath,
        });
      }
    }

    // Sort folders top-down (parent before child)
    plan.createFolders.sort((a, b) => {
      const depthA = a.path.split('/').length;
      const depthB = b.path.split('/').length;
      return depthA - depthB;
    });

    // Sort deleteFolders bottom-up (child before parent) so we delete children first
    plan.deleteFolders.sort((a, b) => {
      const depthA = a.path.split('/').length;
      const depthB = b.path.split('/').length;
      return depthB - depthA; // Reverse order
    });

    return plan;
  }

  /**
   * Compute plan for first push: only uploads and nested folder creation under source/dist/; no updates or deletes.
   * Used when source/dist was just created on remote. Paths in plan use remote path (source/dist, source/dist/css).
   */
  private computeFirstPushPlan(
    localFiles: LocalFile[],
    remoteFolders: Map<string, ProjectFolder>
  ): FileOperationPlan {
    const plan: FileOperationPlan = {
      createFolders: [],
      uploadFiles: [],
      updateFiles: [],
      deleteFiles: [],
      deleteFolders: [],
    };

    const requiredFolders = new Set<string>();

    for (const localFile of localFiles) {
      if (localFile.path === '.uipath/studio_metadata.json' || localFile.path === 'studio_metadata.json') {
        continue;
      }

      const remotePath = this.localPathToRemotePath(localFile.path);
      const remoteParentPath = path.dirname(remotePath);
      const parentPathForPlan = remoteParentPath === '.' ? this.remoteContentRoot : remoteParentPath;

      plan.uploadFiles.push({
        path: localFile.path,
        localFile,
        parentPath: parentPathForPlan,
      });

      const pathParts = parentPathForPlan.split('/');
      let currentPath = '';
      for (const part of pathParts) {
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        requiredFolders.add(currentPath);
      }
    }

    for (const folderPath of requiredFolders) {
      if (!remoteFolders.has(folderPath)) {
        plan.createFolders.push({ path: folderPath });
      }
    }

    plan.createFolders.sort((a, b) => {
      const depthA = a.path.split('/').length;
      const depthB = b.path.split('/').length;
      return depthA - depthB;
    });

    return plan;
  }

  /**
   * Convert FileOperationPlan to StructuralMigration (for old API)
   */
  private convertPlanToMigration(plan: FileOperationPlan): StructuralMigration {
    const migration: StructuralMigration = {
      added_resources: [],
      modified_resources: [],
      deleted_resources: [],
    };

    // Convert upload files to added resources
    for (const fileOp of plan.uploadFiles) {
      migration.added_resources.push({
        content_file_path: fileOp.localFile.absPath,
        parent_path: fileOp.parentPath,
      });
    }

    // Convert update files to modified resources
    for (const fileOp of plan.updateFiles) {
      migration.modified_resources.push({
        id: fileOp.fileId,
        content_file_path: fileOp.localFile.absPath,
      });
    }

    // Convert delete files
    for (const fileOp of plan.deleteFiles) {
      migration.deleted_resources.push(fileOp.fileId);
    }

    return migration;
  }

  private async downloadRemoteFile(fileId: string): Promise<Buffer> {
    const url = this.buildApiUrl(
      API_ENDPOINTS.STUDIO_WEB_DOWNLOAD_FILE
        .replace('{projectId}', this.config.projectId)
        .replace('{fileId}', fileId)
    );

    const response = await fetch(url, {
      method: 'GET',
      headers: createHeaders({
        bearerToken: this.config.envConfig.accessToken,
        tenantId: this.config.envConfig.tenantId,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to download file ${fileId}: ${response.statusText}`);
    }

    return Buffer.from(await response.arrayBuffer());
  }

  /**
   * Prepare metadata file (local only, do not upload)
   */
  private async prepareMetadataFileForPlan(
    plan: FileOperationPlan,
    remoteFiles: Map<string, ProjectFile>
  ): Promise<void> {
    const metadataPath = path.join(this.config.rootDir, '.uipath', 'studio_metadata.json');
    const metadataDir = path.dirname(metadataPath);

    try {
      fs.mkdirSync(metadataDir, { recursive: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw error;
      }
    }

    let metadata: any;
    try {
      const metadataContent = fs.readFileSync(metadataPath, 'utf-8');
      metadata = JSON.parse(metadataContent);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        metadata = {
          schemaVersion: '1.0.0',
          name: this.config.projectId,
          description: '',
          lastPushDate: new Date().toISOString(),
          lastPushAuthor: this.getCurrentUser(),
        };
      } else {
        throw error;
      }
    }

    // Update metadata
    metadata.lastPushDate = new Date().toISOString();
    metadata.lastPushAuthor = this.getCurrentUser();

    // Check if remote metadata exists to increment version
    let remoteMetadata = remoteFiles.get('.uipath/studio_metadata.json') || remoteFiles.get('studio_metadata.json');
    
    if (remoteMetadata) {
      try {
        const remoteContent = await this.downloadRemoteFile(remoteMetadata.id);
        const remoteMetadataObj = JSON.parse(remoteContent.toString('utf-8'));
        
        if (remoteMetadataObj.codeVersion) {
          const versionParts = remoteMetadataObj.codeVersion.split('.');
          if (versionParts.length >= 3) {
            versionParts[2] = String(parseInt(versionParts[2], 10) + 1);
            metadata.codeVersion = versionParts.join('.');
          } else {
            metadata.codeVersion = '0.1.1';
          }
        }
      } catch (error) {
        metadata.codeVersion = '0.1.1';
      }

      // Do not upload studio_metadata.json - it's local metadata only
      // Just update the local file
    } else {
      // Do not upload studio_metadata.json - it's local metadata only.
      // Do not create .uipath on remote (no remote files under it).
    }

    // Write metadata to disk atomically
    const metadataContent = JSON.stringify(metadata, null, 2);
    const tempPath = `${metadataPath}.${process.pid}.${Date.now()}.tmp`;
    try {
      fs.writeFileSync(tempPath, metadataContent, { mode: 0o600 });
      fs.renameSync(tempPath, metadataPath);
    } catch (error) {
      try {
        fs.unlinkSync(tempPath);
      } catch {
        // Ignore cleanup errors
      }
      throw error;
    }
  }

  /**
   * Legacy method - kept for backward compatibility
   */
  private async prepareMetadataFile(
    migration: StructuralMigration,
    remoteFiles: Map<string, ProjectFile>
  ): Promise<void> {
    const metadataPath = path.join(this.config.rootDir, '.uipath', 'studio_metadata.json');
    const metadataDir = path.dirname(metadataPath);

    try {
      fs.mkdirSync(metadataDir, { recursive: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw error;
      }
    }

    let metadata: any;
    try {
      const metadataContent = fs.readFileSync(metadataPath, 'utf-8');
      metadata = JSON.parse(metadataContent);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        metadata = {
          schemaVersion: '1.0.0',
          lastPushDate: new Date().toISOString(),
          lastPushAuthor: this.getCurrentUser(),
          codeVersion: '0.1.0',
        };
      } else {
        throw error;
      }
    }

    // Update metadata
    metadata.lastPushDate = new Date().toISOString();
    metadata.lastPushAuthor = this.getCurrentUser();

    // Check if remote metadata exists to increment version
    let remoteMetadata = remoteFiles.get('.uipath/studio_metadata.json') || remoteFiles.get('studio_metadata.json');
    
    if (remoteMetadata) {
      try {
        const remoteContent = await this.downloadRemoteFile(remoteMetadata.id);
        const remoteMetadataObj = JSON.parse(remoteContent.toString('utf-8'));
        
        if (remoteMetadataObj.codeVersion) {
          const versionParts = remoteMetadataObj.codeVersion.split('.');
          if (versionParts.length >= 3) {
            versionParts[2] = String(parseInt(versionParts[2], 10) + 1);
            metadata.codeVersion = versionParts.join('.');
          } else {
            metadata.codeVersion = '0.1.1';
          }
        }
      } catch (error) {
        metadata.codeVersion = '0.1.1';
      }

      migration.modified_resources.push({
        id: remoteMetadata.id,
        content_string: JSON.stringify(metadata, null, 2),
      });
    } else {
      migration.added_resources.push({
        file_name: 'studio_metadata.json',
        content_string: JSON.stringify(metadata, null, 2),
        parent_path: '.uipath',
      });
    }

    // Write metadata to disk atomically
    const metadataContent = JSON.stringify(metadata, null, 2);
    const tempPath = `${metadataPath}.${process.pid}.${Date.now()}.tmp`;
    try {
      fs.writeFileSync(tempPath, metadataContent, { mode: 0o600 });
      fs.renameSync(tempPath, metadataPath);
    } catch (error) {
      try {
        fs.unlinkSync(tempPath);
      } catch {
        // Ignore cleanup errors
      }
      throw error;
    }
  }

  private getCurrentUser(): string {
    return process.env.USER || process.env.USERNAME || process.env.UIPATH_USER || 'unknown';
  }

  /**
   * Retrieve lock
   * GET /studio_/backend/api/Project/{project_id}/Lock
   * If lock key is null, try creating lock first
   */
  private async retrieveLock(): Promise<LockInfo | null> {
    const url = this.buildApiUrl(
      API_ENDPOINTS.STUDIO_WEB_LOCK.replace('{projectId}', this.config.projectId)
    );

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: createHeaders({
          bearerToken: this.config.envConfig.accessToken,
          tenantId: this.config.envConfig.tenantId,
        }),
      });

      if (response.ok) {
        const lockInfo = await response.json() as LockInfo;
        
        // If lock key is null, try creating lock first (matching Python _put_lock)
        if (!lockInfo.projectLockKey && !lockInfo.solutionLockKey) {
          await this.putLock();
          
          // Try to retrieve lock again after creation
          const retryResponse = await fetch(url, {
            method: 'GET',
            headers: createHeaders({
              bearerToken: this.config.envConfig.accessToken,
              tenantId: this.config.envConfig.tenantId,
            }),
          });
          
          if (retryResponse.ok) {
            return await retryResponse.json() as LockInfo;
          }
        }
        
        return lockInfo;
      }

      return null;
    } catch (error) {
      return null;
    }
  }


  /**
   * Put lock 
   * PUT /studio_/backend/api/Project/{project_id}/Lock/dummy-uuid-Shared?api-version=2
   */
  private async putLock(): Promise<void> {
    const url = this.buildApiUrl(
      `${API_ENDPOINTS.STUDIO_WEB_LOCK.replace('{projectId}', this.config.projectId)}/dummy-uuid-Shared?api-version=2`
    );

    await fetch(url, {
      method: 'PUT',
      headers: createHeaders({
        bearerToken: this.config.envConfig.accessToken,
        tenantId: this.config.envConfig.tenantId,
      }),
    });
  }

  /**
   * Resolve content and filename
   */
  private resolveContentAndFilename(
    content_string: string | undefined,
    content_file_path: string | undefined,
    file_name: string | undefined,
    modified: boolean = false
  ): [Buffer, string | undefined] {
    let contentBytes: Buffer = Buffer.alloc(0);
    let resolvedName: string | undefined = undefined;

    if (content_string !== undefined) {
      contentBytes = Buffer.from(content_string, 'utf-8');
    } else if (content_file_path) {
      try {
        contentBytes = fs.readFileSync(content_file_path);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          throw new Error(`File not found: ${content_file_path}`);
        }
        throw error;
      }
    }

    if (file_name) {
      resolvedName = file_name;
    } else if (content_file_path) {
      resolvedName = path.basename(content_file_path);
    } else if (!modified) {
      throw new Error(
        'Unable to determine filename for multipart upload. ' +
        'When providing inline content (content_string), you must also provide file_name. ' +
        'Alternatively, set content_file_path so the filename can be inferred.'
      );
    }

    return [contentBytes, resolvedName];
  }

  /**
   * Commit migration
   */
  private async commitMigration(migration: StructuralMigration): Promise<void> {
    // Retrieve lock first
    const lockInfo = await this.retrieveLock();
    const lockKey = lockInfo?.projectLockKey || null;

    const url = this.buildApiUrl(
      API_ENDPOINTS.STUDIO_WEB_MIGRATE.replace('{projectId}', this.config.projectId)
    );

    const form = new FormData();
    form.append('DeletedResources', JSON.stringify(migration.deleted_resources));

    // Add added resources
    for (let i = 0; i < migration.added_resources.length; i++) {
      const resource = migration.added_resources[i];
      const [contentBytes, filename] = this.resolveContentAndFilename(
        resource.content_string,
        resource.content_file_path,
        resource.file_name
      );

      form.append(`AddedResources[${i}].Content`, contentBytes, {
        filename: filename,
        contentType: 'application/octet-stream',
      });
      
      if (resource.parent_path) {
        form.append(`AddedResources[${i}].ParentPath`, resource.parent_path);
      }
    }

    // Add modified resources
    for (let i = 0; i < migration.modified_resources.length; i++) {
      const resource = migration.modified_resources[i];
      const [contentBytes] = this.resolveContentAndFilename(
        resource.content_string,
        resource.content_file_path,
        undefined,
        true // modified = true
      );

      // Verify content was read
      if (!contentBytes || contentBytes.length === 0) {
        throw new Error(`Failed to read content for modified resource ${i}: ${resource.content_file_path || 'no path'}`);
      }

      const filename = resource.content_file_path ? path.basename(resource.content_file_path) : 'file';
      form.append(`ModifiedResources[${i}].Content`, contentBytes, {
        filename: filename,
        contentType: 'application/octet-stream',
      });
      
      form.append(`ModifiedResources[${i}].Id`, resource.id);
    }

    const baseHeaders = createHeaders({
      bearerToken: this.config.envConfig.accessToken,
      tenantId: this.config.envConfig.tenantId,
      contentType: undefined,
    });
    
    delete baseHeaders['Content-Type'];
    
    const headers: Record<string, string> = {
      ...baseHeaders,
      ...form.getHeaders(),
    };

    if (lockKey) {
      headers['x-uipath-sw-lockkey'] = lockKey;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: form,
    });

    if (!response.ok) {
      let errorText = '';
      try {
        errorText = await response.text();
      } catch (e) {
        // Ignore
      }
      
      throw new Error(`HTTP ${response.status} error occurred during commit migration${errorText ? `\nAPI Response: ${errorText.substring(0, 500)}` : ''}`);
    }
  }

  private async cleanupEmptyFolders(): Promise<void> {
    // Refresh structure
    const structure = await this.fetchRemoteStructure();
    // Only clean up empty folders inside the source folder; don't touch outer surroundings
    const emptyFolders = this.findEmptyFolders(structure, this.remoteContentRoot);

    if (emptyFolders.length === 0) {
      return;
    }

    // Delete empty folders 
    for (const folder of emptyFolders) {
      if (folder.id) {
        try {
          // GET /studio_/backend/api/Project/{project_id}/FileOperations/Delete/{item_id}
          const url = this.buildApiUrl(
            API_ENDPOINTS.STUDIO_WEB_DELETE_ITEM
              .replace('{projectId}', this.config.projectId)
              .replace('{itemId}', folder.id)
          );

          const response = await fetch(url, {
            method: 'DELETE',
            headers: createHeaders({
              bearerToken: this.config.envConfig.accessToken,
              tenantId: this.config.envConfig.tenantId,
            }),
          });

          // Silently ignore folder deletion errors
          if (!response.ok) {
            // Log but don't fail
          }
        } catch (error) {
          // Log but don't fail on folder deletion errors
        }
      }
    }
  }

  /**
   * Find empty folders in the structure. If rootPath is provided (e.g. "source/dist"), only consider
   * folders under that path (so we don't touch outer surroundings).
   */
  private findEmptyFolders(
    structure: ProjectStructure,
    rootPath?: string
  ): Array<{ id: string; name: string }> {
    const emptyFolders: Array<{ id: string; name: string }> = [];

    const checkFolder = (folder: ProjectFolder): void => {
      for (const subfolder of folder.folders) {
        checkFolder(subfolder);
      }

      if (this.isFolderEmpty(folder) && folder.id) {
        emptyFolders.push({ id: folder.id, name: folder.name });
      }
    };

    if (rootPath) {
      const segments = rootPath.replace(/\\/g, '/').split('/').filter(Boolean);
      let folder: ProjectFolder | undefined = structure.folders.find((f) => f.name === segments[0]);
      for (let i = 1; i < segments.length && folder; i++) {
        folder = folder.folders.find((f) => f.name === segments[i]);
      }
      if (folder) {
        checkFolder(folder);
      }
    } else {
      for (const folder of structure.folders) {
        checkFolder(folder);
      }
    }

    return emptyFolders;
  }

  private isFolderEmpty(folder: ProjectFolder): boolean {
    if (folder.files.length > 0) {
      return false;
    }

    if (folder.folders.length === 0) {
      return true;
    }

    for (const subfolder of folder.folders) {
      if (!this.isFolderEmpty(subfolder)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Transform resource kind (lowercase first letter)
   */
  private transformKind(kind: string): string {
    return kind ? kind[0].toLowerCase() + kind.slice(1) : kind;
  }

  /**
   * Transform resource type (apply mappings and lowercase first letter)
   */
  private transformType(type: string | null): string | null {
    if (!type) {
      return null;
    }

    const typeMappings: Record<string, string> = {
      'text': 'stringAsset',
      'integer': 'integerAsset',
      'bool': 'booleanAsset',
      'credential': 'credentialAsset',
      'secret': 'secretAsset',
      'orchestrator': 'orchestratorBucket',
      'amazon': 'amazonBucket',
      'azure': 'azureBucket',
    };
    
    const lowerType = type.toLowerCase();
    if (lowerType in typeMappings) {
      return typeMappings[lowerType];
    }
    
    return type[0].toLowerCase() + type.slice(1);
  }

  /**
   * Build API URL
   */
  private buildApiUrl(endpoint: string, tenantScoped: boolean = false): string {
    const baseUrl = this.config.envConfig.baseUrl;
    const orgId = this.config.envConfig.orgId;
    if (tenantScoped) {
      const tenantId = this.config.envConfig.tenantId;
      return `${baseUrl}/${orgId}/${tenantId}${endpoint}`;
    }
    return `${baseUrl}/${orgId}${endpoint}`;
  }

  /**
   * Create a folder at project root (API creates only at root).
   */
  private async createFolderAtRoot(name: string): Promise<string | null> {
    const url = this.buildApiUrl(
      API_ENDPOINTS.STUDIO_WEB_CREATE_FOLDER.replace('{projectId}', this.config.projectId)
    );
    const headers = createHeaders({
      bearerToken: this.config.envConfig.accessToken,
      tenantId: this.config.envConfig.tenantId,
      contentType: 'application/json',
    });
    if (this.lockKey) {
      headers['x-uipath-sw-lockkey'] = this.lockKey;
    }
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ name }),
      });
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = (await response.json()) as { id?: string };
          if (data.id) return data.id;
        }
        return null;
      }
      if (response.status === 409) {
        return null; // exists; id will come from refresh or existing map
      }
      const err = await response.text().catch(() => '');
      throw new Error(`Create folder '${name}' failed: ${response.status} ${err.slice(0, 80)}`);
    } catch (e) {
      this.config.logger.log(chalk.yellow(`Create folder failed: ${name} — ${e instanceof Error ? e.message : 'Unknown error'}`));
      return null;
    }
  }

  /**
   * Move a folder into a new parent (Folder/Move API).
   */
  private async moveFolder(folderId: string, parentId: string): Promise<void> {
    const endpoint = API_ENDPOINTS.STUDIO_WEB_MOVE_FOLDER.replace('{projectId}', this.config.projectId);
    const baseUrl = this.buildApiUrl(endpoint);
    const url = `${baseUrl}?api-version=2`;
    const headers = createHeaders({
      bearerToken: this.config.envConfig.accessToken,
      tenantId: this.config.envConfig.tenantId,
      contentType: 'application/json',
    });
    if (this.lockKey) {
      headers['x-uipath-sw-lockkey'] = this.lockKey;
    }
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ folderId, parentId }),
    });
    if (!response.ok) {
      const err = await response.text().catch(() => '');
      throw new Error(`Move folder failed: ${response.status} ${response.statusText} ${err.slice(0, 80)}`);
    }
  }

  /**
   * Phase 4: Create a single folder and return its ID
   * Creates folders synchronously to ensure proper parent-child relationships
   */
  private async createSingleFolder(
    folderPath: string,
    folderIdMap: Map<string, string>
  ): Promise<string | null> {
    const url = this.buildApiUrl(
      API_ENDPOINTS.STUDIO_WEB_CREATE_FOLDER.replace('{projectId}', this.config.projectId)
    );

    try {
      // Split path into parent and name
      const pathParts = folderPath.split('/').filter(p => p);
      const folderName = pathParts[pathParts.length - 1];
      const parentPath = pathParts.length > 1 
        ? pathParts.slice(0, -1).join('/')
        : null;

      const payload: Record<string, any> = {
        name: folderName,
      };

      // For nested folders, API requires parentId (UUID). Never use parentPath for subfolders.
      // Parents are always created first (sorted top-down), so we must have parentId.
      if (parentPath && folderIdMap.has(parentPath)) {
        payload.parentId = folderIdMap.get(parentPath);
      }
      // Root-level folder (e.g. "dist"): no parentId/parentPath

      const headers = createHeaders({
        bearerToken: this.config.envConfig.accessToken,
        tenantId: this.config.envConfig.tenantId,
        contentType: 'application/json',
      });

      if (this.lockKey) {
        headers['x-uipath-sw-lockkey'] = this.lockKey;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          try {
            const responseData = await response.json() as { id?: string };
            if (responseData.id) {
              return responseData.id;
            }
          } catch (parseError) {
            const responseText = await response.text();
            this.config.logger.log(chalk.yellow(`Could not parse folder creation response for ${folderPath}`));
          }
        }
        // If response is OK but no ID in JSON, folder was created - we'll get ID from refresh
        return null;
      } else if (response.status === 409) {
        // Folder already exists - get ID from remote structure
        const remoteFolders = this.getRemoteFoldersMap(this.projectStructure!);
        const existingFolder = remoteFolders.get(folderPath);
        if (existingFolder?.id) {
          return existingFolder.id;
        }
        // Will be captured in refresh
        return null;
      } else {
        const errorText = await response.text().catch(() => '');
        throw new Error(`Failed to create folder '${folderPath}': ${response.status} ${response.statusText}${errorText ? ` - ${errorText.substring(0, 100)}` : ''}`);
      }
    } catch (error) {
      this.config.logger.log(chalk.yellow(`Could not create folder ${folderPath}: ${error instanceof Error ? error.message : 'Unknown error'}`));
      return null;
    }
  }

  /**
   * Phase 5: Upload a new file
   */
  private async createFile(
    filePath: string,
    localFile: LocalFile,
    parentId: string | null,
    parentPath: string | null
  ): Promise<void> {
    const url = this.buildApiUrl(
      API_ENDPOINTS.STUDIO_WEB_CREATE_FILE.replace('{projectId}', this.config.projectId)
    );

    const form = new FormData();
    // API expects 'file' field, not 'Content'
    form.append('file', localFile.content, {
      filename: path.basename(filePath),
      contentType: 'application/octet-stream',
    });

    // Use parentId if available (existing folder), otherwise use parentPath (API will create folder)
    if (parentId) {
      form.append('parentId', parentId);
    } else if (parentPath) {
      // Fallback to parentPath - API should create the folder automatically
      form.append('parentPath', parentPath);
    }

    const baseHeaders = createHeaders({
      bearerToken: this.config.envConfig.accessToken,
      tenantId: this.config.envConfig.tenantId,
      contentType: undefined,
    });

    delete baseHeaders['Content-Type'];

    if (this.lockKey) {
      baseHeaders['x-uipath-sw-lockkey'] = this.lockKey;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...baseHeaders,
        ...form.getHeaders(),
      },
      body: form,
    });

    if (!response.ok) {
      throw new Error(`Failed to upload file '${filePath}': ${response.status} ${response.statusText}`);
    }
  }

  /**
   * Phase 5: Update an existing file
   */
  private async updateFile(
    filePath: string,
    localFile: LocalFile,
    fileId: string
  ): Promise<void> {
    const url = this.buildApiUrl(
      API_ENDPOINTS.STUDIO_WEB_UPDATE_FILE
        .replace('{projectId}', this.config.projectId)
        .replace('{fileId}', fileId)
    );

    const form = new FormData();
    // API expects 'file' field, not 'Content'
    form.append('file', localFile.content, {
      filename: path.basename(filePath),
      contentType: 'application/octet-stream',
    });

    const baseHeaders = createHeaders({
      bearerToken: this.config.envConfig.accessToken,
      tenantId: this.config.envConfig.tenantId,
      contentType: undefined,
    });

    delete baseHeaders['Content-Type'];

    if (this.lockKey) {
      baseHeaders['x-uipath-sw-lockkey'] = this.lockKey;
    }

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        ...baseHeaders,
        ...form.getHeaders(),
      },
      body: form,
    });

    if (!response.ok) {
      throw new Error(`Failed to update file '${filePath}': ${response.status} ${response.statusText}`);
    }
  }

  /**
   * Phase 5: Execute file operations in parallel (with worker pool)
   */
  private async executeFileOperations(plan: FileOperationPlan): Promise<void> {
    const WORKER_POOL_SIZE = 8;
    const allOperations: Array<{ execute: () => Promise<void>; path: string }> = [];

    // Add upload operations
    for (const fileOp of plan.uploadFiles) {
      allOperations.push({
        execute: () => this.createFile(fileOp.path, fileOp.localFile, fileOp.parentId || null, fileOp.parentPath),
        path: fileOp.path,
      });
    }

    // Add update operations
    for (const fileOp of plan.updateFiles) {
      allOperations.push({
        execute: () => this.updateFile(fileOp.path, fileOp.localFile, fileOp.fileId),
        path: fileOp.path,
      });
    }

    if (allOperations.length === 0) {
      return;
    }

    // Execute in batches with worker pool
    for (let i = 0; i < allOperations.length; i += WORKER_POOL_SIZE) {
      const batch = allOperations.slice(i, i + WORKER_POOL_SIZE);
      const results = await Promise.allSettled(batch.map(op => op.execute()));

      // Check for failures
      for (let j = 0; j < results.length; j++) {
        const result = results[j];
        if (result.status === 'rejected') {
          const operation = batch[j];
          this.config.logger.log(chalk.red(`Failed: ${operation.path} — ${result.reason}`));
        }
      }
    }
  }

  /**
   * Phase 6: Delete orphaned files
   */
  private async deleteFiles(files: Array<{ fileId: string; path: string }>): Promise<void> {
    if (files.length === 0) {
      return;
    }

    for (const file of files) {
      try {
        const url = this.buildApiUrl(
          API_ENDPOINTS.STUDIO_WEB_DELETE_ITEM
            .replace('{projectId}', this.config.projectId)
            .replace('{itemId}', file.fileId)
        );

        const headers = createHeaders({
          bearerToken: this.config.envConfig.accessToken,
          tenantId: this.config.envConfig.tenantId,
        });

        if (this.lockKey) {
          headers['x-uipath-sw-lockkey'] = this.lockKey;
        }

        const response = await fetch(url, {
          method: 'DELETE',
          headers,
        });

        if (!response.ok) {
          throw new Error(`Failed to delete file '${file.path}': ${response.status} ${response.statusText}`);
        }
      } catch (error) {
        this.config.logger.log(chalk.yellow(`Could not delete file ${file.path}: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    }
  }

  /**
   * Delete orphaned folders (no longer exist locally). (folders that no longer exist locally)
   */
  private async deleteFolders(folders: Array<{ folderId: string; path: string }>): Promise<void> {
    if (folders.length === 0) {
      return;
    }

    for (const folder of folders) {
      try {
        const url = this.buildApiUrl(
          API_ENDPOINTS.STUDIO_WEB_DELETE_ITEM
            .replace('{projectId}', this.config.projectId)
            .replace('{itemId}', folder.folderId)
        );

        const headers = createHeaders({
          bearerToken: this.config.envConfig.accessToken,
          tenantId: this.config.envConfig.tenantId,
        });

        if (this.lockKey) {
          headers['x-uipath-sw-lockkey'] = this.lockKey;
        }

        const response = await fetch(url, {
          method: 'DELETE',
          headers,
        });

        if (!response.ok) {
          throw new Error(`Failed to delete folder '${folder.path}': ${response.status} ${response.statusText}`);
        }
      } catch (error) {
        this.config.logger.log(chalk.yellow(`Could not delete folder ${folder.path}: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    }
  }

  /**
   * Get solution ID from project ID
   */
  private async getSolutionId(): Promise<string> {
    const url = this.buildApiUrl(
      API_ENDPOINTS.STUDIO_WEB_PROJECT.replace('{projectId}', this.config.projectId)
    );

    const response = await fetch(url, {
      method: 'GET',
      headers: createHeaders({
        bearerToken: this.config.envConfig.accessToken,
        tenantId: this.config.envConfig.tenantId,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to get solution ID: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as { solutionId: string };
    return data.solutionId;
  }

  /**
   * Find resource in catalog by type, name, and optional folder path
   * If folderPath is empty, searches tenant-scoped resources
   */
  private async findResourceInCatalog(
    resourceType: string,
    name: string,
    folderPath: string
  ): Promise<Resource> {
    const resourceTypeMap: Record<string, string> = {
      asset: 'asset',
      process: 'process',
      bucket: 'bucket',
      index: 'index',
      app: 'app',
      connection: 'connection',
      queue: 'queue',
    };

    const apiResourceType = resourceTypeMap[resourceType.toLowerCase()];
    if (!apiResourceType) {
      throw new Error(`Unknown resource type: ${resourceType}`);
    }

    const url = this.buildApiUrl(
      API_ENDPOINTS.RESOURCE_CATALOG_ENTITIES.replace('{resourceType}', apiResourceType),
      true // tenant-scoped
    );

    const params = new URLSearchParams({
      name: name,
      skip: '0',
      take: '100',
    });

    // Only add folderKey if folderPath is provided (otherwise search tenant-scoped)
    if (folderPath) {
      const folderKey = await this.getFolderKeyFromPath(folderPath);
      if (folderKey) {
        params.append('folderKey', folderKey);
      }
    }

    const fullUrl = `${url}?${params.toString()}`;
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: createHeaders({
        bearerToken: this.config.envConfig.accessToken,
        tenantId: this.config.envConfig.tenantId,
        additionalHeaders: {
          'Accept': 'application/json',
        },
      }),
    });

    // Get response text first to check if it's JSON or HTML
    const responseText = await response.text();
    const contentType = response.headers.get('content-type') || '';

    if (!response.ok) {
      throw new Error(`Failed to search resource catalog: ${response.status} ${response.statusText}`);
    }

    // Check if response is HTML (error page) instead of JSON
    if (!contentType.includes('application/json') && responseText.trim().startsWith('<!DOCTYPE')) {
      throw new Error(`API returned HTML error page instead of JSON. Status: ${response.status}`);
    }

    let data: { value?: any[]; items?: any[] };
    try {
      data = JSON.parse(responseText);
    } catch (error) {
      throw new Error(`Invalid JSON response from API: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    const items = data.value || data.items || [];

    for (const item of items) {
      if (item.name === name) {
        const itemFolders = item.folders || [];
        
        // If folderPath is empty, accept any folder (tenant-scoped search)
        if (!folderPath && itemFolders.length > 0) {
          return {
            resource_key: item.entityKey || item.resource_key,
            name: item.name,
            resource_type: item.entityType || item.resource_type,
            resource_sub_type: item.entitySubType || item.resource_sub_type || null,
              folders: itemFolders.map((f: any) => this.mapFolder(f)),
          };
        }
        
        // If folderPath is provided, match by folder path
        for (const folder of itemFolders) {
          if (folder.path === folderPath) {
            return {
              resource_key: item.entityKey || item.resource_key,
              name: item.name,
              resource_type: item.entityType || item.resource_type,
              resource_sub_type: item.entitySubType || item.resource_sub_type || null,
              folders: itemFolders.map((f: any) => this.mapFolder(f)),
            };
          }
        }
      }
    }

    const folderInfo = folderPath ? ` at folder path '${folderPath}'` : ' (tenant-scoped)';
    throw new Error(`Resource '${name}' of type '${resourceType}' not found${folderInfo}`);
  }

  /**
   * Map folder object from API response to internal format
   */
  private mapFolder(f: any): { folder_key: string; fully_qualified_name: string; path: string } {
    // The API might return folder key as 'key', 'folderKey', or 'folder_key'
    // Also, if path is a UUID, it might be the folder key
    const folderKey = f.key || f.folderKey || f.folder_key || (f.path && f.path.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i) ? f.path : '');
    return {
      folder_key: folderKey,
      fully_qualified_name: f.fullyQualifiedName || f.fully_qualified_name || '',
      path: f.path || '',
    };
  }

  /**
   * Get folder key from folder path
   * Returns null to search tenant-scoped (simplified implementation)
   */
  private async getFolderKeyFromPath(folderPath: string): Promise<string | null> {
    return null;
  }

  /**
   * Retrieve connection by key
   */
  private async retrieveConnection(connectionKey: string): Promise<Connection> {
    const url = this.buildApiUrl(
      API_ENDPOINTS.CONNECTIONS_RETRIEVE.replace('{connectionKey}', connectionKey)
    );

    const response = await fetch(url, {
      method: 'GET',
      headers: createHeaders({
        bearerToken: this.config.envConfig.accessToken,
        tenantId: this.config.envConfig.tenantId,
      }),
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Connection '${connectionKey}' not found`);
      }
      throw new Error(`Failed to retrieve connection: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as {
      Key?: string;
      Name?: string;
      Folder?: {
        Id?: string;
        Key?: string;
        FullyQualifiedName?: string;
        Path?: string;
      };
    };
    return {
      key: data.Key || connectionKey,
      name: data.Name || connectionKey,
      folder: data.Folder ? {
        key: data.Folder.Id || data.Folder.Key || '',
        fullyQualifiedName: data.Folder.FullyQualifiedName || '',
        path: data.Folder.Path || '',
      } : null,
    };
  }

  /**
   * Create referenced resource
   */
  private async createReferencedResource(
    solutionId: string,
    request: ReferencedResourceRequest
  ): Promise<ReferencedResourceResponse> {
    // Python uses scoped="org" but includes tenant ID in headers
    const baseUrl = this.buildApiUrl(
      API_ENDPOINTS.STUDIO_WEB_CREATE_REFERENCED_RESOURCE.replace('{solutionId}', solutionId),
      false // org-scoped (matching Python)
    );
    
    // Add query parameters: api-version=2&forceUpdate=true
    const url = `${baseUrl}?api-version=2&forceUpdate=true`;

    const payload: Record<string, any> = {
      key: request.key,
      kind: request.kind,
      folder: {
        folderKey: request.folder.folder_key,
        fullyQualifiedName: request.folder.fully_qualified_name,
        path: request.folder.path,
      },
    };
    
    if (request.type != null) {
      payload.type = request.type;
    }

    // Get lock key for the header
    const lockInfo = await this.retrieveLock();
    let lockKey = lockInfo?.projectLockKey || null;

    // Format lock key with folder name (matching curl: lockKey-folderName)
    if (lockKey && request.folder.fully_qualified_name) {
      lockKey = `${lockKey}-${request.folder.fully_qualified_name}`;
    }

    const headers = createHeaders({
      bearerToken: this.config.envConfig.accessToken,
      contentType: 'application/json',
    });

    // Use exact header names as specified: x-uipath-tenantid and x-uipath-sw-lockkey
    headers['x-uipath-tenantid'] = this.config.envConfig.tenantId;

    // Add lock key header if available
    if (lockKey) {
      headers['x-uipath-sw-lockkey'] = lockKey;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Failed to create referenced resource: ${response.status} ${response.statusText}`;
      try {
        const errorBody = JSON.parse(errorText);
        if (errorBody.Detail || errorBody.Message) {
          errorMessage += ` - ${errorBody.Detail || errorBody.Message}`;
        }
      } catch {
        // Ignore JSON parse errors, use default message
      }
      throw new Error(errorMessage);
    }

    const data = await response.json() as {
      status?: 'ADDED' | 'UNCHANGED' | 'UPDATED';
      resource?: Record<string, any>;
      saved?: boolean;
    };
    return {
      status: (data.status || 'UNCHANGED') as 'ADDED' | 'UNCHANGED' | 'UPDATED',
      resource: data.resource || {},
      saved: data.saved || false,
    };
  }
}

// Types for bindings.json
interface PropertyDefinition {
  defaultValue: string;
  isExpression: boolean;
  displayName: string;
}

interface BindingResource {
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

interface Bindings {
  version: string;
  resources: BindingResource[];
}

// Types for resource catalog
interface ResourceFolder {
  folder_key: string;
  fully_qualified_name: string;
  path: string;
}

interface Resource {
  resource_key: string;
  name: string;
  resource_type: string;
  resource_sub_type: string | null;
  folders: ResourceFolder[];
}

// Types for connections
interface ConnectionFolder {
  key: string;
  fullyQualifiedName: string;
  path: string;
}

interface Connection {
  key: string;
  name: string;
  folder: ConnectionFolder | null;
}

// Types for referenced resources
interface ReferencedResourceFolder {
  folder_key: string;
  fully_qualified_name: string;
  path: string;
}

interface ReferencedResourceRequest {
  key: string;
  kind: string;
  type: string | null;
  folder: ReferencedResourceFolder;
}

interface ReferencedResourceResponse {
  status: 'ADDED' | 'UNCHANGED' | 'UPDATED';
  resource: Record<string, any>;
  saved: boolean;
}
