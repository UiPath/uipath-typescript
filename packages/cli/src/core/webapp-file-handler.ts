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

// Structural Migration
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

  constructor(config: WebAppPushConfig) {
    this.config = config;
  }

  async push(): Promise<void> {
    try {
      // Fetch remote structure
      this.config.logger.log(chalk.gray('\n📥 Fetching remote structure...'));
      this.projectStructure = await this.fetchRemoteStructure();

      // Collect local files
      this.config.logger.log(chalk.gray('Collecting local files...'));
      const localFiles = this.collectLocalFiles();
      this.config.logger.log(chalk.gray(`Collected ${localFiles.length} local files`));

      // Get remote files as a flat map
      const remoteFiles = this.getRemoteFilesMap(this.projectStructure);

      // Process file uploads and build migration
      this.config.logger.log(chalk.gray('Computing diff...'));
      const migration = await this.processFileUploads(localFiles, remoteFiles);
      this.config.logger.log(chalk.gray(`Diff: ${migration.added_resources.length} add, ${migration.modified_resources.length} update, ${migration.deleted_resources.length} delete`));

      // Prepare metadata file
      await this.prepareMetadataFile(migration, remoteFiles);

      // Commit migration
      if (migration.added_resources.length > 0 || migration.modified_resources.length > 0 || migration.deleted_resources.length > 0) {
        await this.commitMigration(migration);
      }

      // Cleanup empty folders
      await this.cleanupEmptyFolders();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Import referenced resources from bindings.json
   */
  public async importReferencedResources(ignoreResources: boolean = false): Promise<void> {
    if (ignoreResources) {
      return;
    }

    this.config.logger.log(chalk.blue('\n📦 Importing referenced resources to Studio Web project...'));

    const bindingsPath = path.join(this.config.rootDir, 'bindings.json');
    
    let bindings: Bindings;
    try {
      const bindingsContent = fs.readFileSync(bindingsPath, 'utf-8');
      bindings = JSON.parse(bindingsContent);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        this.config.logger.log(chalk.yellow('⚠️  bindings.json not found, skipping resource import'));
        return;
      }
      this.config.logger.log(chalk.red(`❌ Failed to parse bindings.json: ${error instanceof Error ? error.message : 'Unknown error'}`));
      return;
    }

    if (!bindings.resources || bindings.resources.length === 0) {
      this.config.logger.log(chalk.gray('No resources found in bindings.json'));
      return;
    }

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
            this.config.logger.log(chalk.yellow(`⚠️  Connection with key '${connectionKey}' of type '${connectorName}' was not found and will not be added to the solution.`));
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
            this.config.logger.log(chalk.yellow(`⚠️  Resource '${resourceName}' of type '${resourceType}'${folderInfo} was not found and will not be added to the solution.`));
            resourcesNotFound++;
            continue;
          }
        }

        if (!foundResource || foundResource.folders.length === 0) {
          this.config.logger.log(chalk.yellow(`⚠️  Resource '${resourceName}' of type '${resourceType}' was not found and will not be added to the solution.`));
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

        const resourceDetails = `(kind = ${chalk.cyan(foundResource.resource_type)}, type = ${chalk.cyan(foundResource.resource_sub_type || 'N/A')})`;

        switch (response.status) {
          case 'ADDED':
            this.config.logger.log(chalk.green(`✅ Created reference for resource: ${chalk.cyan(resourceName)} ${resourceDetails}`));
            resourcesCreated++;
            break;
          case 'UNCHANGED':
            this.config.logger.log(chalk.gray(`ℹ️  Resource reference already exists (${chalk.yellow('unchanged')}): ${chalk.cyan(resourceName)} ${resourceDetails}`));
            resourcesUnchanged++;
            break;
          case 'UPDATED':
            this.config.logger.log(chalk.blue(`ℹ️  Resource reference already exists (${chalk.blue('updated')}): ${chalk.cyan(resourceName)} ${resourceDetails}`));
            resourcesUpdated++;
            break;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.config.logger.log(chalk.red(`❌ Error processing resource '${resourceName}': ${errorMessage}`));
        resourcesNotFound++;
      }
    }

    const totalResources = resourcesCreated + resourcesUnchanged + resourcesNotFound + resourcesUpdated;
    this.config.logger.log(
      chalk.blue(`\n📊 Resource import summary: ${totalResources} total resources - `) +
      chalk.green(`${resourcesCreated} created, `) +
      chalk.blue(`${resourcesUpdated} updated, `) +
      chalk.yellow(`${resourcesUnchanged} unchanged, `) +
      chalk.red(`${resourcesNotFound} not found`)
    );
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

    // Process folders
    for (const folder of structure.folders) {
      collectFiles(folder);
    }

    return files;
  }

  private async processFileUploads(
    localFiles: LocalFile[],
    remoteFiles: Map<string, ProjectFile>
  ): Promise<StructuralMigration> {
    const migration: StructuralMigration = {
      added_resources: [],
      modified_resources: [],
      deleted_resources: [],
    };

    const processedFileIds = new Set<string>();

    // Process local files
    for (const localFile of localFiles) {
      // Try exact path match first
      let remoteFile = remoteFiles.get(localFile.path);
      
      // If not found, try alternative path formats to handle different storage locations
      if (!remoteFile) {
        const normalizedPath = localFile.path.replace(/\\/g, '/');
        remoteFile = remoteFiles.get(normalizedPath);
        
        // Try without bundlePath prefix (files might be stored at root)
        if (!remoteFile && localFile.path.startsWith(this.config.bundlePath + '/')) {
          const pathWithoutPrefix = localFile.path.substring(this.config.bundlePath.length + 1);
          remoteFile = remoteFiles.get(pathWithoutPrefix);
        }
        
        // Try with bundlePath prefix (files might be stored in folder)
        if (!remoteFile && !localFile.path.startsWith(this.config.bundlePath + '/')) {
          const pathWithPrefix = `${this.config.bundlePath}/${localFile.path}`;
          remoteFile = remoteFiles.get(pathWithPrefix);
        }
      }

      if (remoteFile) {
        processedFileIds.add(remoteFile.id);

        // Download remote file to compare
        try {
          const remoteContent = await this.downloadRemoteFile(remoteFile.id);
          const remoteHash = this.computeNormalizedHash(remoteContent);
          
          // Only update if content differs
          if (localFile.hash !== remoteHash) {
            migration.modified_resources.push({
              id: remoteFile.id,
              content_file_path: localFile.absPath,
            });
            this.config.logger.log(chalk.yellow(`Updating '${localFile.path}'`));
          }
        } catch (error) {
          // If comparison fails, proceed with update
          migration.modified_resources.push({
            id: remoteFile.id,
            content_file_path: localFile.absPath,
          });
        }
      } else {
        // New file - determine parent path
        const parentPath = path.dirname(localFile.path);
        const parentPathNormalized = parentPath === '.' ? null : parentPath;

        migration.added_resources.push({
          content_file_path: localFile.absPath,
          parent_path: parentPathNormalized,
        });
        this.config.logger.log(chalk.cyan(`Uploading '${localFile.path}'`));
      }
    }

    // Find deleted files
    for (const [filePath, remoteFile] of remoteFiles.entries()) {
      if (filePath === '.uipath/studio_metadata.json' || filePath === 'studio_metadata.json') {
        continue;
      }
      
      if (filePath.startsWith(this.config.bundlePath + '/') && !processedFileIds.has(remoteFile.id)) {
        migration.deleted_resources.push(remoteFile.id);
        this.config.logger.log(chalk.red(`Deleting '${filePath}'`));
      }
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
    const emptyFolders = this.findEmptyFolders(structure);

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

  private findEmptyFolders(structure: ProjectStructure): Array<{ id: string; name: string }> {
    const emptyFolders: Array<{ id: string; name: string }> = [];

    const checkFolder = (folder: ProjectFolder): void => {
      for (const subfolder of folder.folders) {
        checkFolder(subfolder);
      }

      if (this.isFolderEmpty(folder) && folder.id) {
        emptyFolders.push({ id: folder.id, name: folder.name });
      }
    };

    for (const folder of structure.folders) {
      checkFolder(folder);
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
