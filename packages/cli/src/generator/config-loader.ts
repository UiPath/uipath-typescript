/**
 * Configuration Loader
 *
 * Loads generator configuration from file or returns defaults.
 * Supports:
 * - generator.config.ts
 * - generator.config.js
 * - generator.config.json
 *
 * By default, if no config file is found, all SDK methods are included.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { pathToFileURL } from 'url';
import {
  GeneratorConfig,
  DEFAULT_CONFIG,
  MethodOverride,
  CompositeToolDefinition,
  CustomToolDefinition
} from './generator-config.js';

export interface LoadedConfig {
  config: GeneratorConfig;
  configPath: string | null;
  isDefault: boolean;
}

/**
 * Load configuration from file or return defaults
 */
export async function loadConfig(searchPath?: string): Promise<LoadedConfig> {
  const searchDir = searchPath || process.cwd();

  // Config file names to search for (in order of priority)
  const configFiles = [
    'generator.config.ts',
    'generator.config.js',
    'generator.config.mjs',
    'generator.config.json'
  ];

  // Search for config file
  for (const configFile of configFiles) {
    const configPath = path.join(searchDir, configFile);

    try {
      await fs.access(configPath);

      // Found config file, load it
      const config = await loadConfigFile(configPath);
      return {
        config: mergeWithDefaults(config),
        configPath,
        isDefault: false
      };
    } catch {
      // File doesn't exist, continue searching
    }
  }

  // No config found, return defaults
  return {
    config: DEFAULT_CONFIG,
    configPath: null,
    isDefault: true
  };
}

/**
 * Load configuration from a specific file
 */
async function loadConfigFile(configPath: string): Promise<Partial<GeneratorConfig>> {
  const ext = path.extname(configPath);

  if (ext === '.json') {
    const content = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(content);
  }

  if (ext === '.ts' || ext === '.js' || ext === '.mjs') {
    // Dynamic import for ES modules
    const fileUrl = pathToFileURL(configPath).href;
    const module = await import(fileUrl);
    return module.default || module.config || module;
  }

  throw new Error(`Unsupported config file format: ${ext}`);
}

/**
 * Merge partial config with defaults
 */
function mergeWithDefaults(partial: Partial<GeneratorConfig>): GeneratorConfig {
  return {
    version: partial.version || DEFAULT_CONFIG.version,
    services: {
      include: partial.services?.include || DEFAULT_CONFIG.services.include,
      exclude: partial.services?.exclude || DEFAULT_CONFIG.services.exclude
    },
    overrides: partial.overrides || DEFAULT_CONFIG.overrides,
    skip: partial.skip || DEFAULT_CONFIG.skip,
    composites: partial.composites || DEFAULT_CONFIG.composites,
    custom: partial.custom || DEFAULT_CONFIG.custom,
    settings: {
      includeJsDoc: partial.settings?.includeJsDoc ?? DEFAULT_CONFIG.settings.includeJsDoc,
      generateExamples: partial.settings?.generateExamples ?? DEFAULT_CONFIG.settings.generateExamples,
      defaultCliOutput: partial.settings?.defaultCliOutput || DEFAULT_CONFIG.settings.defaultCliOutput
    }
  };
}

/**
 * Get override for a specific method
 */
export function getMethodOverride(
  config: GeneratorConfig,
  serviceName: string,
  methodName: string
): MethodOverride | undefined {
  const key = `${serviceName}.${methodName}`;
  return config.overrides[key];
}

/**
 * Check if a method should be skipped
 */
export function shouldSkipMethod(
  config: GeneratorConfig,
  serviceName: string,
  methodName: string
): boolean {
  const fullName = `${serviceName}.${methodName}`;

  // Check explicit overrides
  const override = config.overrides[fullName];
  if (override?.skip) {
    return true;
  }

  // Check skip patterns
  for (const pattern of config.skip) {
    if (matchesGlobPattern(fullName, pattern)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if a service should be included
 */
export function shouldIncludeService(
  config: GeneratorConfig,
  serviceCategory: string
): boolean {
  const { include, exclude } = config.services;

  // If include list is specified and non-empty, only include those
  if (include.length > 0 && !include.includes(serviceCategory)) {
    return false;
  }

  // Check exclude list
  if (exclude.includes(serviceCategory)) {
    return false;
  }

  return true;
}

/**
 * Get MCP-specific configuration for a method
 */
export function getMcpConfig(
  config: GeneratorConfig,
  serviceName: string,
  methodName: string
): { name?: string; description?: string; parameters?: Record<string, { description?: string; required?: boolean }> } {
  const override = getMethodOverride(config, serviceName, methodName);
  return override?.mcp || {};
}

/**
 * Get CLI-specific configuration for a method
 */
export function getCliConfig(
  config: GeneratorConfig,
  serviceName: string,
  methodName: string
): { name?: string; description?: string; group?: string; flags?: Record<string, { description?: string; required?: boolean; char?: string }> } {
  const override = getMethodOverride(config, serviceName, methodName);
  return override?.cli || {};
}

/**
 * Get all composite tool definitions
 */
export function getComposites(config: GeneratorConfig): CompositeToolDefinition[] {
  return config.composites;
}

/**
 * Get all custom tool definitions
 */
export function getCustomTools(config: GeneratorConfig): CustomToolDefinition[] {
  return config.custom;
}

/**
 * Match a string against a glob-like pattern
 * Supports: * (any characters), ? (single character)
 */
function matchesGlobPattern(str: string, pattern: string): boolean {
  const regex = new RegExp(
    '^' + pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape special chars except * and ?
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.') + '$'
  );
  return regex.test(str);
}

/**
 * Validate configuration
 */
export function validateConfig(config: GeneratorConfig): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check version
  if (config.version !== '1.0') {
    warnings.push(`Unknown config version: ${config.version}. Using latest parser.`);
  }

  // Validate composites
  for (const composite of config.composites) {
    if (!composite.id) {
      errors.push('Composite tool missing required "id" field');
    }
    if (!composite.mcpName) {
      errors.push(`Composite "${composite.id}" missing required "mcpName" field`);
    }
    if (!composite.steps || composite.steps.length === 0) {
      errors.push(`Composite "${composite.id}" must have at least one step`);
    }
    for (const step of composite.steps || []) {
      if (!step.call) {
        errors.push(`Composite "${composite.id}" has step missing "call" field`);
      }
    }
  }

  // Validate custom tools
  for (const custom of config.custom) {
    if (!custom.id) {
      errors.push('Custom tool missing required "id" field');
    }
    if (!custom.handler) {
      errors.push(`Custom tool "${custom.id}" missing required "handler" field`);
    }
  }

  // Check for potential issues in overrides
  for (const [key, override] of Object.entries(config.overrides)) {
    if (!key.includes('.')) {
      warnings.push(`Override key "${key}" should be in format "ServiceName.methodName"`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
