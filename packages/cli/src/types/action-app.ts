import { z } from 'zod';
import { MESSAGES } from '../constants/messages.js';

export enum AppType {
  Web = 'Web',
  Action = 'Action',
}

export enum JsonDataType {
  string = 'string',
  integer = 'integer',
  number = 'number',
  boolean = 'boolean',
  array = 'array',
  object = 'object',
}

export enum JsonFormatType {
  uuid = 'uuid',
  date = 'date',
}

export enum VbArgumentCollectionType {
  array = 'Array',
}

export enum VbArgumentDataTypeNamespace {
  system = 'system',
}

export enum VBDataType {
  string = 'System.String',
  int64 = 'System.Int64',
  boolean = 'System.Boolean',
  decimal = 'System.Decimal',
  dateOnly = 'System.DateOnly',
  guid = 'System.Guid',
  object = 'System.Object',
}

export const JsonSchemaPropertySchema: z.ZodType<JsonSchemaProperty> = z.lazy(() =>
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

export const JsonActionSchemaValidator = z.object({
  inputs: JsonSchemaObjectSchema,
  outputs: JsonSchemaObjectSchema,
  inOuts: JsonSchemaObjectSchema,
  outcomes: JsonSchemaObjectSchema,
}, {
  message: MESSAGES.ERRORS.MISSING_ACTION_SCHEMA_SECTION
});

export type JsonSchemaProperty = {
  type: JsonDataType;
  required?: boolean;
  description?: string;
  format?: JsonFormatType;
  items?: JsonSchemaProperty;
  properties?: Record<string, JsonSchemaProperty>;
};

export type JsonActionSchema = z.infer<typeof JsonActionSchemaValidator>;

export const ParsedActionPropertySchema: z.ZodType<ParsedActionPropertySchema> = z.lazy(() =>
  z.object({
    key: z.string(),
    name: z.string(),
    type: z.enum([
      VBDataType.string,
      VBDataType.int64,
      VBDataType.boolean,
      VBDataType.decimal,
      VBDataType.dateOnly,
      VBDataType.guid,
      VBDataType.object,
    ]),
    isList: z.boolean(),
    typeNamespace: z.enum([VbArgumentDataTypeNamespace.system]),
    version: z.number(),
    required: z.boolean(),
    properties: z.array(ParsedActionPropertySchema).optional(),
    collectionDataType: z.enum([VbArgumentCollectionType.array]).nullable().optional(),
    description: z.string().optional(),
  })
);

export const ParsedActionSchemaValidator = z.object({
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

export type ParsedActionPropertySchema = {
  key: string;
  name: string;
  type: VBDataType;
  isList: boolean;
  typeNamespace: string;
  version: number;
  required: boolean;
  properties?: ParsedActionPropertySchema[];
  collectionDataType?: string | null;
  description?: string;
};

export type ParsedActionSchema = z.infer<typeof ParsedActionSchemaValidator>;