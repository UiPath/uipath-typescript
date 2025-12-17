/**
 * Configuration Loader
 *
 * Loads generator configuration from various file formats.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { GeneratorConfig, defaultConfig, mergeWithDefaults } from './config.schema.js';

const CONFIG_FILE_NAMES = [
  'generator.config.ts',
  'generator.config.js',
  'generator.config.mjs',
  'generator.config.json',
  '.generatorrc.json',
  '.generatorrc',
];

/**
 * Find configuration file in the given directory
 */
async function findConfigFile(dir: string): Promise<string | null> {
  for (const fileName of CONFIG_FILE_NAMES) {
    const filePath = path.join(dir, fileName);
    try {
      await fs.access(filePath);
      return filePath;
    } catch {
      // File doesn't exist, try next
    }
  }
  return null;
}

/**
 * Load configuration from a TypeScript/JavaScript file
 */
async function loadTsJsConfig(filePath: string): Promise<Partial<GeneratorConfig>> {
  try {
    // Use dynamic import for ES modules
    const module = await import(filePath);
    return module.default || module.config || module;
  } catch (error) {
    console.error(`Error loading config from ${filePath}:`, error);
    throw error;
  }
}

/**
 * Load configuration from a JSON file
 */
async function loadJsonConfig(filePath: string): Promise<Partial<GeneratorConfig>> {
  const content = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Load configuration from a file path
 */
export async function loadConfigFromFile(filePath: string): Promise<GeneratorConfig> {
  const ext = path.extname(filePath).toLowerCase();

  let config: Partial<GeneratorConfig>;

  if (ext === '.json' || filePath.endsWith('.generatorrc')) {
    config = await loadJsonConfig(filePath);
  } else if (ext === '.ts' || ext === '.js' || ext === '.mjs') {
    config = await loadTsJsConfig(filePath);
  } else {
    throw new Error(`Unsupported config file format: ${ext}`);
  }

  return mergeWithDefaults(config);
}

/**
 * Load configuration from directory (auto-detect config file)
 */
export async function loadConfig(dir?: string): Promise<{ config: GeneratorConfig; configPath: string | null }> {
  const searchDir = dir || process.cwd();
  const configPath = await findConfigFile(searchDir);

  if (!configPath) {
    // No config file found, return defaults (include everything)
    return { config: defaultConfig, configPath: null };
  }

  const config = await loadConfigFromFile(configPath);
  return { config, configPath };
}

/**
 * Check if a method should be skipped based on config
 */
export function shouldSkipMethod(
  config: GeneratorConfig,
  serviceName: string,
  methodName: string,
  target: 'cli' | 'mcp'
): boolean {
  const fullName = `${serviceName}.${methodName}`;

  // Check global skip list
  if (config.skip?.includes(fullName) || config.skip?.includes(`${serviceName}.*`)) {
    return true;
  }

  // Check service-level skip
  if (config.services?.[serviceName]?.skip) {
    return true;
  }

  // Check method-level override skip
  const override = config.overrides?.[fullName];
  if (target === 'cli' && override?.cli?.skip) {
    return true;
  }
  if (target === 'mcp' && override?.mcp?.skip) {
    return true;
  }

  return false;
}

/**
 * Get method override from config
 */
export function getMethodOverride(
  config: GeneratorConfig,
  serviceName: string,
  methodName: string
) {
  const fullName = `${serviceName}.${methodName}`;
  return config.overrides?.[fullName];
}

/**
 * Get service config from config
 */
export function getServiceConfig(config: GeneratorConfig, serviceName: string) {
  return config.services?.[serviceName];
}

/**
 * Validate configuration
 */
export function validateConfig(config: GeneratorConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate composites
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
          errors.push(`Composite tool '${composite.name}' has step without 'call'`);
        }
      }
    }
  }

  // Validate custom tools
  if (config.custom) {
    for (const custom of config.custom) {
      if (!custom.name) {
        errors.push('Custom tool missing name');
      }
      if (!custom.handler) {
        errors.push(`Custom tool '${custom.name}' missing handler`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
