import path from "path";
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import { z } from 'zod';
import { ActionSchemaConstants, JsonDataType, JsonFormatType, VBDataType, VbArgumentDataTypeNamespace, VbArgumentCollectionType } from "../types/index.js";

export function readAndParseActionSchema(): ParsedActionSchema {
    const actionSchemaPath = path.join(process.cwd(), ActionSchemaConstants.actionSchemaFileName);

    const jsonActionSchema = fs.readFileSync(actionSchemaPath, 'utf-8');
    const rawSchema = JSON.parse(jsonActionSchema);

    const actionSchema = validateActionSchema(rawSchema);   // validate the user defined action-schema
    const parsedActionSchema = transformToParsedSchema(actionSchema);

    return parsedActionSchema;
}

function generateGuid(): string {
  return uuidv4();
}

export const JsonSchemaPropertySchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    type: z.enum([
      JsonDataType.string,
      JsonDataType.integer,
      JsonDataType.number,
      JsonDataType.boolean,
      JsonDataType.array,
      JsonDataType.object,
    ], { message: 'Invalid type. Must be one of: string, integer, number, boolean, array, object' }),
    required: z.boolean().optional(),
    description: z.string().optional(),
    format: z.enum([JsonFormatType.uuid, JsonFormatType.date], {
      message: 'Invalid format. Must be one of: uuid, date'
    }).optional(),
    items: JsonSchemaPropertySchema.optional(),
    properties: z.record(z.string(), JsonSchemaPropertySchema).optional(),
  })
  .refine((data) => {
    if (data.type === JsonDataType.array) {
      return !!data.items;
    }
    return true;
  }, {
    message: 'Array properties must have an "items" field',
  })
  .refine((data) => {
    if (data.type === JsonDataType.array && data.items) {   // for preventing nested arrays
      return data.items.type !== JsonDataType.array;
    }
    return true;
  }, {
    message: 'Nested arrays are not allowed. Array items cannot be of type array',
  })
);

export const JsonSchemaObjectSchema = z.object({
  type: z.literal('object', { message: 'Section type must be "object"' }),
  properties: z.record(z.string(), JsonSchemaPropertySchema, {
    message: 'Properties must be a valid object'
  }),
});

export const JsonActionSchemaValidator = z.object({
  inputs: JsonSchemaObjectSchema,
  outputs: JsonSchemaObjectSchema,
  inOuts: JsonSchemaObjectSchema,
  outcomes: JsonSchemaObjectSchema,
}, {
  message: 'Action schema must have inputs, outputs, inOuts, and outcomes sections'
});

export type JsonSchemaProperty = z.infer<typeof JsonSchemaPropertySchema>;
export type JsonSchemaObject = z.infer<typeof JsonSchemaObjectSchema>;
export type JsonActionSchema = z.infer<typeof JsonActionSchemaValidator>;

export const ParsedActionPropertySchemaValidator: z.ZodType<any> = z.lazy(() =>
  z.object({
    key: z.string(),
    name: z.string(),
    type: z.enum(VBDataType),
    isList: z.boolean(),
    typeNamespace: z.enum(VbArgumentDataTypeNamespace),
    version: z.number(),
    required: z.boolean(),
    properties: z.array(ParsedActionPropertySchemaValidator).optional(),
    collectionDataType: z.enum(VbArgumentCollectionType).nullable().optional(),
    description: z.string().optional(),
  })
);

export const ParsedActionSchemaValidator = z.object({
  id: z.string(),
  name: z.string(),
  key: z.string(),
  description: z.string(),
  inputs: z.array(ParsedActionPropertySchemaValidator),
  outputs: z.array(ParsedActionPropertySchemaValidator),
  inOuts: z.array(ParsedActionPropertySchemaValidator),
  outcomes: z.array(ParsedActionPropertySchemaValidator),
  version: z.number(),
});

export type ParsedActionPropertySchema = z.infer<typeof ParsedActionPropertySchemaValidator>;
export type ParsedActionSchema = z.infer<typeof ParsedActionSchemaValidator>;

function validateActionSchema(schema: any): JsonActionSchema {
  try {
    return JsonActionSchemaValidator.parse(schema);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.issues.map(err => {
        const path = err.path.length > 0 ? `${err.path.join('.')}` : 'root';
        return `  - ${path}: ${err.message}`;
      });
      throw new Error(`Action schema validation failed:\n${errors.join('\n')}`);
    }
    throw error;
  }
}

function mapJsonTypeToSystemType(type: JsonDataType, format?: JsonFormatType): VBDataType {
  if (format === JsonFormatType.uuid) return VBDataType.guid;
  if (format === JsonFormatType.date) return VBDataType.dateOnly;
  
  switch (type) {
    case JsonDataType.string: return VBDataType.string;
    case JsonDataType.integer: return VBDataType.int64;
    case JsonDataType.number: return VBDataType.decimal;
    case JsonDataType.boolean: return VBDataType.boolean;
    case JsonDataType.object: return VBDataType.object;
    default: 
      throw new Error(`Unsupported JSON data type: ${type}`);
  }
}

function transformProperty(name: string, propDef: JsonSchemaProperty): any {
  const isArray = propDef.type === JsonDataType.array;
  const itemType = isArray && propDef.items ? propDef.items.type : propDef.type;
  const itemFormat = isArray && propDef.items ? propDef.items.format : propDef.format;
  let properties: ParsedActionPropertySchema[] = [];

  if (propDef.type === JsonDataType.object && propDef.properties) {
    properties = Object.keys(propDef.properties).map(childName =>
      transformProperty(childName, propDef.properties!![childName])
    );
  } else if (propDef.type === JsonDataType.array && propDef.items && propDef.items.type === JsonDataType.object && propDef.items.properties) {
    properties = Object.keys(propDef.items.properties).map(childName =>
      transformProperty(childName, propDef.items!!.properties!![childName])
    );
  } else {
    properties = [];
  }
  
  const baseProperty: ParsedActionPropertySchema = {
    name,
    key: generateGuid(),
    required: propDef.required || false,
    description: propDef.description,
    version: 0,
    typeNamespace: VbArgumentDataTypeNamespace.system,
    isList: isArray,
    collectionDataType: isArray ? VbArgumentCollectionType.array : null,
    type: mapJsonTypeToSystemType(itemType, itemFormat),
    properties,
  };

  return baseProperty;
}

function transformToParsedSchema(schema: JsonActionSchema): ParsedActionSchema {
  let inputs: ParsedActionPropertySchema[] = [];
  let outputs: ParsedActionPropertySchema[] = [];
  let inOuts: ParsedActionPropertySchema[] = [];
  let outcomes: ParsedActionPropertySchema[] = [];

  if (schema.inputs && schema.inputs.properties) {
    inputs = Object.keys(schema.inputs.properties).map(inputName =>
      transformProperty(inputName, schema.inputs.properties[inputName])
    );
  }

  if (schema.outputs && schema.outputs.properties) {
    outputs = Object.keys(schema.outputs.properties).map(outputName =>
      transformProperty(outputName, schema.outputs.properties[outputName])
    );
  }

  if (schema.inOuts && schema.inOuts.properties) {
    inOuts = Object.keys(schema.inOuts.properties).map(inOutName =>
      transformProperty(inOutName, schema.inOuts.properties[inOutName])
    );
  }

  if (schema.outcomes && schema.outcomes.properties) {
    outcomes = Object.keys(schema.outcomes.properties).map(outcomeName => ({
      name: outcomeName,
      key: generateGuid(),
      required: false,
      type: VBDataType.string,
      typeNamespace: VbArgumentDataTypeNamespace.system,
      isList: false,
      properties: [],
      version: 0,
    }));
  }

  const parsedSchema: ParsedActionSchema = {
    key: generateGuid(),
    version: 0,
    description: 'Action Schema',
    id: `ID${generateGuid().replace(/-/g, '')}`,
    name: 'ActionSchema',
    inOuts,
    inputs,
    outputs,
    outcomes,
  };

  return parsedSchema;
}
  