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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BucketsService = void 0;
const baseService_1 = require("./baseService");
const folderContext_1 = require("../folderContext");
const headers_1 = require("../utils/headers");
const axios_1 = __importDefault(require("axios"));
const fs = __importStar(require("fs/promises"));
class BucketsService extends baseService_1.BaseService {
    constructor(config, executionContext) {
        super(config, executionContext);
        this.folderContext = new folderContext_1.FolderContext(config, executionContext);
    }
    /**
     * Download a file from a bucket.
     *
     * @param params - Parameters for the download operation
     * @param params.name - The name of the bucket
     * @param params.key - The key of the bucket
     * @param params.blobFilePath - The path to the file in the bucket
     * @param params.destinationPath - The local path where the file will be saved
     * @param params.folderKey - The key of the folder where the bucket resides
     * @param params.folderPath - The path of the folder where the bucket resides
     */
    async download({ name, key, blobFilePath, destinationPath, ...options }) {
        const bucket = await this.retrieve({ name, key, ...options });
        const readUri = await this.getReadUri(bucket.Id, blobFilePath, options);
        const headers = this.convertHeaders(readUri.Headers);
        let response;
        if (readUri.RequiresAuth) {
            response = await this.request('GET', readUri.Uri, {
                headers,
                responseType: 'arraybuffer',
            });
        }
        else {
            response = await axios_1.default.get(readUri.Uri, {
                headers,
                responseType: 'arraybuffer',
            });
        }
        await fs.writeFile(destinationPath, Buffer.from(response.data));
    }
    /**
     * Upload a file to a bucket.
     *
     * @param params - Parameters for the upload operation
     * @param params.name - The name of the bucket
     * @param params.key - The key of the bucket
     * @param params.blobFilePath - The path where the file will be stored in the bucket
     * @param params.contentType - The MIME type of the file
     * @param params.sourcePath - The local path of the file to upload
     * @param params.folderKey - The key of the folder where the bucket resides
     * @param params.folderPath - The path of the folder where the bucket resides
     */
    async upload({ name, key, blobFilePath, contentType, sourcePath, ...options }) {
        const bucket = await this.retrieve({ name, key, ...options });
        const writeUri = await this.getWriteUri(bucket.Id, contentType, blobFilePath, options);
        console.log('-------Write URI:', writeUri);
        const headers = this.convertHeaders(writeUri.Headers);
        const fileContent = await fs.readFile(sourcePath);
        const formData = new FormData();
        formData.append('file', new Blob([fileContent]));
        if (writeUri.RequiresAuth) {
            await this.request('PUT', writeUri.Uri, {
                headers,
                data: formData,
            });
        }
        else {
            await axios_1.default.put(writeUri.Uri, formData, { headers });
        }
    }
    /**
     * Upload content from memory to a bucket.
     */
    async uploadFromMemory({ name, key, blobFilePath, contentType, content, ...options }) {
        const bucket = await this.retrieve({ name, key, ...options });
        const writeUri = await this.getWriteUri(bucket.Id, contentType, blobFilePath, options);
        const headers = this.convertHeaders(writeUri.Headers);
        const data = typeof content === 'string' ? Buffer.from(content, 'utf-8') : content;
        if (writeUri.RequiresAuth) {
            await this.request('PUT', writeUri.Uri, {
                headers,
                data,
            });
        }
        else {
            await axios_1.default.put(writeUri.Uri, data, { headers });
        }
    }
    /**
     * Retrieve bucket information by its name or key.
     */
    async retrieve({ name, key, ...options }) {
        if (!key && !name) {
            throw new Error('Must specify a bucket name or bucket key');
        }
        const { method, url, params, headers } = key
            ? this.getRetrieveByKeyConfig(key, options)
            : this.getRetrieveConfig(name, options);
        try {
            const response = await this.request(method, url, {
                params,
                headers: {
                    ...headers,
                    'X-UIPATH-OrganizationUnitId': options.folderKey || '',
                },
            });
            if (!response.data.value || response.data.value.length === 0) {
                throw new Error(`Bucket with ${key ? 'key' : 'name'} '${key || name}' not found`);
            }
            return response.data.value[0];
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error)) {
                if (error.response?.status === 401) {
                    throw new Error(`Authentication failed when accessing bucket ${key || name}. Please check your authentication token and permissions.`);
                }
                throw new Error(`Failed to access bucket ${key || name}. Status: ${error.response?.status}, Message: ${error.message}`);
            }
            throw error;
        }
    }
    async getReadUri(bucketId, blobFilePath, options) {
        const { method, url, params, headers } = this.getReadUriConfig(bucketId, blobFilePath, options);
        const response = await this.request(method, url, {
            params,
            headers,
        });
        return response.data;
    }
    async getWriteUri(bucketId, contentType, blobFilePath, options) {
        const { method, url, params, headers } = this.getWriteUriConfig(bucketId, contentType, blobFilePath, options);
        const response = await this.request(method, url, {
            params,
            headers,
        });
        return response.data;
    }
    getRetrieveConfig(name, options) {
        return {
            method: 'GET',
            url: '/orchestrator_/odata/Buckets',
            params: {
                '$filter': `Name eq '${name}'`,
                '$top': 1,
            },
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                ...(0, headers_1.headerFolder)(options.folderKey, options.folderPath)
            },
        };
    }
    getRetrieveByKeyConfig(key, options) {
        return {
            method: 'GET',
            url: `/orchestrator_/odata/Buckets/UiPath.Server.Configuration.OData.GetByKey(identifier=${key})`,
            params: {},
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                ...(0, headers_1.headerFolder)(options.folderKey, options.folderPath)
            },
        };
    }
    getReadUriConfig(bucketId, blobFilePath, options) {
        return {
            method: 'GET',
            url: `/orchestrator_/odata/Buckets(${bucketId})/UiPath.Server.Configuration.OData.GetReadUri`,
            params: { path: blobFilePath },
            headers: {
                ...(0, headers_1.headerFolder)(options.folderKey, options.folderPath)
            },
        };
    }
    getWriteUriConfig(bucketId, contentType, blobFilePath, options) {
        return {
            method: 'GET',
            url: `/orchestrator_/odata/Buckets(${bucketId})/UiPath.Server.Configuration.OData.GetWriteUri`,
            params: {
                path: blobFilePath,
                contentType,
            },
            headers: {
                ...(0, headers_1.headerFolder)(options.folderKey, options.folderPath)
            },
        };
    }
    convertHeaders(headers) {
        return headers.Keys.reduce((acc, key, index) => {
            acc[key] = headers.Values[index];
            return acc;
        }, {});
    }
}
exports.BucketsService = BucketsService;
