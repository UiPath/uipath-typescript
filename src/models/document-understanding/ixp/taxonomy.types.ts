/**
 * Taxonomy contracts of IXP document processors: the JSON Schema a
 * processor run produces its output against, as it travels in
 * `ExtractionProcessedDocument.taxonomy`.
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

/** A single-value field: a column of a field group. */
export interface IXPTaxonomyField extends IXPExtensionKeys {
  /** Reference to the field's type in {@link IXPTaxonomy.$defs}, e.g. `'#/$defs/Date'`. */
  $ref: string;
  /** The author's instructions for the field; absent when there are none. */
  description?: string;
  /** Stable id of the field, unchanged when the field is renamed. */
  'x-uipath-field-id': string;
}

/** The fields of a field group: of each row of an `array` group, or of an `object` group itself. */
export interface IXPFieldGroupRecord {
  /** The group's fields, keyed by field name. */
  properties: Record<string, IXPTaxonomyField>;
  /** The name of every field in `properties`: each one is always present in `output`, `null` when not found. */
  required: string[];
  /** Always `false`: `output` carries no field outside `properties`. */
  additionalProperties: false;
}

/** The row schema of an `array` group. */
export interface IXPFieldGroupRow extends IXPFieldGroupRecord {
  /** Always `'object'`: each row is one object. */
  type: 'object';
}

/** What every field group carries, whatever its type. */
export interface IXPTaxonomyFieldGroupBase extends IXPExtensionKeys {
  /** The author's instructions for the group; absent when there are none. */
  description?: string;
  /** Stable id of the group, unchanged when the group is renamed. */
  'x-uipath-field-group-id': string;
  /**
   * Id of the group this group is nested in. A nested group is not listed
   * inside its parent: it sits next to it in {@link IXPTaxonomy.properties},
   * named `'<parent> > <child>'`, e.g. `'Invoice > Items'`, and `output` and
   * the attribution pointers use that name too.
   */
  'x-uipath-parent-field-group-id'?: string;
  'x-uipath-display-settings'?: IXPFieldGroupDisplaySettings;
}

/** A repeating field group: `output` holds an array of rows. */
export interface IXPTaxonomyArrayFieldGroup extends IXPTaxonomyFieldGroupBase {
  type: IXPFieldGroupType.Array;
  /** The schema of each row. */
  items: IXPFieldGroupRow;
}

/**
 * A single-instance field group: `output` holds one object. It stays one
 * object even when nested in an `array` group, so its attribution pointers
 * carry no row index, e.g. `'/Invoice > Vendor Details/Vendor Name'`.
 */
export interface IXPTaxonomyObjectFieldGroup extends IXPTaxonomyFieldGroupBase, IXPFieldGroupRecord {
  type: IXPFieldGroupType.Object;
}

/**
 * A field group. Narrow on `type`: an `array` group declares its columns
 * under `items`, an `object` group under `properties`.
 */
export type IXPTaxonomyFieldGroup = IXPTaxonomyArrayFieldGroup | IXPTaxonomyObjectFieldGroup;

/**
 * The taxonomy of an IXP extraction: the JSON Schema of
 * {@link IXPExtractionResult.output}.
 */
export interface IXPTaxonomy extends IXPExtensionKeys {
  /** Always `'object'`: the taxonomy describes one object, the extraction output. */
  type: 'object';
  /**
   * The document's field groups, keyed by group name. Every field belongs to a
   * group, and nested groups are listed here too, next to their parent.
   */
  properties: Record<string, IXPTaxonomyFieldGroup>;
  /** The name of every group in `properties`: each one is always present in `output`. */
  required: string[];
  /** Always `false`: `output` carries no group outside `properties`. */
  additionalProperties: false;
  /** The field types the fields reference through `$ref`, keyed by field type id. */
  $defs: Record<string, IXPFieldTypeSchema>;
}
