"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.OverwritesManager = void 0;
exports.withResourceOverwrites = withResourceOverwrites;
const fs = __importStar(require("fs"));
/**
 * Manages overwrites for different resource types and methods.
 *
 * This class handles reading and accessing bindings overwrites from a JSON file.
 * The overwrites are stored under the 'resourceOverwrites' key, where each key is a
 * resource key (e.g., 'asset.MyAssetKeyFromBindingsJson') and the value contains
 * 'name' and 'folderPath' fields.
 */
class OverwritesManager {
    constructor(overwritesFilePath) {
        this.overwrites = {};
        this.overwritesFilePath = overwritesFilePath || 'uipath.json';
        this.readOverwritesFile();
    }
    static getInstance(overwritesFilePath) {
        if (!OverwritesManager.instance) {
            OverwritesManager.instance = new OverwritesManager(overwritesFilePath);
        }
        else if (overwritesFilePath && overwritesFilePath !== OverwritesManager.instance.overwritesFilePath) {
            // If a new file path is provided and it's different from the current one,
            // update the path and re-read the file
            OverwritesManager.instance.overwritesFilePath = overwritesFilePath;
            OverwritesManager.instance.readOverwritesFile();
        }
        return OverwritesManager.instance;
    }
    readOverwritesFile() {
        try {
            const content = fs.readFileSync(this.overwritesFilePath, 'utf-8');
            this.overwrites = JSON.parse(content);
        }
        catch (error) {
            if (error.code !== 'ENOENT') {
                throw error;
            }
            this.overwrites = {};
        }
    }
    getOverwrite(resourceType, resourceName) {
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
    getAndApplyOverwrite(resourceType, resourceName, folderPath) {
        const overwrite = this.getOverwrite(resourceType, resourceName);
        if (overwrite) {
            const [name, overwriteFolderPath] = overwrite;
            // Only use overwrite folder path if no folderPath was provided
            return [name, folderPath ?? overwriteFolderPath];
        }
        return [resourceName, folderPath || ''];
    }
}
exports.OverwritesManager = OverwritesManager;
/**
 * Context manager-like function for reading and applying resource overwrites.
 *
 * @param resourceType - The type of resource (e.g., 'process', 'asset')
 * @param resourceName - The name of the resource
 * @param folderPath - Optional folder path to use if no overwrite exists
 * @param overwritesFilePath - Optional path to the overwrites JSON file
 * @returns A tuple of [name, folderPath] with overwritten values if available
 */
function withResourceOverwrites(resourceType, resourceName, folderPath, overwritesFilePath) {
    const manager = OverwritesManager.getInstance(overwritesFilePath);
    return manager.getAndApplyOverwrite(resourceType, resourceName, folderPath);
}
