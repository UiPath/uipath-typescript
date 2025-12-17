/**
 * MCP Generator Configuration
 *
 * This file provides configuration loading and validation for the MCP generator.
 * Uses the unified GeneratorConfig schema shared with CLI generator.
 */

import * as path from 'path';
import * as fs from 'fs/promises';
import { pathToFileURL } from 'url';

// Re-export shared types from local schema
export type {
  GeneratorConfig,
  MethodOverride,
  ServiceConfig,
  CompositeTool,
  CompositeStep,
  CustomTool,
  ParameterDefinition,
} from './config.schema.js';

export {
  defaultConfig,
  mergeWithDefaults,
} from './config.schema.js';

import { GeneratorConfig, defaultConfig, mergeWithDefaults } from './config.schema.js';

/**
 * Legacy MCP-specific config (for backwards compatibility)
 */
export interface MCPGeneratorConfig {
  /** Path to SDK source files (relative to this file) */
  sdkPath: string;
  /** Output path for generated tools */
  outputPath: string;
  /** Services to include/exclude */
  services: {
    include: string[];
    exclude: string[];
  };
  /** Methods to include/exclude and overrides */
  methods: {
    exclude: string[];
    overrides: Record<string, LegacyMethodOverride>;
  };
  /** Naming conventions */
  naming: {
    toolPrefix: string;
    separator: string;
    style: 'snake_case' | 'camelCase';
  };
  /** Override descriptions for specific tools */
  descriptions: Record<string, string>;
}

export interface LegacyMethodOverride {
  toolName?: string;
  description?: string;
  title?: string;
  inputSchema?: Record<string, { required?: boolean; description?: string }>;
  skip?: boolean;
}

/**
 * Load generator configuration from file
 * Looks for generator.config.ts or generator.config.js in the specified directory
 */
export async function loadConfig(configDir: string): Promise<{ config: GeneratorConfig; configPath: string | null }> {
  const configNames = ['generator.config.ts', 'generator.config.js', 'generator.config.mjs'];

  for (const configName of configNames) {
    const configPath = path.join(configDir, configName);
    try {
      await fs.access(configPath);

      // Use dynamic import for ESM compatibility
      const configUrl = pathToFileURL(configPath).href;
      const configModule = await import(configUrl);
      const loadedConfig = configModule.default || configModule;

      return {
        config: mergeWithDefaults(loadedConfig),
        configPath,
      };
    } catch {
      // Try next config file
      continue;
    }
  }

  // No config file found, use defaults
  return {
    config: defaultConfig,
    configPath: null,
  };
}

/**
 * Convert legacy MCP config to new GeneratorConfig format
 */
export function convertLegacyConfig(legacy: MCPGeneratorConfig): GeneratorConfig {
  const config: GeneratorConfig = {
    sdkPath: legacy.sdkPath,
    output: {
      mcp: legacy.outputPath,
    },
    services: {},
    overrides: {},
    skip: [...legacy.methods.exclude],
    settings: {
      includeByDefault: legacy.services.include.length === 0,
      generateMcp: true,
      generateCli: false,
    },
  };

  // Convert service excludes
  for (const excluded of legacy.services.exclude) {
    config.services![excluded] = { skip: true };
  }

  // Convert method overrides
  for (const [key, override] of Object.entries(legacy.methods.overrides)) {
    config.overrides![key] = {
      mcp: {
        name: override.toolName,
        description: override.description,
        skip: override.skip,
        parameters: override.inputSchema ?
          Object.fromEntries(
            Object.entries(override.inputSchema).map(([name, schema]) => [
              name,
              { required: schema.required, description: schema.description }
            ])
          ) : undefined,
      },
    };
  }

  // Convert description overrides
  for (const [toolName, description] of Object.entries(legacy.descriptions)) {
    // Try to reverse map tool name to service.method
    // This is a best-effort conversion
    if (!config.overrides![toolName]) {
      config.overrides![toolName] = { mcp: { description } };
    }
  }

  return config;
}

/**
 * Validate configuration and return errors
 */
export function validateConfig(config: GeneratorConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check composites
  if (config.composites) {
    for (const composite of config.composites) {
      if (!composite.name) {
        errors.push('Composite tool missing name');
      }
      if (!composite.steps || composite.steps.length === 0) {
        errors.push(`Composite tool '${composite.name}' has no steps`);
      }
      for (const step of composite.steps || []) {
        if (!step.call) {
          errors.push(`Step in '${composite.name}' missing 'call' property`);
        }
      }
    }
  }

  // Check custom tools
  if (config.custom) {
    for (const custom of config.custom) {
      if (!custom.name) {
        errors.push('Custom tool missing name');
      }
      if (!custom.handler) {
        errors.push(`Custom tool '${custom.name}' missing handler path`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Default config for backwards compatibility
const legacyConfig: MCPGeneratorConfig = {
  sdkPath: '../../',
  outputPath: '../src/tools/generated',
  services: {
    include: [],
    exclude: []
  },
  methods: {
    exclude: [
      '*._*',
      'BaseService.*',
      'FolderScopedService.*'
    ],
    overrides: {
      'ProcessService.start': {
        description: 'Start an RPA process and create jobs in UiPath Orchestrator',
        inputSchema: {
          folderId: { required: true, description: 'Folder ID where the process is deployed' },
          releaseKey: { description: 'Release key (use this OR name, not both)' },
          name: { description: 'Process name (use this OR releaseKey, not both)' }
        }
      },
      'TaskService.complete': {
        description: 'Complete an Action Center task with the specified action and data'
      },
      'EntityService.getRecordsById': {
        description: 'Query records from a Data Service entity with optional filtering and pagination'
      }
    }
  },
  naming: {
    toolPrefix: '',
    separator: '_',
    style: 'snake_case'
  },
  descriptions: {
    'orchestrator_processes_getAll': 'List all processes (releases) available in Orchestrator',
    'orchestrator_assets_getAll': 'List all assets in Orchestrator',
    'orchestrator_queues_addItem': 'Add a new item to an Orchestrator queue',
    'action_center_tasks_getAll': 'List all Action Center tasks',
    'data_fabric_entities_getAll': 'List all entities in Data Service'
  }
};

export default legacyConfig;
