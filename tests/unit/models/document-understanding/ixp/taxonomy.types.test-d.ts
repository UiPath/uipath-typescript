import { describe, it, expectTypeOf } from 'vitest';
import {
  IXPFieldGroupType,
  getIXPFieldGroupRecord,
  isIXPTaxonomyFieldGroup,
  type IXPFieldGroupRecord,
  type IXPTaxonomy,
  type IXPTaxonomyArrayFieldGroup,
  type IXPTaxonomyFieldGroup,
  type IXPTaxonomyNode,
  type IXPTaxonomyObjectFieldGroup,
} from '@/models/document-understanding';
import { field } from './taxonomy.fixtures';

describe('IXPTaxonomy types', () => {
  it('should let a group hold nested groups as well as fields', () => {
    expectTypeOf<IXPFieldGroupRecord['properties'][string]>().toEqualTypeOf<IXPTaxonomyNode>();
  });

  it('should narrow a node through the guard', () => {
    const node = {} as IXPTaxonomyNode;
    if (isIXPTaxonomyFieldGroup(node)) {
      expectTypeOf(node).toEqualTypeOf<IXPTaxonomyFieldGroup>();
      expectTypeOf(getIXPFieldGroupRecord(node)).toEqualTypeOf<IXPFieldGroupRecord>();
    }
  });

  it('should reject a field at the top level of the taxonomy', () => {
    // @ts-expect-error -- every top-level entry is a group
    const properties: IXPTaxonomy['properties'] = { Number: field('number') };
    expectTypeOf(properties).not.toBeAny();
  });

  it('should require an array group to declare its rows', () => {
    // @ts-expect-error -- items is required
    const group: IXPTaxonomyArrayFieldGroup = {
      type: IXPFieldGroupType.Array,
      'x-uipath-field-group-id': 'items',
    };
    expectTypeOf(group).not.toBeAny();
  });

  it('should require an object group to declare its contents', () => {
    // @ts-expect-error -- properties, required and additionalProperties are required
    const group: IXPTaxonomyObjectFieldGroup = {
      type: IXPFieldGroupType.Object,
      'x-uipath-field-group-id': 'vendor',
    };
    expectTypeOf(group).not.toBeAny();
  });
});
