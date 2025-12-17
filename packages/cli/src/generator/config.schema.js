/**
 * Generator Configuration Schema
 *
 * This file defines the configuration schema for customizing CLI command
 * and MCP tool generation from SDK services.
 */
/**
 * Default configuration - includes everything
 */
export const defaultConfig = {
    settings: {
        includeByDefault: true,
        generateCli: true,
        generateMcp: true,
    },
    services: {},
    overrides: {},
    skip: [],
    composites: [],
    custom: [],
};
/**
 * Load and merge configuration with defaults
 */
export function mergeWithDefaults(config) {
    return {
        ...defaultConfig,
        ...config,
        settings: {
            ...defaultConfig.settings,
            ...config.settings,
        },
        services: {
            ...defaultConfig.services,
            ...config.services,
        },
        overrides: {
            ...defaultConfig.overrides,
            ...config.overrides,
        },
        skip: [...(defaultConfig.skip || []), ...(config.skip || [])],
        composites: [...(defaultConfig.composites || []), ...(config.composites || [])],
        custom: [...(defaultConfig.custom || []), ...(config.custom || [])],
    };
}
//# sourceMappingURL=config.schema.js.map