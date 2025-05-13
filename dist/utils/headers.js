"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HEADER_FOLDER_PATH = exports.HEADER_FOLDER_KEY = void 0;
exports.headerFolder = headerFolder;
const constants_1 = require("./constants");
/**
 * Constants for header keys
 */
exports.HEADER_FOLDER_KEY = 'X-UIPATH-FolderKey';
exports.HEADER_FOLDER_PATH = 'X-UIPATH-FolderPath';
/**
 * Creates folder headers for API requests.
 * Only one of folderKey or folderPath can be provided.
 *
 * @param folderKey - The folder key
 * @param folderPath - The folder path
 * @returns Record of header key-value pairs
 * @throws Error if both folderKey and folderPath are provided
 */
function headerFolder(folderKey, folderPath) {
    if (folderKey && folderPath) {
        throw new Error('Only one of folderKey or folderPath can be provided');
    }
    const headers = {};
    if (folderKey) {
        headers[constants_1.HEADERS.FOLDER_KEY] = folderKey;
    }
    if (folderPath) {
        headers[constants_1.HEADERS.FOLDER_PATH] = folderPath;
    }
    return headers;
}
