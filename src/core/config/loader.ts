import { UiPathSDKConfig } from './sdk-config';
import { SDK_CONFIG_KEYS, DEFAULT_CONFIG_PATH_BROWSER, DEFAULT_CONFIG_PATH_NODE } from './constants';

export interface ConfigLoaderOptions {
  configPath?: string;
}

/**
 * Result of loading configuration
 */
export interface ConfigResult<TCustom = Record<string, any>> {
  /**
   * UiPath SDK configuration (use this to initialize SDK: new UiPath(config))
   */
  config: UiPathSDKConfig;

  /**
   * Full configuration including SDK and custom properties
   */
  fullConfig: UiPathSDKConfig & TCustom;

  /**
   * Get custom property by key
   */
  get<K extends keyof TCustom>(key: K): TCustom[K];

  /**
   * Get custom property with default fallback
   */
  getOrDefault<K extends keyof TCustom>(key: K, defaultValue: TCustom[K]): TCustom[K];
}

/**
 * Load configuration from JSON file
 * Supports both browser (via fetch) and Node.js (via fs)
 */
async function loadFromFile(options: ConfigLoaderOptions = {}): Promise<any> {
  const isBrowser = typeof window !== 'undefined';
  const defaultPath = isBrowser ? DEFAULT_CONFIG_PATH_BROWSER : DEFAULT_CONFIG_PATH_NODE;
  const configPath = options.configPath || defaultPath;

  try {
    if (isBrowser) {
      const response = await fetch(configPath);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } else {
      const fs = await import('fs/promises');
      const path = await import('path');
      const absolutePath = path.isAbsolute(configPath) ? configPath : path.resolve(process.cwd(), configPath);
      const fileContent = await fs.readFile(absolutePath, 'utf-8');
      return JSON.parse(fileContent);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to load config from ${configPath}: ${message}`);
  }
}

/**
 * Load extended configuration with SDK config and custom properties
 *
 * @example
 * ```typescript
 * const { config, get } = await loadExtendedConfig();
 * const sdk = new UiPath(config);
 * const timeout = get('apiTimeout');
 * ```
 */
export async function loadExtendedConfig<TCustom = Record<string, any>>(
  options?: ConfigLoaderOptions
): Promise<ConfigResult<TCustom>> {
  const fullConfig = await loadFromFile(options);

  // Extract SDK config
  const sdkConfig: any = {};
  for (const key of SDK_CONFIG_KEYS) {
    if (key in fullConfig) {
      sdkConfig[key] = fullConfig[key];
    }
  }

  return {
    config: sdkConfig as UiPathSDKConfig,
    fullConfig,
    get: <K extends keyof TCustom>(key: K) => fullConfig[key],
    getOrDefault: <K extends keyof TCustom>(key: K, defaultValue: TCustom[K]) =>
      fullConfig[key] !== undefined ? fullConfig[key] : defaultValue
  };
}
