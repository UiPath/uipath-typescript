import { IXPFieldGroupType } from '@/models/document-understanding';
import type { IXPTaxonomyField, IXPTaxonomyFieldGroup } from '@/models/document-understanding';

/** IXP taxonomy fixtures used across IXP contract tests. */
export const IXP_TEST_CONSTANTS = {
  FIELD: {
    $ref: '#/$defs/Date',
    'x-uipath-field-id': 'f1a2b3c4d5e6f',
  } satisfies IXPTaxonomyField,

  ARRAY_GROUP: {
    type: IXPFieldGroupType.Array,
    'x-uipath-field-group-id': 'a6b9a535e615d',
    items: { type: 'object', properties: {} },
  } satisfies IXPTaxonomyFieldGroup,

  NULLABLE_OBJECT_GROUP: {
    type: [IXPFieldGroupType.Object, 'null'],
    'x-uipath-field-group-id': 'a632000e6cafb',
    properties: {},
  } satisfies IXPTaxonomyFieldGroup,
};
