"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FolderService = void 0;
const baseService_1 = require("./baseService");
/**
 * Service for managing UiPath Folders.
 *
 * A folder represents a single area for data organization
 * and access control - it is created when you need to categorize, manage, and enforce
 * authorization rules for a group of UiPath resources (i.e. processes, assets,
 * connections, storage buckets etc.) or other folders
 */
class FolderService extends baseService_1.BaseService {
    constructor(config, executionContext) {
        super(config, executionContext);
    }
    /**
     * Retrieves a folder key by its path.
     *
     * @param folderPath - The full path of the folder
     * @returns The folder key if found, undefined otherwise
     */
    async retrieveKeyByFolderPath(folderPath) {
        const spec = this.retrieveSpec(folderPath);
        const response = await this.request(spec.method, spec.url, { params: spec.params });
        return response.data.PageItems.find(item => item.FullyQualifiedName === folderPath)?.Key;
    }
    retrieveSpec(folderPath) {
        const folderName = folderPath.split('/').pop() || '';
        return {
            method: 'GET',
            url: '/orchestrator_/api/FoldersNavigation/GetFoldersForCurrentUser',
            params: {
                searchText: folderName,
                take: 1
            }
        };
    }
}
exports.FolderService = FolderService;
