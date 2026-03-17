import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import { scanProject, formatBindings, loadSDKResourceMethods } from '../core/resource-scanner/index.js';
import { MESSAGES } from '../constants/index.js';
import { cliTelemetryClient } from '../telemetry/index.js';
import type { Bindings } from '../core/webapp-file-handler/types.js';

export interface ScanOptions {
  rootDir?: string;
  tsconfig?: string;
  logger?: { log: (message: string) => void };
}

function logDetectedBindings(
  bindings: Bindings,
  logger: { log: (message: string) => void },
): void {
  logger.log('');
  logger.log(chalk.cyan('┌──────────────────────────────────────────────────────'));
  logger.log(chalk.cyan('│') + chalk.bold.white(`  Detected ${bindings.resources.length} resource binding(s) in your code`));
  logger.log(chalk.cyan('├──────────────────────────────────────────────────────'));

  for (const r of bindings.resources) {
    const type = r.resource.toUpperCase();
    const name = r.value.name?.defaultValue ?? r.value.ConnectionId?.defaultValue ?? '';
    const folder = r.value.folderPath?.defaultValue;
    const folderInfo = folder ? chalk.gray(` → folder: ${folder}`) : '';
    logger.log(
      chalk.cyan('│') +
      `  ${chalk.yellow(`[${type}]`)} ${chalk.bold.white(name)}${folderInfo}` +
      chalk.gray(`  (key: ${r.key})`),
    );
  }

  logger.log(chalk.cyan('│'));
  logger.log(chalk.cyan('│') + chalk.bold.yellow('  Action required: ') + 'Please ensure these resources are declared in your');
  logger.log(chalk.cyan('│') + `  ${chalk.bold('bindings.json')}. Missing entries may cause runtime failures after deployment.`);
  logger.log(chalk.cyan('└──────────────────────────────────────────────────────'));
  logger.log('');
}

export { logDetectedBindings };

export async function executeScan(options: ScanOptions): Promise<void> {
  const logger = options.logger ?? { log: console.log };
  cliTelemetryClient.track('Cli.Scan');

  const rootDir = options.rootDir ?? process.cwd();
  const tsconfigRelative = options.tsconfig ?? 'tsconfig.json';
  const tsconfigPath = path.resolve(rootDir, tsconfigRelative);

  logger.log(chalk.blue(MESSAGES.INFO.SCAN_HEADER));
  logger.log('');

  if (!fs.existsSync(tsconfigPath)) {
    throw new Error(`${MESSAGES.ERRORS.SCAN_TSCONFIG_NOT_FOUND} (${tsconfigPath})`);
  }

  logger.log(chalk.gray(`[scan] Loading SDK resource metadata...`));
  const registry = await loadSDKResourceMethods(rootDir);

  if (registry.size === 0) {
    logger.log(chalk.yellow('[scan] No resource metadata found in SDK. Ensure @uipath/uipath-typescript is installed.'));
    return;
  }

  logger.log(chalk.gray(`[scan] Scanning project...`));

  const result = await scanProject(tsconfigPath, registry);

  for (const warning of result.warnings) {
    const relPath = path.relative(rootDir, warning.sourceFile);
    logger.log(chalk.yellow(`[scan] ⚠ ${warning.message} (${relPath}:${warning.line})`));
  }

  if (result.resources.length === 0) {
    logger.log(chalk.gray('[scan] No UiPath resource references detected.'));
    return;
  }

  const bindings = formatBindings(result.resources);

  if (bindings.resources.length === 0) {
    logger.log(chalk.gray('[scan] No resources with resolvable literal values found.'));
    return;
  }

  logDetectedBindings(bindings, logger);
}
