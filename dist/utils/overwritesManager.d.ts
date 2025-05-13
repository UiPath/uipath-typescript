/**
 * Manages overwrites for different resource types and methods.
 *
 * This class handles reading and accessing bindings overwrites from a JSON file.
 * The overwrites are stored under the 'resourceOverwrites' key, where each key is a
 * resource key (e.g., 'asset.MyAssetKeyFromBindingsJson') and the value contains
 * 'name' and 'folderPath' fields.
 */
export declare class OverwritesManager {
    private static instance;
    private overwrites;
    private overwritesFilePath;
    private constructor();
    static getInstance(overwritesFilePath?: string): OverwritesManager;
    private readOverwritesFile;
    getOverwrite(resourceType: string, resourceName: string): [string, string] | null;
    getAndApplyOverwrite(resourceType: string, resourceName: string, folderPath?: string): [string, string];
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
export declare function withResourceOverwrites(resourceType: string, resourceName: string, folderPath?: string, overwritesFilePath?: string): [string, string];
