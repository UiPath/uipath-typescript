/**
 * Taxonomy contracts of IXP document processors: the JSON Schema a
 * processor run produces its output against, as it travels in
 * `ProcessedDocument.taxonomy`.
 *
 * Hand-written: the generated `framework/` contracts describe the UiPath
 * Document Understanding Framework API, a different representation.
 */

/**
 * UiPath extension keys a taxonomy node may carry next to its standard JSON
 * Schema keywords. Unlisted keys are allowed and typed `unknown`.
 */
export interface IXPExtensionKeys {
  [key: `x-uipath-${string}`]: unknown;
}

/** How a field group is presented to a reviewer. */
export interface IXPFieldGroupDisplaySettings {
  /** `true` to show the group's rows as a table. */
  tableView?: boolean;
}

/** A field type declaration under {@link IXPTaxonomy.$defs}, referenced by a field's `$ref`. */
export interface IXPFieldTypeSchema extends IXPExtensionKeys {
  title?: string;
  /** JSON Schema type, e.g. `'string'` or `['string', 'null']`. */
  type?: string | string[];
  /** JSON Schema format, e.g. `'date'`. */
  format?: string;
  /**
   * A choice field's options. A trailing `null` marks the field nullable and is
   * not an option.
   */
  enum?: (string | null)[];
  /** A choice field's alternative spellings, keyed by option, e.g. `{ USD: ['US Dollar'] }`. */
  synonyms?: Record<string, string[]>;
}

/** The JSON Schema type of a field group. */
export enum IXPFieldGroupType {
  /** A repeating group; its columns are under `items`. */
  Array = 'array',
  /** A single-instance group; its columns are under `properties`. */
  Object = 'object',
}

/** A single-value field of the taxonomy. */
export interface IXPTaxonomyField extends IXPExtensionKeys {
  /** Reference to the field's type in {@link IXPTaxonomy.$defs}, e.g. `'#/$defs/Date'`. */
  $ref?: string;
  description?: string;
  /** Stable id of the field, unchanged when the field is renamed. */
  'x-uipath-field-id'?: string;
  /** A field declares its type through `$ref`, never inline; only a field group has `type`. */
  type?: never;
}

/**
 * A field group. An `array` group repeats and declares its columns under
 * `items`; an `object` group is a single instance and declares them under
 * `properties`. Tell a group from a field with {@link isIXPTaxonomyFieldGroup}.
 */
export interface IXPTaxonomyFieldGroup extends IXPExtensionKeys {
  /**
   * `'array'` for a repeating group, `'object'` for a single instance. A
   * single-instance group is nullable, so it is written `['object', 'null']`.
   * In `output` an `object` group is one object, even when nested in an
   * `array` group, so its attribution pointers carry no row index, e.g.
   * `'/Invoice > Vendor Details/Vendor Name'`.
   */
  type: IXPFieldGroupType | (IXPFieldGroupType | 'null')[];
  description?: string;
  /** Stable id of the group, unchanged when the group is renamed. */
  'x-uipath-field-group-id'?: string;
  /**
   * Id of the group this group is nested in. A nested group is not listed
   * inside its parent: it sits next to it, named `'<parent> > <child>'`, e.g.
   * `'Invoice > Items'`, and `output` and the attribution pointers use that name too.
   */
  'x-uipath-parent-field-group-id'?: string;
  'x-uipath-display-settings'?: IXPFieldGroupDisplaySettings;
  /** The row schema of an `array` group. */
  items?: {
    type?: string | string[];
    properties?: Record<string, IXPTaxonomyProperty>;
    required?: string[];
    additionalProperties?: boolean;
  };
  /** The columns of an `object` group. */
  properties?: Record<string, IXPTaxonomyProperty>;
  required?: string[];
  additionalProperties?: boolean;
}

/** A property of the taxonomy or of a field group: a field or a nested group. */
export type IXPTaxonomyProperty = IXPTaxonomyField | IXPTaxonomyFieldGroup;

/**
 * The taxonomy of an IXP extraction: the JSON Schema of
 * {@link IXPExtraction.output}.
 */
export interface IXPTaxonomy {
  type?: string | string[];
  /** The document's fields and field groups, keyed by field name. */
  properties?: Record<string, IXPTaxonomyProperty>;
  required?: string[];
  additionalProperties?: boolean;
  /** The field types the `properties` reference. */
  $defs?: Record<string, IXPFieldTypeSchema>;
}
