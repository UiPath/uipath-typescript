import { describe, it, expect } from 'vitest';
import * as documentUnderstanding from '@/models/document-understanding';
import * as sdk from '@/index';

describe('IXP contracts exports', () => {
  it('should expose the runtime enums and guard on the document-understanding entry', () => {
    expect(documentUnderstanding.ProcessedDocumentType).toEqual({ Extraction: 'Extraction' });
    expect(documentUnderstanding.IXPReferenceKind).toEqual({ Word: 'word', Area: 'area' });
    expect(documentUnderstanding.IXPFieldGroupType).toEqual({ Array: 'array', Object: 'object' });
    expect(documentUnderstanding.isIXPTaxonomyFieldGroup).toBeTypeOf('function');
  });

  it('should keep the IXP contracts off the top-level barrel', () => {
    expect(sdk).not.toHaveProperty('ProcessedDocumentType');
    expect(sdk).not.toHaveProperty('IXPReferenceKind');
    expect(sdk).not.toHaveProperty('IXPFieldGroupType');
    expect(sdk).not.toHaveProperty('isIXPTaxonomyFieldGroup');
  });
});
