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
 *
 * They are for UiPath consumers, not for extraction: the extraction engine
 * removes every `x-uipath-` key from the schema before it sends the schema to
 * the model, so they never affect what is extracted. The taxonomy in the
 * processed document keeps them.
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
  /**
   * JSON Schema type, e.g. `['string', 'null']`. Every field is present in
   * `output`, `null` when not found.
   */
  type?: string | string[];
  /** JSON Schema format, e.g. `'date'`. */
  format?: string;
  /**
   * A choice field's options. The list of a nullable field ends with `null`,
   * which is not an option: leave it out when listing the choices.
   */
  enum?: (string | null)[];
  /**
   * A choice field's alternative spellings, keyed by option, e.g. `{ USD: ['US Dollar'] }`.
   * Like the `x-uipath-` keys, the extraction engine removes it before the
   * schema reaches the model.
   */
  synonyms?: Record<string, string[]>;
}

/** The JSON Schema type of a field group. */
export enum IXPFieldGroupType {
  /** A repeating group; its fields are under `items`. */
  Array = 'array',
  /** A single-instance group; its fields are under `properties`. */
  Object = 'object',
}

/**
 * A single-value field. It carries `$ref` and no `type`, which is how it is
 * told apart from a field group; use {@link isIXPTaxonomyFieldGroup}.
 */
export interface IXPTaxonomyField extends IXPExtensionKeys {
  /** Reference to the field's type in {@link IXPTaxonomy.$defs}, e.g. `'#/$defs/Date'`. */
  $ref: string;
  /** The author's instructions for the field; absent when there are none. */
  description?: string;
  /** Stable id of the field, unchanged when the field is renamed. */
  'x-uipath-field-id': string;
}

/** What a field group contains: a field, or a field group nested in it. */
export type IXPTaxonomyNode = IXPTaxonomyField | IXPTaxonomyFieldGroup;

/** The contents of a field group: of each row of an `array` group, or of an `object` group itself. */
export interface IXPFieldGroupRecord {
  /**
   * The group's fields and nested field groups, to any depth, keyed by name;
   * narrow each entry with {@link isIXPTaxonomyFieldGroup}.
   */
  properties: Record<string, IXPTaxonomyNode>;
  /**
   * The name of every entry in `properties`: each one is always present in
   * `output`. A field is `null` when not found; an `array` group is a list,
   * possibly empty; an `object` group is one object.
   */
  required: string[];
  /** Always `false`: `output` carries nothing outside `properties`. */
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
   * Id of this group's parent, when the producer flattens nesting.
   *
   * A flattened child sits next to its parent in {@link IXPTaxonomy.properties},
   * named `'<parent> > <child>'` (e.g. `'Invoice > Items'`), and `output` and the
   * attribution use that name. Read the parent from this id, not from the name.
   * A flat child is not tied to a parent row: a flat `array` child's rows
   * cannot be matched to the parent row they belong to, and a flat `object`
   * child is one object for the whole document. Their pointers carry no parent
   * row index: `'/Invoice > Items/2/Quantity'` does not say which invoice it is
   * from, and `'/Invoice > Vendor Details/Vendor Name'` has no row at all.
   *
   * A nested group has no parent id; a taxonomy is either all nested or all flat.
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
 * A single-instance field group: `output` holds one object where the group
 * sits. Nested in a row of an `array` group, that is one object per row, so
 * its attribution pointers carry the row index, e.g.
 * `'/Invoice/0/Vendor Details/Vendor Name'`. Flattened next to its parent,
 * it is one object for the whole document and its pointers carry none, e.g.
 * `'/Invoice > Vendor Details/Vendor Name'`; see
 * `x-uipath-parent-field-group-id`.
 */
export interface IXPTaxonomyObjectFieldGroup extends IXPTaxonomyFieldGroupBase, IXPFieldGroupRecord {
  type: IXPFieldGroupType.Object;
}

/**
 * A field group. Narrow on `type`: an `array` group declares its contents
 * under `items`, an `object` group under `properties`.
 */
export type IXPTaxonomyFieldGroup = IXPTaxonomyArrayFieldGroup | IXPTaxonomyObjectFieldGroup;

/**
 * The taxonomy of an IXP extraction: the JSON Schema of
 * {@link IXPExtractionResult.output}.
 *
 * Nested field groups sit inside their parent, unless the producer flattens
 * them; see `x-uipath-parent-field-group-id` on {@link IXPTaxonomyFieldGroupBase}.
 *
 * @example
 * ```typescript
 * import { IXPFieldGroupType } from '@uipath/uipath-typescript/document-understanding';
 * import type { IXPTaxonomy } from '@uipath/uipath-typescript/document-understanding';
 *
 * // An invoice whose rows each hold a list of line items:
 * // output is { Invoice: [{ Number, Items: [{ Quantity }] }] }.
 * const taxonomy: IXPTaxonomy = {
 *   type: 'object',
 *   properties: {
 *     Invoice: {
 *       type: IXPFieldGroupType.Array,
 *       'x-uipath-field-group-id': 'invoice',
 *       items: {
 *         type: 'object',
 *         properties: {
 *           Number: { $ref: '#/$defs/Text', 'x-uipath-field-id': 'number' },
 *           Items: {
 *             type: IXPFieldGroupType.Array,
 *             'x-uipath-field-group-id': 'items',
 *             items: {
 *               type: 'object',
 *               properties: { Quantity: { $ref: '#/$defs/Text', 'x-uipath-field-id': 'quantity' } },
 *               required: ['Quantity'],
 *               additionalProperties: false,
 *             },
 *           },
 *         },
 *         required: ['Number', 'Items'],
 *         additionalProperties: false,
 *       },
 *     },
 *   },
 *   required: ['Invoice'],
 *   additionalProperties: false,
 *   $defs: { Text: { type: ['string', 'null'] } },
 * };
 * ```
 */
export interface IXPTaxonomy extends IXPExtensionKeys {
  /** Always `'object'`: the taxonomy describes one object, the extraction output. */
  type: 'object';
  /**
   * The document's top-level field groups, keyed by group name. Every field
   * belongs to a group.
   */
  properties: Record<string, IXPTaxonomyFieldGroup>;
  /** The name of every group in `properties`: each one is always present in `output`. */
  required: string[];
  /** Always `false`: `output` carries no group outside `properties`. */
  additionalProperties: false;
  /** The field types the fields reference through `$ref`, keyed by field type id. */
  $defs: Record<string, IXPFieldTypeSchema>;
}
