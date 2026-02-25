import path from "path";
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import { z } from 'zod';
import { JsonActionSchema, JsonActionSchemaValidator, JsonDataType, JsonFormatType, JsonSchemaProperty, ParsedActionPropertySchema, ParsedActionSchema, VbArgumentCollectionType, VbArgumentDataTypeNamespace, VBDataType } from "../types/index.js";
import { ACTION_SCHEMA_CONSTANTS } from "../constants/index.js";
import { MESSAGES } from '../constants/messages.js';

export function readAndParseActionSchema(): ParsedActionSchema {
    const actionSchemaPath = path.join(process.cwd(), ACTION_SCHEMA_CONSTANTS.ACTION_SCHEMA_FILENAME);

    const jsonActionSchema = fs.readFileSync(actionSchemaPath, 'utf-8');
    const rawSchema = JSON.parse(jsonActionSchema);

    const actionSchema = validateActionSchema(rawSchema);   // validate the user defined action-schema
    const parsedActionSchema = transformToParsedSchema(actionSchema);

    return parsedActionSchema;
}

function generateGuid(): string {
  return uuidv4();
}

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
    case JsonDataType.file: return VBDataType.iresource;
    default: 
      throw new Error(`${MESSAGES.ERRORS.UNSUPPORTED_JSON_DATA_TYPE} ${type}`);
  }
}

function transformProperty(name: string, propDef: JsonSchemaProperty): ParsedActionPropertySchema {
  const isArray = propDef.type === JsonDataType.array;
  const itemType = isArray && propDef.items ? propDef.items.type : propDef.type;
  const itemFormat = isArray && propDef.items ? propDef.items.format : propDef.format;
  let properties: ParsedActionPropertySchema[] = [];

  if (propDef.type === JsonDataType.object && propDef.properties) {
    properties = Object.keys(propDef.properties).map(childName =>
      transformProperty(childName, propDef.properties![childName])
    );
  } else if (propDef.type === JsonDataType.array && propDef.items && propDef.items.type === JsonDataType.object && propDef.items.properties) {
    properties = Object.keys(propDef.items.properties).map(childName =>
      transformProperty(childName, propDef.items!.properties![childName])
    );
  } else {
    properties = [];
  }
  
  const baseProperty: ParsedActionPropertySchema = {
    name,
    key: generateGuid(),
    required: propDef.required ?? false,
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
  console.log('ParsedSchema', parsedSchema);
  return parsedSchema;
}
  