/**
 * MCP Generator Configuration
 *
 * This file configures how SDK methods are converted to MCP tools.
 */
export interface MCPGeneratorConfig {
    /** Path to SDK source files (relative to this file) */
    sdkPath: string;
    /** Output path for generated tools */
    outputPath: string;
    /** Services to include/exclude */
    services: {
        /** Services to include (empty = all) */
        include: string[];
        /** Services to exclude */
        exclude: string[];
    };
    /** Methods to include/exclude and overrides */
    methods: {
        /** Methods to exclude from generation */
        exclude: string[];
        /** Override generated config for specific methods */
        overrides: Record<string, MethodOverride>;
    };
    /** Naming conventions */
    naming: {
        /** Prefix for all tool names */
        toolPrefix: string;
        /** Separator between category, service, method */
        separator: string;
        /** Naming style */
        style: 'snake_case' | 'camelCase';
    };
    /** Override descriptions for specific tools */
    descriptions: Record<string, string>;
}
export interface MethodOverride {
    /** Custom tool name */
    toolName?: string;
    /** Custom description */
    description?: string;
    /** Custom title */
    title?: string;
    /** Input schema overrides */
    inputSchema?: Record<string, {
        required?: boolean;
        description?: string;
    }>;
    /** Skip this method */
    skip?: boolean;
}
declare const config: MCPGeneratorConfig;
export default config;
//# sourceMappingURL=mcp-generator.config.d.ts.map