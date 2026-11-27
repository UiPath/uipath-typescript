/**
 * Helpers for walking an IXP taxonomy.
 */

import {
  IXPFieldGroupType,
  type IXPFieldGroupRecord,
  type IXPTaxonomyFieldGroup,
  type IXPTaxonomyNode,
} from './taxonomy.types';

/**
 * Whether a taxonomy entry is a field group rather than a field.
 *
 * It reads only `type` and trusts the rest of the shape: a group missing its
 * `items` or `properties` still returns `true`.
 *
 * @param node - An entry of a field group's `properties` (or `items.properties`).
 * @returns `true` for a field group, which then narrows to {@link IXPTaxonomyFieldGroup}; `false` for a field.
 *
 * @example
 * ```typescript
 * import { getIXPFieldGroupRecord, isIXPTaxonomyFieldGroup } from '@uipath/uipath-typescript/document-understanding';
 * import type { IXPFieldGroupRecord } from '@uipath/uipath-typescript/document-understanding';
 *
 * function fieldNames(record: IXPFieldGroupRecord): string[] {
 *   return Object.entries(record.properties).flatMap(([name, node]) =>
 *     isIXPTaxonomyFieldGroup(node) ? fieldNames(getIXPFieldGroupRecord(node)) : [name],
 *   );
 * }
 * ```
 */
export function isIXPTaxonomyFieldGroup(node: IXPTaxonomyNode): node is IXPTaxonomyFieldGroup {
  return 'type' in node && (node.type === IXPFieldGroupType.Array || node.type === IXPFieldGroupType.Object);
}

/**
 * The contents of a field group: the row schema of an `array` group, or an
 * `object` group itself.
 *
 * @param group - A field group, at any depth.
 * @returns The {@link IXPFieldGroupRecord} whose `properties` hold the group's fields and nested groups.
 *
 * @example
 * ```typescript
 * import { getIXPFieldGroupRecord } from '@uipath/uipath-typescript/document-understanding';
 * import type { IXPTaxonomy } from '@uipath/uipath-typescript/document-understanding';
 *
 * function topLevelEntryNames(taxonomy: IXPTaxonomy): string[] {
 *   return Object.values(taxonomy.properties).flatMap((group) =>
 *     Object.keys(getIXPFieldGroupRecord(group).properties),
 *   );
 * }
 * ```
 */
export function getIXPFieldGroupRecord(group: IXPTaxonomyFieldGroup): IXPFieldGroupRecord {
  return group.type === IXPFieldGroupType.Array ? group.items : group;
}
