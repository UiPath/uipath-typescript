import * as fs from 'fs';
import * as path from 'path';

interface ResourceOverwrite {
  name: string;
  folderPath: string;
}

interface Overwrites {
  resourceOverwrites?: Record<string, ResourceOverwrite>;
}

/**
 * Manages overwrites for different resource types and methods.
 * 
 * This class handles reading and accessing bindings overwrites from a JSON file.
 * The overwrites are stored under the 'resourceOverwrites' key, where each key is a
 * resource key (e.g., 'asset.MyAssetKeyFromBindingsJson') and the value contains
 * 'name' and 'folderPath' fields.
 */
export class OverwritesManager {
  private static instance: OverwritesManager;
  private overwrites: Overwrites = {};
  private overwritesFilePath: string;

  private constructor(overwritesFilePath?: string) {
    this.overwritesFilePath = overwritesFilePath || 'uipath.json';
    this.readOverwritesFile();
  }

  static getInstance(overwritesFilePath?: string): OverwritesManager {
    if (!OverwritesManager.instance) {
      OverwritesManager.instance = new OverwritesManager(overwritesFilePath);
    } else if (overwritesFilePath && overwritesFilePath !== OverwritesManager.instance.overwritesFilePath) {
      // If a new file path is provided and it's different from the current one,
      // update the path and re-read the file
      OverwritesManager.instance.overwritesFilePath = overwritesFilePath;
      OverwritesManager.instance.readOverwritesFile();
    }
    return OverwritesManager.instance;
  }

  private readOverwritesFile(): void {
    try {
      const content = fs.readFileSync(this.overwritesFilePath, 'utf-8');
      this.overwrites = JSON.parse(content);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
      this.overwrites = {};
    }
  }

  getOverwrite(resourceType: string, resourceName: string): [string, string] | null {
    const overwrites = this.overwrites.resourceOverwrites || {};
    const key = `${resourceType}.${resourceName}`;

    if (!(key in overwrites)) {
      return null;
    }

    const overwrite = overwrites[key];
    return [
      overwrite.name || resourceName,
      overwrite.folderPath || '',
    ];
  }

  getAndApplyOverwrite(
    resourceType: string,
    resourceName: string,
    folderPath?: string
  ): [string, string] {
    const overwrite = this.getOverwrite(resourceType, resourceName);
    if (overwrite) {
      const [name, overwriteFolderPath] = overwrite;
      // Only use overwrite folder path if no folderPath was provided
      return [name, folderPath ?? overwriteFolderPath];
    }
    return [resourceName, folderPath || ''];
  }
}

/**
 * Context manager-like function for reading and applying resource overwrites.
 * 
 * @param resourceType - The type of resource (e.g., 'process', 'asset')
 * @param resourceName - The name of the resource
 * @param folderPath - Optional folder path to use if no overwrite exists
 * @param overwritesFilePath - Optional path to the overwrites JSON file
 * @returns A tuple of [name, folderPath] with overwritten values if available
 */
export function withResourceOverwrites(
  resourceType: string,
  resourceName: string,
  folderPath?: string,
  overwritesFilePath?: string
): [string, string] {
  const manager = OverwritesManager.getInstance(overwritesFilePath);
  return manager.getAndApplyOverwrite(resourceType, resourceName, folderPath);
} 