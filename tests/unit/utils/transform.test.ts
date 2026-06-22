import { describe, expect, it } from 'vitest';
import {
  rewriteODataIdentifiers,
  transformData,
  transformOptions,
} from '../../../src/utils/transform';

describe('transformData', () => {
  it('renames a single mapped key', () => {
    expect(transformData({ id: '123', userName: 'john' }, { id: 'userId', userName: 'name' }))
      .toEqual({ userId: '123', name: 'john' });
  });

  it('passes through keys that are not in the mapping', () => {
    expect(transformData({ id: 1, other: 'x' }, { id: 'userId' }))
      .toEqual({ userId: 1, other: 'x' });
  });

  it('drops the original key (does not keep both source and target)', () => {
    const result = transformData({ releaseKey: 'abc' }, { releaseKey: 'processKey' });
    expect(result).toEqual({ processKey: 'abc' });
    expect((result as Record<string, unknown>).releaseKey).toBeUndefined();
  });

  it('does NOT chain renames through the mapping (a→b→c becomes b, not c)', () => {
    // The chaining behaviour of the previous implementation is intentionally removed:
    // each rename is independent and applies only when the source is in the input.
    expect(transformData({ a: 1 }, { a: 'b', b: 'c' })).toEqual({ b: 1 });
  });

  it('handles inputs that match BOTH ends of a chained mapping without producing a chain', () => {
    // Both `releaseKey` and `processKey` present in input → each is renamed once,
    // independently. No silent overwriting via chained rename.
    const out = transformData(
      { releaseKey: 'list-val', processKey: 'start-val' },
      { releaseKey: 'processKey', processKey: 'packageKey' },
    );
    // Both target keys are present, each carrying the value from their own source.
    // (Last-write-wins is irrelevant here since target keys don't collide.)
    expect(out).toEqual({ processKey: 'list-val', packageKey: 'start-val' });
  });

  it('recurses through arrays of objects', () => {
    expect(
      transformData(
        [{ id: 1 }, { id: 2 }],
        { id: 'userId' },
      ),
    ).toEqual([{ userId: 1 }, { userId: 2 }]);
  });

  it('returns an empty object for empty input', () => {
    expect(transformData({}, { a: 'b' })).toEqual({});
  });
});

describe('rewriteODataIdentifiers', () => {
  const requestMap = {
    // SDK → API
    processName: 'releaseName',
    createdTime: 'creationTime',
    folderId: 'organizationUnitId',
  };

  it('rewrites a simple equality clause', () => {
    expect(rewriteODataIdentifiers("processName eq 'X'", requestMap)).toBe(
      "releaseName eq 'X'",
    );
  });

  it('rewrites identifiers but preserves quoted string literals', () => {
    expect(
      rewriteODataIdentifiers("processName eq 'processName'", requestMap),
    ).toBe("releaseName eq 'processName'");
  });

  it('handles escaped single quotes inside string literals', () => {
    expect(
      rewriteODataIdentifiers(
        "processName eq 'It''s a name with processName inside'",
        requestMap,
      ),
    ).toBe("releaseName eq 'It''s a name with processName inside'");
  });

  it('rewrites identifiers across multi-clause filters with parens', () => {
    expect(
      rewriteODataIdentifiers(
        "(processName eq 'a') and (folderId eq 42)",
        requestMap,
      ),
    ).toBe("(releaseName eq 'a') and (organizationUnitId eq 42)");
  });

  it('rewrites identifiers inside function arguments', () => {
    expect(
      rewriteODataIdentifiers("contains(processName, 'inv')", requestMap),
    ).toBe("contains(releaseName, 'inv')");
  });

  it('handles orderby with asc/desc and commas', () => {
    expect(
      rewriteODataIdentifiers('processName asc,createdTime desc', requestMap),
    ).toBe('releaseName asc,creationTime desc');
  });

  it('handles select with comma-separated identifiers', () => {
    expect(
      rewriteODataIdentifiers('processName,createdTime,id', requestMap),
    ).toBe('releaseName,creationTime,id');
  });

  it('does not partially match longer identifiers', () => {
    expect(
      rewriteODataIdentifiers(
        "processNameSuffix eq 'X'",
        { processName: 'releaseName' },
      ),
    ).toBe("processNameSuffix eq 'X'");
  });

  it('rewrites tokens that overlap OData operators when present in the map (caller must avoid key collisions)', () => {
    // Map contains identifier `eq` (pathological — operator collision).
    // Demonstrates that token replacement is purely lookup-based: callers
    // are expected to keep their field maps free of operator collisions.
    const operatorMap = { eq: 'equals' };
    expect(rewriteODataIdentifiers("a eq 'x'", operatorMap)).toBe(
      "a equals 'x'",
    );
  });

  it('returns empty string unchanged', () => {
    expect(rewriteODataIdentifiers('', requestMap)).toBe('');
  });

  it('returns the input unchanged when the map is empty', () => {
    expect(rewriteODataIdentifiers("processName eq 'X'", {})).toBe(
      "processName eq 'X'",
    );
  });

  it('preserves whitespace and operators between identifiers', () => {
    expect(
      rewriteODataIdentifiers(
        '  processName   gt   42  and   folderId  lt  7',
        requestMap,
      ),
    ).toBe('  releaseName   gt   42  and   organizationUnitId  lt  7');
  });
});

describe('transformOptions', () => {
  // Response map: API → SDK (reversed internally before applying).
  const responseMap = {
    releaseName: 'processName',
    creationTime: 'createdTime',
    organizationUnitId: 'folderId',
  };

  it('rewrites all four OData string params', () => {
    const out = transformOptions(
      {
        filter: "processName eq 'X'",
        orderby: 'createdTime desc',
        select: 'processName,createdTime',
        expand: 'processName',
      },
      responseMap,
    );
    expect(out).toEqual({
      filter: "releaseName eq 'X'",
      orderby: 'creationTime desc',
      select: 'releaseName,creationTime',
      expand: 'releaseName',
    });
  });

  it('passes through unrelated options unchanged', () => {
    const out = transformOptions(
      {
        filter: "processName eq 'X'",
        pageSize: 10,
        folderId: 42,
      },
      responseMap,
    );
    expect(out).toEqual({
      filter: "releaseName eq 'X'",
      pageSize: 10,
      folderId: 42,
    });
  });

  it('ignores non-string values on OData keys', () => {
    const out = transformOptions(
      { filter: undefined, orderby: null },
      responseMap,
    );
    expect(out).toEqual({ filter: undefined, orderby: null });
  });

  it('is a no-op when the response map is empty', () => {
    const input = { filter: "processName eq 'X'" };
    expect(transformOptions(input, {})).toEqual(input);
  });

  it('does not mutate the input object', () => {
    const input = { filter: "processName eq 'X'" };
    const out = transformOptions(input, responseMap);
    expect(input.filter).toBe("processName eq 'X'");
    expect(out.filter).toBe("releaseName eq 'X'");
  });
});
