import { describe, it, expect } from 'vitest';
import { UiPath, httpRequest } from '../../../src/core';

describe('Core barrel exports', () => {
  it('exports UiPath and httpRequest as runtime values', () => {
    expect(UiPath).toBeTypeOf('function');
    expect(httpRequest).toBeTypeOf('function');
  });
});
