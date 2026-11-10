import { IXPFieldGroupType } from './taxonomy.types';
import type { IXPTaxonomyFieldGroup, IXPTaxonomyProperty } from './taxonomy.types';

const FIELD_GROUP_TYPES: readonly string[] = Object.values(IXPFieldGroupType);

/**
 * Whether a taxonomy property is a field group rather than a single-value
 * field: its `type` is, or includes, `'array'` or `'object'`.
 *
 * @param property - A property of {@link IXPTaxonomy.properties} or of a field group.
 * @returns `true` when `property` is an {@link IXPTaxonomyFieldGroup}.
 *
 * @example
 * ```typescript
 * import { isIXPTaxonomyFieldGroup } from '@uipath/uipath-typescript/document-understanding';
 *
 * for (const [name, property] of Object.entries(doc.taxonomy.properties ?? {})) {
 *   if (isIXPTaxonomyFieldGroup(property)) {
 *     console.log(name, property.items?.properties ?? property.properties);
 *   } else {
 *     console.log(name, property.$ref);
 *   }
 * }
 * ```
 */
export function isIXPTaxonomyFieldGroup(property: IXPTaxonomyProperty): property is IXPTaxonomyFieldGroup {
  const types: unknown[] = Array.isArray(property.type) ? property.type : [property.type];
  return types.some((type) => typeof type === 'string' && FIELD_GROUP_TYPES.includes(type));
}
