"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssetsService = void 0;
const baseService_1 = require("./baseService");
const folderContext_1 = require("../folderContext");
const overwritesManager_1 = require("../utils/overwritesManager");
const headers_1 = require("../utils/headers");
class AssetsService extends baseService_1.BaseService {
    constructor(config, executionContext) {
        super(config, executionContext);
        this.baseUrl = 'assets';
        this.folderContext = new folderContext_1.FolderContext(config, executionContext);
    }
    /**
     * Retrieve an asset by its name.
     *
     * @param name - The name of the asset
     * @param options - Optional folder settings
     * @returns A promise that resolves to the asset data
     */
    async retrieve(name, options = {}) {
        const [overwrittenName, overwrittenFolderPath] = (0, overwritesManager_1.withResourceOverwrites)('asset', name, options.folderPath);
        const { method, url, data, headers } = this.getRetrieveRequestConfig(overwrittenName, { ...options, folderPath: overwrittenFolderPath });
        const response = await this.request(method, url, {
            data,
            headers,
        });
        return response.data;
    }
    /**
     * Gets a specified Orchestrator credential.
     * The robot id is retrieved from the execution context (UIPATH_ROBOT_KEY environment variable)
     *
     * @param name - The name of the credential asset
     * @param options - Optional folder settings
     * @returns A promise that resolves to the decrypted credential password
     */
    async retrieveCredential(name, options = {}) {
        const [overwrittenName, overwrittenFolderPath] = (0, overwritesManager_1.withResourceOverwrites)('asset', name, options.folderPath);
        const asset = await this.retrieve(overwrittenName, {
            ...options,
            folderPath: overwrittenFolderPath
        });
        return asset.credentialPassword ?? null;
    }
    /**
     * Update an asset's value.
     *
     * @param robotAsset - The asset object containing the updated values
     * @param options - Optional folder settings
     * @returns A promise that resolves to the updated asset
     */
    async update(robotAsset, options = {}) {
        const [overwrittenName, overwrittenFolderPath] = (0, overwritesManager_1.withResourceOverwrites)('asset', robotAsset.name || '', options.folderPath);
        const { method, url, data, headers } = this.getUpdateRequestConfig({ ...robotAsset, name: overwrittenName }, { ...options, folderPath: overwrittenFolderPath });
        const response = await this.request(method, url, {
            data,
            headers,
        });
        return response.data;
    }
    getRetrieveRequestConfig(name, options) {
        return {
            method: 'POST',
            url: '/orchestrator_/odata/Assets/UiPath.Server.Configuration.OData.GetRobotAssetByNameForRobotKey',
            data: {
                assetName: name,
                robotKey: this.executionContext.robotKey,
            },
            headers: {
                ...(0, headers_1.headerFolder)(options.folderKey, options.folderPath)
            },
        };
    }
    getUpdateRequestConfig(robotAsset, options) {
        return {
            method: 'POST',
            url: '/orchestrator_/odata/Assets/UiPath.Server.Configuration.OData.SetRobotAssetByRobotKey',
            data: {
                robotKey: this.executionContext.robotKey,
                robotAsset,
            },
            headers: {
                ...(0, headers_1.headerFolder)(options.folderKey, options.folderPath)
            },
        };
    }
}
exports.AssetsService = AssetsService;
