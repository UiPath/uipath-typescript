import path from "path";
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import { z } from 'zod';
import { JsonDataType, JsonFormatType, VBDataType, VbArgumentDataTypeNamespace, VbArgumentCollectionType } from "../types/index.js";
import { ActionSchemaConstants } from "../constants/commands.js";
import { MESSAGES } from '../constants/messages.js';

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

const JsonSchemaPropertySchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    type: z.enum([
      JsonDataType.string,
      JsonDataType.integer,
      JsonDataType.number,
      JsonDataType.boolean,
      JsonDataType.array,
      JsonDataType.object,
    ], { message: MESSAGES.ERRORS.INVALID_PROPERTY_TYPE }),
    required: z.boolean().optional(),
    description: z.string().optional(),
    format: z.enum([JsonFormatType.uuid, JsonFormatType.date], {
      message: MESSAGES.ERRORS.INVALID_PROPERTY_FORMAT
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
    message: MESSAGES.ERRORS.MISSING_ITEMS_ARRAY
  })
  .refine((data) => {
    if (data.type === JsonDataType.array && data.items) {   // for preventing nested arrays
      return data.items.type !== JsonDataType.array;
    }
    return true;
  }, {
    message: MESSAGES.ERRORS.NESTED_ARRAYS_NOT_SUPPORTED,
  })
);

const JsonSchemaObjectSchema = z.object({
  type: z.literal('object', { message: MESSAGES.ERRORS.SECTION_TYPE_INVALID }),
  properties: z.record(z.string(), JsonSchemaPropertySchema, {
    message: MESSAGES.ERRORS.INVALID_PROPERTIES_OBJECT
  }),
});

const JsonActionSchemaValidator = z.object({
  inputs: JsonSchemaObjectSchema,
  outputs: JsonSchemaObjectSchema,
  inOuts: JsonSchemaObjectSchema,
  outcomes: JsonSchemaObjectSchema,
}, {
  message: MESSAGES.ERRORS.MISSING_ACTION_SCHEMA_SECTION
});

type JsonSchemaProperty = z.infer<typeof JsonSchemaPropertySchema>;
type JsonActionSchema = z.infer<typeof JsonActionSchemaValidator>;

const ParsedActionPropertySchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    key: z.string(),
    name: z.string(),
    type: z.enum(VBDataType),
    isList: z.boolean(),
    typeNamespace: z.enum(VbArgumentDataTypeNamespace),
    version: z.number(),
    required: z.boolean(),
    properties: z.array(ParsedActionPropertySchema).optional(),
    collectionDataType: z.enum(VbArgumentCollectionType).nullable().optional(),
    description: z.string().optional(),
  })
);

const ParsedActionSchemaValidator = z.object({
  id: z.string(),
  name: z.string(),
  key: z.string(),
  description: z.string(),
  inputs: z.array(ParsedActionPropertySchema),
  outputs: z.array(ParsedActionPropertySchema),
  inOuts: z.array(ParsedActionPropertySchema),
  outcomes: z.array(ParsedActionPropertySchema),
  version: z.number(),
});

type ParsedActionPropertySchema = z.infer<typeof ParsedActionPropertySchema>;
type ParsedActionSchema = z.infer<typeof ParsedActionSchemaValidator>;

function validateActionSchema(schema: any): JsonActionSchema {
  try {
    return JsonActionSchemaValidator.parse(schema);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.issues.map(err => {
        const path = err.path.length > 0 ? `${err.path.join('.')}` : 'root';
        return `  - ${path}: ${err.message}`;
      });
      throw new Error(`${MESSAGES.ERRORS.INVALID_ACTION_SCHEMA}\n${errors.join('\n')}`);
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
      throw new Error(`${MESSAGES.ERRORS.UNSUPPORTED_JSON_DATA_TYPE} ${type}`);
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
  