/**
 * Output Formatter Utility
 *
 * Formats command output in various formats: JSON, table, YAML
 */

import Table from 'cli-table3';
import YAML from 'yaml';
import chalk from 'chalk';

export type OutputFormat = 'json' | 'table' | 'yaml';

/**
 * Format data for CLI output
 */
export function formatOutput(data: unknown, format: OutputFormat = 'table'): string {
  if (data === null || data === undefined) {
    return chalk.gray('No data');
  }

  switch (format) {
    case 'json':
      return formatJson(data);
    case 'yaml':
      return formatYaml(data);
    case 'table':
    default:
      return formatTable(data);
  }
}

/**
 * Format data as JSON
 */
function formatJson(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

/**
 * Format data as YAML
 */
function formatYaml(data: unknown): string {
  return YAML.stringify(data);
}

/**
 * Format data as a table
 */
function formatTable(data: unknown): string {
  // Handle arrays
  if (Array.isArray(data)) {
    if (data.length === 0) {
      return chalk.gray('No items');
    }

    // Check if it's an array of objects
    if (typeof data[0] === 'object' && data[0] !== null) {
      return formatObjectArray(data as Record<string, unknown>[]);
    }

    // Simple array
    return data.map(item => String(item)).join('\n');
  }

  // Handle single object
  if (typeof data === 'object' && data !== null) {
    return formatSingleObject(data as Record<string, unknown>);
  }

  // Primitive values
  return String(data);
}

/**
 * Format an array of objects as a table
 */
function formatObjectArray(items: Record<string, unknown>[]): string {
  if (items.length === 0) {
    return chalk.gray('No items');
  }

  // Get columns from first item, prioritizing common fields
  const priorityFields = ['id', 'key', 'name', 'title', 'status', 'state', 'createdAt', 'updatedAt'];
  const allFields = Object.keys(items[0]);

  // Sort fields: priority fields first, then others
  const columns = [
    ...priorityFields.filter(f => allFields.includes(f)),
    ...allFields.filter(f => !priorityFields.includes(f))
  ].slice(0, 8); // Limit to 8 columns for readability

  const table = new Table({
    head: columns.map(col => chalk.cyan(col)),
    style: { head: [], border: [] },
    wordWrap: true
  });

  for (const item of items.slice(0, 50)) { // Limit to 50 rows
    const row = columns.map(col => {
      const value = item[col];
      return formatCellValue(value);
    });
    table.push(row);
  }

  let output = table.toString();

  if (items.length > 50) {
    output += `\n${chalk.gray(`... and ${items.length - 50} more items`)}`;
  }

  return output;
}

/**
 * Format a single object as a vertical table
 */
function formatSingleObject(obj: Record<string, unknown>): string {
  const table = new Table({
    style: { head: [], border: [] }
  });

  for (const [key, value] of Object.entries(obj)) {
    table.push({
      [chalk.cyan(key)]: formatCellValue(value)
    });
  }

  return table.toString();
}

/**
 * Format a cell value for table display
 */
function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) {
    return chalk.gray('-');
  }

  if (typeof value === 'boolean') {
    return value ? chalk.green('true') : chalk.red('false');
  }

  if (typeof value === 'number') {
    return chalk.yellow(String(value));
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return chalk.gray('[]');
    }
    if (value.length <= 3) {
      return value.map(v => formatCellValue(v)).join(', ');
    }
    return `[${value.length} items]`;
  }

  if (typeof value === 'object') {
    const keys = Object.keys(value);
    if (keys.length === 0) {
      return chalk.gray('{}');
    }
    if (keys.length <= 2) {
      return JSON.stringify(value);
    }
    return `{${keys.length} properties}`;
  }

  const str = String(value);

  // Truncate long strings
  if (str.length > 50) {
    return str.substring(0, 47) + '...';
  }

  // Color status-like values
  const lowerStr = str.toLowerCase();
  if (['active', 'running', 'success', 'successful', 'completed', 'approved'].includes(lowerStr)) {
    return chalk.green(str);
  }
  if (['pending', 'waiting', 'in_progress', 'inprogress'].includes(lowerStr)) {
    return chalk.yellow(str);
  }
  if (['failed', 'error', 'faulted', 'rejected', 'cancelled', 'canceled'].includes(lowerStr)) {
    return chalk.red(str);
  }

  return str;
}

/**
 * Format a list of items with a header
 */
export function formatList(items: string[], header?: string): string {
  let output = '';

  if (header) {
    output += chalk.bold(header) + '\n';
  }

  for (const item of items) {
    output += `  • ${item}\n`;
  }

  return output;
}

/**
 * Format a key-value pair list
 */
export function formatKeyValue(data: Record<string, unknown>): string {
  const maxKeyLength = Math.max(...Object.keys(data).map(k => k.length));

  return Object.entries(data)
    .map(([key, value]) => {
      const paddedKey = key.padEnd(maxKeyLength);
      return `${chalk.cyan(paddedKey)}  ${formatCellValue(value)}`;
    })
    .join('\n');
}

/**
 * Format success message
 */
export function formatSuccess(message: string): string {
  return chalk.green(`✓ ${message}`);
}

/**
 * Format error message
 */
export function formatError(message: string): string {
  return chalk.red(`✗ ${message}`);
}

/**
 * Format warning message
 */
export function formatWarning(message: string): string {
  return chalk.yellow(`⚠ ${message}`);
}

/**
 * Format info message
 */
export function formatInfo(message: string): string {
  return chalk.blue(`ℹ ${message}`);
}
