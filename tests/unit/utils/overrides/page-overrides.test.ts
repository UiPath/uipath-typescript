import { describe, it, expect, vi, afterEach } from 'vitest';

const ELEMENT_ID = 'uipath-overrides';

const originalDocument = global.document;

function stubDocument(text: string | null, id: string = ELEMENT_ID) {
  const getElementById = vi.fn((requested: string) =>
    requested === id ? ({ textContent: text } as HTMLElement) : null,
  );
  global.document = { getElementById } as unknown as Document;
  return getElementById;
}

async function loadModule(isBrowser: boolean) {
  vi.resetModules();
  vi.doMock('@/utils/platform', () => ({ isBrowser }));
  return import('@/utils/overrides/page-overrides');
}

afterEach(() => {
  vi.doUnmock('@/utils/platform');
  global.document = originalDocument;
});

describe('pageOverrides', () => {
  it('reads and narrows the table published on the page', async () => {
    stubDocument(JSON.stringify({ 'Asset.MyAsset': { name: 'Prod', folderPath: 'Finance' } }));
    const { pageOverrides } = await loadModule(true);

    expect(pageOverrides()).toEqual({ 'Asset.MyAsset': { name: 'Prod', folderPath: 'Finance' } });
  });

  it('reads the document once, then answers from what it read', async () => {
    const getElementById = stubDocument(JSON.stringify({ 'asset.a': { name: 'A' } }));
    const { pageOverrides } = await loadModule(true);

    pageOverrides();
    pageOverrides();
    expect(getElementById).toHaveBeenCalledTimes(1);
  });

  it('reports undefined when the page carries no such element', async () => {
    stubDocument('irrelevant', 'some-other-element');
    const { pageOverrides } = await loadModule(true);

    expect(pageOverrides()).toBeUndefined();
  });

  it('reports undefined for an empty element', async () => {
    stubDocument('');
    const { pageOverrides } = await loadModule(true);

    expect(pageOverrides()).toBeUndefined();
  });

  it('reports undefined when the payload is not valid JSON, rather than failing the lookup', async () => {
    stubDocument('{nope');
    const { pageOverrides } = await loadModule(true);

    expect(pageOverrides()).toBeUndefined();
  });

  it('never touches the document outside a browser', async () => {
    const getElementById = stubDocument(JSON.stringify({ 'asset.a': { name: 'A' } }));
    const { pageOverrides } = await loadModule(false);

    expect(pageOverrides()).toBeUndefined();
    expect(getElementById).not.toHaveBeenCalled();
  });
});

describe('asResourceOverrides', () => {
  it('drops malformed entries and keeps only string property values', async () => {
    const { asResourceOverrides } = await loadModule(true);

    expect(
      asResourceOverrides({
        'asset.Good': { name: 'A' },
        'asset.Broken': 'not-an-object',
        'process.Numbers': { name: 'P', version: 3, runAsMe: true, missing: null },
      }),
    ).toEqual({
      'asset.Good': { name: 'A' },
      'process.Numbers': { name: 'P' },
    });
  });

  it('keeps keys verbatim — the page owns their casing, and lookups match it exactly', async () => {
    const { asResourceOverrides } = await loadModule(true);

    expect(asResourceOverrides({ 'Asset.A': { name: 'Prod-Asset', folderPath: 'Finance/Prod' } })).toEqual({
      'Asset.A': { name: 'Prod-Asset', folderPath: 'Finance/Prod' },
    });
  });

  it('reports undefined for shapes carrying nothing usable', async () => {
    const { asResourceOverrides } = await loadModule(true);

    expect(asResourceOverrides({})).toBeUndefined();
    expect(asResourceOverrides([{ name: 'A' }])).toBeUndefined();
    expect(asResourceOverrides(null)).toBeUndefined();
    expect(asResourceOverrides('asset.a')).toBeUndefined();
  });
});
