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
      this.config.logger.log(chalk.gray(`Diff computed: ${migration.added_resources.length} add, ${migration.modified_resources.length} update, ${migration.deleted_resources.length} delete`));

      // Prepare metadata file
      this.config.logger.log(chalk.gray('Preparing metadata file...'));
      await this.prepareMetadataFile(migration, remoteFiles);
      this.config.logger.log(chalk.gray('Metadata file prepared'));

      // Commit migration
      if (migration.added_resources.length > 0 || migration.modified_resources.length > 0 || migration.deleted_resources.length > 0) {
        this.config.logger.log(chalk.gray('Committing migration...'));
        await this.commitMigration(migration);
        this.config.logger.log(chalk.gray('Migration committed'));
      } else {
        this.config.logger.log(chalk.gray('No changes to commit'));
      }

      // Cleanup empty folders
      this.config.logger.log(chalk.gray('Cleaning up empty folders...'));
      await this.cleanupEmptyFolders();
      this.config.logger.log(chalk.gray('Cleanup completed'));
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

    // Read bindings.json
    const bindingsPath = path.join(this.config.rootDir, 'bindings.json');
    if (!fs.existsSync(bindingsPath)) {
      this.config.logger.log(chalk.yellow('⚠️  bindings.json not found, skipping resource import'));
      return;
    }

    let bindings: Bindings;
    try {
      const bindingsContent = fs.readFileSync(bindingsPath, 'utf-8');
      bindings = JSON.parse(bindingsContent);
    } catch (error) {
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
          // Handle other resources (asset, process, bucket, index, app)
          const nameResourceValue = bindingsResource.value?.name;
          const folderPathResourceValue = bindingsResource.value?.folderPath;

          if (!folderPathResourceValue) {
            // Guardrail resource, nothing to import
            continue;
          }

          if (!nameResourceValue) {
            continue;
          }

          resourceName = nameResourceValue.defaultValue;
          folderPath = folderPathResourceValue.defaultValue;

          // Find resource in catalog
          try {
            foundResource = await this.findResourceInCatalog(resourceType, resourceName, folderPath);
          } catch (error) {
            // Resource not found
            this.config.logger.log(chalk.yellow(`⚠️  Resource '${resourceName}' of type '${resourceType}' at folder path '${folderPath}' was not found and will not be added to the solution.`));
            resourcesNotFound++;
            continue;
          }
        }

        if (!foundResource || foundResource.folders.length === 0) {
          this.config.logger.log(chalk.yellow(`⚠️  Resource '${resourceName}' of type '${resourceType}' was not found and will not be added to the solution.`));
          resourcesNotFound++;
          continue;
        }

        // Create referenced resource
        const folder = foundResource.folders[0];
        const referencedResourceRequest: ReferencedResourceRequest = {
          key: foundResource.resource_key,
          kind: foundResource.resource_type,
          type: foundResource.resource_sub_type || null,
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
        this.config.logger.log(chalk.red(`❌ Error processing resource '${resourceName}': ${error instanceof Error ? error.message : 'Unknown error'}`));
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
    
    // Collect files from dist/ recursively
    const distPath = path.join(this.config.rootDir, this.config.bundlePath);
    if (fs.existsSync(distPath)) {
      this.collectFilesRecursive(distPath, distPath, files);
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
          path: relPath.replace(/\\/g, '/'), // Normalize path separators
          absPath: fullPath,
          hash: this.computeNormalizedHash(content),
          content,
        });
      }
    }
  }

  /**
   * Compute normalized hash
   */
  private computeNormalizedHash(content: Buffer): string {
    // Normalize line endings: convert \r\n to \n, then \r to \n
    const normalized = content.toString('utf-8')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n');
    
    return crypto.createHash('sha256').update(normalized, 'utf-8').digest('hex');
  }

  private async fetchRemoteStructure(): Promise<ProjectStructure> {
    // Matching Python: /studio_/backend/api/Project/{project_id}/FileOperations/Structure
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
        // Project structure doesn't exist - create lock and return empty structure (matching Python)
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
      const remoteFile = remoteFiles.get(localFile.path);

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
          } else {
            this.config.logger.log(chalk.gray(`File '${localFile.path}' is up to date`));
          }
        } catch (error) {
          // If comparison fails, proceed with update
          migration.modified_resources.push({
            id: remoteFile.id,
            content_file_path: localFile.absPath,
          });
          this.config.logger.log(chalk.yellow(`Updating '${localFile.path}' (comparison failed)`));
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
      // Skip metadata file - handled separately
      if (filePath === '.uipath/studio_metadata.json') {
        continue;
      }
      
      // Only delete files in the bundle path
      if (filePath.startsWith(this.config.bundlePath + '/')) {
        if (!processedFileIds.has(remoteFile.id)) {
          migration.deleted_resources.push(remoteFile.id);
          this.config.logger.log(chalk.red(`Deleting '${filePath}'`));
        }
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

    if (!fs.existsSync(metadataDir)) {
      fs.mkdirSync(metadataDir, { recursive: true });
    }

    let metadata: any;
    
    if (fs.existsSync(metadataPath)) {
      metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
    } else {
      metadata = {
        schemaVersion: '1.0.0',
        lastPushDate: new Date().toISOString(),
        lastPushAuthor: this.getCurrentUser(),
        codeVersion: '0.1.0',
      };
    }

    // Update metadata
    metadata.lastPushDate = new Date().toISOString();
    metadata.lastPushAuthor = this.getCurrentUser();

    // Check if remote metadata exists to increment version
    const remoteMetadata = remoteFiles.get('.uipath/studio_metadata.json');
    if (remoteMetadata) {
      try {
        const remoteContent = await this.downloadRemoteFile(remoteMetadata.id);
        const remoteMetadataObj = JSON.parse(remoteContent.toString('utf-8'));
        
        if (remoteMetadataObj.codeVersion) {
          const versionParts = remoteMetadataObj.codeVersion.split('.');
          if (versionParts.length >= 3) {
            // Increment patch version (0.1.0 -> 0.1.1)
            versionParts[2] = String(parseInt(versionParts[2], 10) + 1);
            metadata.codeVersion = versionParts.join('.');
          } else {
            metadata.codeVersion = '0.1.1';
          }
        }
      } catch (error) {
        // If we can't get remote version, use default
        metadata.codeVersion = '0.1.1';
      }

      // Update existing metadata file
      migration.modified_resources.push({
        id: remoteMetadata.id,
        content_string: JSON.stringify(metadata, null, 2),
      });
    } else {
      // Add new metadata file
      migration.added_resources.push({
        file_name: 'studio_metadata.json',
        content_string: JSON.stringify(metadata, null, 2),
        parent_path: '.uipath',
      });
    }

    // Write metadata to disk
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
  }

  private getCurrentUser(): string {
    // Try to get from environment (matching Python get_author_from_token_or_toml)
    return process.env.USER || process.env.USERNAME || process.env.UIPATH_USER || 'unknown';
  }

  /**
   * Retrieve lock
   * GET /studio_/backend/api/Project/{project_id}/Lock
   * If lock key is null, try creating lock first
   */
  private async retrieveLock(): Promise<LockInfo | null> {
    // Matching Python: /studio_/backend/api/Project/{project_id}/Lock
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
        this.config.logger.log(chalk.gray(`   Lock retrieved: ${JSON.stringify(lockInfo).substring(0, 100)}`));
        
        // If lock key is null, try creating lock first (matching Python _put_lock)
        if (!lockInfo.projectLockKey && !lockInfo.solutionLockKey) {
          this.config.logger.log(chalk.yellow(`   Lock key is null, attempting to create lock...`));
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
            const newLockInfo = await retryResponse.json() as LockInfo;
            this.config.logger.log(chalk.gray(`   Lock after creation: ${JSON.stringify(newLockInfo).substring(0, 100)}`));
            return newLockInfo;
          }
        }
        
        return lockInfo;
      }

      this.config.logger.log(chalk.yellow(`   Lock retrieval failed: ${response.status} ${response.statusText}`));
      return null;
    } catch (error) {
      this.config.logger.log(chalk.yellow(`   Lock retrieval error: ${error instanceof Error ? error.message : 'Unknown'}`));
      return null;
    }
  }


  /**
   * Put lock 
   * PUT /studio_/backend/api/Project/{project_id}/Lock/dummy-uuid-Shared?api-version=2
   */
  private async putLock(): Promise<void> {
    // Matching Python: /studio_/backend/api/Project/{project_id}/Lock/dummy-uuid-Shared?api-version=2
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
      if (fs.existsSync(content_file_path)) {
        contentBytes = fs.readFileSync(content_file_path);
      } else {
        throw new Error(`File not found: ${content_file_path}`);
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
   * POST /studio_/backend/api/Project/{project_id}/FileOperations/StructuralMigration
   */
  private async commitMigration(migration: StructuralMigration): Promise<void> {
    // Retrieve lock first
    this.config.logger.log(chalk.gray('Retrieving lock...'));
    const lockInfo = await this.retrieveLock();
    const lockKey = lockInfo?.projectLockKey || null;
    
    if (lockKey) {
      this.config.logger.log(chalk.gray(`Lock retrieved: ${lockKey.substring(0, 20)}...`));
    } else {
      this.config.logger.log(chalk.yellow('No lock key available - proceeding without lock'));
    }

    // : /studio_/backend/api/Project/{project_id}/FileOperations/StructuralMigration
    const url = this.buildApiUrl(
      API_ENDPOINTS.STUDIO_WEB_MIGRATE.replace('{projectId}', this.config.projectId)
    );
    
    this.config.logger.log(chalk.gray(`\n📤 Committing migration:`));
    this.config.logger.log(chalk.gray(`   URL: ${url}`));
    this.config.logger.log(chalk.gray(`   Added: ${migration.added_resources.length}`));
    this.config.logger.log(chalk.gray(`   Modified: ${migration.modified_resources.length}`));
    this.config.logger.log(chalk.gray(`   Deleted: ${migration.deleted_resources.length}`));

    // Build multipart form data 
    const form = new FormData();
    
    // Add deleted resources as JSON 
    form.append('DeletedResources', JSON.stringify(migration.deleted_resources));

    // Add added resources
    for (let i = 0; i < migration.added_resources.length; i++) {
      const resource = migration.added_resources[i];
      const [contentBytes, filename] = this.resolveContentAndFilename(
        resource.content_string,
        resource.content_file_path,
        resource.file_name
      );

      // Format: (filename, content_bytes) - tuple with filename and content
      form.append(`AddedResources[${i}].Content`, contentBytes, {
        filename: filename,
        contentType: 'application/octet-stream',
      });
      
      // Format: (None, parent_path) - tuple with None and path string
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

      // Format: content_bytes (just bytes, not a tuple with filename!)
      form.append(`ModifiedResources[${i}].Content`, contentBytes, {
        contentType: 'application/octet-stream',
      });
      
      // Format: (None, id) - tuple with None and ID string
      form.append(`ModifiedResources[${i}].Id`, resource.id);
    }

    // Build headers - FormData will set Content-Type with boundary, so don't set it in createHeaders
    const baseHeaders = createHeaders({
      bearerToken: this.config.envConfig.accessToken,
      tenantId: this.config.envConfig.tenantId,
      contentType: undefined, // Let FormData set Content-Type with boundary
    });
    
    // Remove Content-Type from baseHeaders if it exists, FormData will set it correctly
    delete baseHeaders['Content-Type'];
    
    const headers: Record<string, string> = {
      ...baseHeaders,
      ...form.getHeaders(), // This sets Content-Type: multipart/form-data; boundary=...
    };

    // Add lock key to headers if available (matching Python with_lock_retry)
    // HEADER_SW_LOCK_KEY = "x-uipath-sw-lockkey"
    if (lockKey) {
      headers['x-uipath-sw-lockkey'] = lockKey;
      this.config.logger.log(chalk.gray(`   Lock header: x-uipath-sw-lockkey=${lockKey.substring(0, 20)}...`));
    } else {
      this.config.logger.log(chalk.gray(`   Lock header: not set`));
    }

    this.config.logger.log(chalk.gray(`   Sending POST request...`));
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: form,
    });
    
    this.config.logger.log(chalk.gray(`   Response: ${response.status} ${response.statusText}`));

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

          if (response.ok) {
            this.config.logger.log(chalk.gray(`Deleted empty folder: '${folder.name}'`));
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
      // Recursively check subfolders first
      for (const subfolder of folder.folders) {
        checkFolder(subfolder);
      }

      // Check if current folder is empty
      if (this.isFolderEmpty(folder) && folder.id) {
        emptyFolders.push({ id: folder.id, name: folder.name });
      }
    };

    // Check all root folders
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

    // Check if all subfolders are empty
    for (const subfolder of folder.folders) {
      if (!this.isFolderEmpty(subfolder)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Build API URL
   */
  private buildApiUrl(endpoint: string): string {
    const baseUrl = this.config.envConfig.baseUrl;
    // Studio Web APIs use org ID
    const orgId = this.config.envConfig.orgId;
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
   * Find resource in catalog by type, name, and folder path
   */
  private async findResourceInCatalog(
    resourceType: string,
    name: string,
    folderPath: string
  ): Promise<Resource> {
    // Map resource type to API enum value
    const resourceTypeMap: Record<string, string> = {
      asset: 'asset',
      process: 'process',
      bucket: 'bucket',
      index: 'index',
      app: 'app',
      connection: 'connection',
    };

    const apiResourceType = resourceTypeMap[resourceType.toLowerCase()];
    if (!apiResourceType) {
      throw new Error(`Unknown resource type: ${resourceType}`);
    }

    const url = this.buildApiUrl(
      API_ENDPOINTS.RESOURCE_CATALOG_ENTITIES.replace('{resourceType}', apiResourceType)
    );

    // Get folder key from folder path
    const folderKey = await this.getFolderKeyFromPath(folderPath);

    const params = new URLSearchParams({
      name: name,
      skip: '0',
      take: '100',
    });

    if (folderKey) {
      params.append('folderKey', folderKey);
    }

    const response = await fetch(`${url}?${params.toString()}`, {
      method: 'GET',
      headers: createHeaders({
        bearerToken: this.config.envConfig.accessToken,
        tenantId: this.config.envConfig.tenantId,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to search resource catalog: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as { value?: any[]; items?: any[] };
    const items = data.value || data.items || [];

    // Find exact match by name and folder path
    for (const item of items) {
      if (item.name === name) {
        // Check if folder matches
        const itemFolders = item.folders || [];
        for (const folder of itemFolders) {
          if (folder.path === folderPath) {
            return {
              resource_key: item.entityKey || item.resource_key,
              name: item.name,
              resource_type: item.entityType || item.resource_type,
              resource_sub_type: item.entitySubType || item.resource_sub_type || null,
              folders: itemFolders.map((f: any) => ({
                folder_key: f.folderKey || f.folder_key,
                fully_qualified_name: f.fullyQualifiedName || f.fully_qualified_name || '',
                path: f.path,
              })),
            };
          }
        }
      }
    }

    throw new Error(`Resource '${name}' of type '${resourceType}' not found at folder path '${folderPath}'`);
  }

  /**
   * Get folder key from folder path (simplified - may need folder service)
   */
  private async getFolderKeyFromPath(folderPath: string): Promise<string | null> {
    // For now, return null to search tenant-scoped
    // In a full implementation, we'd use the folder service to resolve the path
    // This is a simplified version that works for most cases
    return null;
  }

  /**
   * Retrieve connection by key (matching Python connections.retrieve_async)
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
   * Create referenced resource (matching Python create_referenced_resource)
   */
  private async createReferencedResource(
    solutionId: string,
    request: ReferencedResourceRequest
  ): Promise<ReferencedResourceResponse> {
    const url = this.buildApiUrl(
      API_ENDPOINTS.STUDIO_WEB_CREATE_REFERENCED_RESOURCE.replace('{solutionId}', solutionId)
    );

    // Transform request to match API format (camelCase)
    const payload = {
      key: request.key,
      kind: request.kind,
      type: request.type,
      folder: {
        folderKey: request.folder.folder_key,
        fullyQualifiedName: request.folder.fully_qualified_name,
        path: request.folder.path,
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: createHeaders({
        bearerToken: this.config.envConfig.accessToken,
        tenantId: this.config.envConfig.tenantId,
        contentType: 'application/json',
      }),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Failed to create referenced resource: ${response.status} ${response.statusText}`);
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
  resource: 'asset' | 'process' | 'bucket' | 'index' | 'app' | 'connection';
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
