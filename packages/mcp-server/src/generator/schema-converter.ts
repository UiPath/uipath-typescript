/**
 * TypeScript to Zod Schema Converter
 *
 * Converts TypeScript types to Zod schema definitions for MCP tool schemas.
 */

import type { MethodParameter, PropertyInfo, TypeInfo } from './service-parser.js';

export interface ZodSchemaProperty {
  zodType: string;
  isOptional: boolean;
  description?: string;
  enumValues?: string[];
}

export interface ZodSchema {
  properties: Record<string, ZodSchemaProperty>;
  zodCode: string;
}

/**
 * Convert TypeScript type to Zod schema string
 */
export function typeToZod(tsType: string, isOptional: boolean = false, description?: string): string {
  let zodType = convertType(tsType);

  if (isOptional) {
    zodType += '.optional()';
  }

  if (description) {
    zodType += `.describe(${JSON.stringify(description)})`;
  }

  return zodType;
}

/**
 * Convert a TypeScript type string to Zod type
 */
function convertType(tsType: string): string {
  // Normalize the type
  const type = tsType.trim();

  // Handle null/undefined
  if (type === 'null' || type === 'undefined') {
    return 'z.null()';
  }

  // Handle primitives
  if (type === 'string') return 'z.string()';
  if (type === 'number') return 'z.number()';
  if (type === 'boolean') return 'z.boolean()';
  if (type === 'any') return 'z.any()';
  if (type === 'unknown') return 'z.unknown()';
  if (type === 'void') return 'z.void()';
  if (type === 'never') return 'z.never()';

  // Handle Date
  if (type === 'Date') return 'z.date()';

  // Handle arrays
  const arrayMatch = type.match(/^Array<(.+)>$/) || type.match(/^(.+)\[\]$/);
  if (arrayMatch) {
    return `z.array(${convertType(arrayMatch[1])})`;
  }

  // Handle Record types
  const recordMatch = type.match(/^Record<(.+),\s*(.+)>$/);
  if (recordMatch) {
    return `z.record(${convertType(recordMatch[1])}, ${convertType(recordMatch[2])})`;
  }

  // Handle Map types
  const mapMatch = type.match(/^Map<(.+),\s*(.+)>$/);
  if (mapMatch) {
    return `z.map(${convertType(mapMatch[1])}, ${convertType(mapMatch[2])})`;
  }

  // Handle Set types
  const setMatch = type.match(/^Set<(.+)>$/);
  if (setMatch) {
    return `z.set(${convertType(setMatch[1])})`;
  }

  // Handle Promise types (unwrap them)
  const promiseMatch = type.match(/^Promise<(.+)>$/);
  if (promiseMatch) {
    return convertType(promiseMatch[1]);
  }

  // Handle union types
  if (type.includes(' | ')) {
    const types = type.split(' | ').map(t => t.trim());

    // Check if it's a string literal union (enum-like)
    if (types.every(t => t.startsWith("'") || t.startsWith('"'))) {
      const values = types.map(t => t.replace(/['"]/g, ''));
      return `z.enum([${values.map(v => `'${v}'`).join(', ')}])`;
    }

    // Regular union
    return `z.union([${types.map(convertType).join(', ')}])`;
  }

  // Handle intersection types (simplify to object)
  if (type.includes(' & ')) {
    return 'z.object({}).passthrough()';
  }

  // Handle literal types
  if (type.startsWith("'") || type.startsWith('"')) {
    return `z.literal(${type})`;
  }
  if (/^\d+$/.test(type)) {
    return `z.literal(${type})`;
  }
  if (type === 'true' || type === 'false') {
    return `z.literal(${type})`;
  }

  // Handle known UiPath types with reasonable defaults
  const knownTypes: Record<string, string> = {
    'RequestOptions': 'z.object({}).passthrough()',
    'PaginatedRequestOptions': 'z.object({ top: z.number().optional(), skip: z.number().optional(), filter: z.string().optional(), orderby: z.string().optional() })',
    'JobState': "z.enum(['Pending', 'Running', 'Stopping', 'Terminating', 'Faulted', 'Successful', 'Stopped', 'Suspended', 'Resumed'])",
    'TaskStatus': "z.enum(['Pending', 'Completed', 'Faulted', 'Canceled'])",
    'TaskPriority': "z.enum(['Low', 'Normal', 'High', 'Critical'])",
    'AssetValueType': "z.enum(['Text', 'Integer', 'Bool', 'Credential', 'WindowsCredential', 'KeyValueList'])",
    'QueueItemPriority': "z.enum(['Low', 'Normal', 'High'])",
    'StartStrategy': "z.enum(['All', 'Specific', 'RobotCount', 'ModernJobsCount'])",
  };

  if (knownTypes[type]) {
    return knownTypes[type];
  }

  // Default: treat as object with passthrough
  return 'z.object({}).passthrough()';
}

/**
 * Convert method parameters to Zod schema
 */
export function parametersToZodSchema(parameters: MethodParameter[]): ZodSchema {
  const properties: Record<string, ZodSchemaProperty> = {};
  const schemaEntries: string[] = [];

  for (const param of parameters) {
    // Skip 'this' parameter and internal params
    if (param.name === 'this' || param.name.startsWith('_')) {
      continue;
    }

    const zodType = typeToZod(param.type, param.isOptional, param.description);

    properties[param.name] = {
      zodType,
      isOptional: param.isOptional,
      description: param.description
    };

    schemaEntries.push(`${param.name}: ${zodType}`);
  }

  const zodCode = `{\n  ${schemaEntries.join(',\n  ')}\n}`;

  return { properties, zodCode };
}

/**
 * Convert TypeInfo to Zod schema
 */
export function typeInfoToZod(typeInfo: TypeInfo): string {
  if (typeInfo.kind === 'enum' && typeInfo.enumValues) {
    return `z.enum([${typeInfo.enumValues.map(v => `'${v}'`).join(', ')}])`;
  }

  if (typeInfo.kind === 'interface' && typeInfo.properties) {
    const props = typeInfo.properties.map(prop =>
      `${prop.name}: ${typeToZod(prop.type, prop.isOptional, prop.description)}`
    );
    return `z.object({\n  ${props.join(',\n  ')}\n})`;
  }

  return 'z.any()';
}

/**
 * Generate Zod schema code for a full tool definition
 */
export function generateToolSchema(
  toolName: string,
  description: string,
  parameters: MethodParameter[],
  returnType: string
): string {
  const inputSchema = parametersToZodSchema(parameters);

  return `server.tool(
  '${toolName}',
  ${JSON.stringify(description)},
  ${inputSchema.zodCode},
  async (${parameters.map(p => p.name).join(', ')}) => {
    // Implementation
  }
);`;
}

/**
 * Infer Zod type from a JavaScript value
 */
export function inferZodFromValue(value: any): string {
  if (value === null) return 'z.null()';
  if (value === undefined) return 'z.undefined()';

  const type = typeof value;

  if (type === 'string') return 'z.string()';
  if (type === 'number') return 'z.number()';
  if (type === 'boolean') return 'z.boolean()';

  if (Array.isArray(value)) {
    if (value.length === 0) return 'z.array(z.any())';
    return `z.array(${inferZodFromValue(value[0])})`;
  }

  if (type === 'object') {
    const entries = Object.entries(value).map(
      ([k, v]) => `${k}: ${inferZodFromValue(v)}`
    );
    return `z.object({ ${entries.join(', ')} })`;
  }

  return 'z.any()';
}
