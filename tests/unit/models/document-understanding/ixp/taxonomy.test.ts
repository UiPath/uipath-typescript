import { describe, it, expect } from 'vitest';
import {
  getIXPFieldGroupRecord,
  isIXPTaxonomyFieldGroup,
  type IXPFieldGroupRecord,
  type IXPTaxonomyNode,
} from '@/models/document-understanding';
import { field, flatTaxonomy, nestedTaxonomy } from './taxonomy.fixtures';

/** Every field's path, walking nested groups through the guard. */
const fieldPaths = (record: IXPFieldGroupRecord, prefix: string[] = []): string[] =>
  Object.entries(record.properties).flatMap(([name, node]) =>
    isIXPTaxonomyFieldGroup(node)
      ? fieldPaths(getIXPFieldGroupRecord(node), [...prefix, name])
      : [[...prefix, name].join('/')],
  );

describe('isIXPTaxonomyFieldGroup', () => {
  it('should be true for array and object groups and false for fields', () => {
    const invoice = nestedTaxonomy.properties.Invoice;
    const { Number: number, Items: items, Vendor: vendor } = getIXPFieldGroupRecord(invoice).properties;
    expect(isIXPTaxonomyFieldGroup(invoice)).toBe(true);
    expect(isIXPTaxonomyFieldGroup(items)).toBe(true);
    expect(isIXPTaxonomyFieldGroup(vendor)).toBe(true);
    expect(isIXPTaxonomyFieldGroup(number)).toBe(false);
    expect(isIXPTaxonomyFieldGroup(field('number'))).toBe(false);
  });

  it('should be false for a node whose type is not a group type', () => {
    // @ts-expect-error -- deliberately malformed: 'type' is present but is not a group type
    const node: IXPTaxonomyNode = { ...field('number'), type: 'string' };
    expect(isIXPTaxonomyFieldGroup(node)).toBe(false);
  });
});

describe('getIXPFieldGroupRecord', () => {
  it('should return the row schema of an array group and an object group itself', () => {
    const invoice = nestedTaxonomy.properties.Invoice;
    const vendor = invoice.items.properties.Vendor;
    if (!isIXPTaxonomyFieldGroup(vendor)) {
      throw new Error('fixture: Vendor is a field group');
    }
    expect(getIXPFieldGroupRecord(invoice)).toBe(invoice.items);
    expect(getIXPFieldGroupRecord(vendor)).toBe(vendor);
  });
});

describe('walking a taxonomy', () => {
  it('should walk groups nested to any depth', () => {
    const paths = Object.entries(nestedTaxonomy.properties).flatMap(([name, group]) =>
      fieldPaths(getIXPFieldGroupRecord(group), [name]),
    );
    expect(paths).toEqual([
      'Invoice/Number',
      'Invoice/Items/Quantity',
      'Invoice/Items/Tax/Rate',
      'Invoice/Vendor/Name',
    ]);
  });

  it('should keep flattened groups at the top level, under their flat names', () => {
    const paths = Object.entries(flatTaxonomy.properties).flatMap(([name, group]) =>
      fieldPaths(getIXPFieldGroupRecord(group), [name]),
    );
    expect(paths).toEqual(['Invoice/Number', 'Invoice > Items/Quantity']);
  });
});
