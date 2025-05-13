"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HEADER_USER_AGENT = void 0;
exports.userAgentValue = userAgentValue;
exports.headerUserAgent = headerUserAgent;
const constants_1 = require("./constants");
/**
 * Constants for header keys
 */
exports.HEADER_USER_AGENT = 'X-UIPATH-UserAgent';
/**
 * Generates a user agent string for API requests.
 *
 * @param specificComponent - The specific component making the request (e.g. "JobsService.retrieve")
 * @returns The formatted user agent string
 */
function userAgentValue(specificComponent) {
    const product = 'UiPath.TypeScript.Sdk';
    const productComponent = `UiPath.TypeScript.Sdk.Activities.${specificComponent}`;
    // TODO: Get version from package.json
    const version = '0.1.0';
    return `${product}/${productComponent}/${version}`;
}
/**
 * Creates a user agent header for API requests.
 *
 * @param specificComponent - The specific component making the request
 * @returns Record containing the user agent header
 */
function headerUserAgent(specificComponent) {
    return { [constants_1.HEADERS.USER_AGENT]: userAgentValue(specificComponent) };
}
