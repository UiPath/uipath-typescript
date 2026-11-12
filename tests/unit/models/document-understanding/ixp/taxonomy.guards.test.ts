import { describe, it, expect } from 'vitest';
import { isIXPTaxonomyFieldGroup } from '@/models/document-understanding/ixp/taxonomy.guards';
import { IXP_TEST_CONSTANTS } from '@tests/utils/constants';

describe('isIXPTaxonomyFieldGroup', () => {
  it('should return true for an array group', () => {
    expect(isIXPTaxonomyFieldGroup(IXP_TEST_CONSTANTS.ARRAY_GROUP)).toBe(true);
  });

  it('should return true for a nullable object group', () => {
    expect(isIXPTaxonomyFieldGroup(IXP_TEST_CONSTANTS.NULLABLE_OBJECT_GROUP)).toBe(true);
  });

  it('should return false for a field', () => {
    expect(isIXPTaxonomyFieldGroup(IXP_TEST_CONSTANTS.FIELD)).toBe(false);
  });
});
