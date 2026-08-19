import { describe, it, expect, afterEach } from 'vitest';
import { resolveOverride } from '../../../../src/utils/overrides/resolve-override';
import type { ResourceOverrides } from '../../../../src/utils/overrides/overrides.types';

const KEY = Symbol.for('uipath.resourceOverwrites.v1');

// Keys are the publisher's: `asset` is Orchestrator's type prefix, `MyAsset` the design-time name.
const ASSET: ResourceOverrides = {
  'asset.MyAsset': { name: 'Prod-MyAsset', folderPath: 'Finance/Prod' },
};

function install(source: () => ResourceOverrides | undefined): void {
  (globalThis as Record<symbol, unknown>)[KEY] = source;
}

afterEach(() => {
  delete (globalThis as Record<symbol, unknown>)[KEY];
});

describe('resolveOverride', () => {
  it('redirects a name-addressed lookup to the configured resource', () => {
    install(() => ASSET);
    expect(resolveOverride('Asset', 'MyAsset')).toEqual({
      name: 'Prod-MyAsset',
      folderPath: 'Finance/Prod',
    });
  });

  it('maps the SDK resource label to the type prefix the publisher spells', () => {
    install(() => ({ 'bucket.Reports': { name: 'B' }, 'process.Invoices': { name: 'P' } }));
    expect(resolveOverride('Bucket', 'Reports')?.name).toBe('B');
    expect(resolveOverride('Process', 'Invoices')?.name).toBe('P');
  });

  it('matches names case-sensitively — the publisher owns the spelling', () => {
    install(() => ASSET);
    expect(resolveOverride('Asset', 'myasset')).toBeUndefined();
    expect(resolveOverride('Asset', 'MYASSET')).toBeUndefined();
  });

  it('keeps entries differing only in case distinct', () => {
    install(() => ({ 'asset.A': { name: 'upper' }, 'asset.a': { name: 'lower' } }));
    expect(resolveOverride('Asset', 'A')?.name).toBe('upper');
    expect(resolveOverride('Asset', 'a')?.name).toBe('lower');
  });

  it('leaves a resource the publisher does not describe alone', () => {
    install(() => ({ 'taskcatalog.Catalog': { name: 'X' }, 'TaskCatalog.Catalog': { name: 'Y' } }));
    expect(resolveOverride('TaskCatalog', 'Catalog')).toBeUndefined();
    expect(resolveOverride('Function', 'Catalog')).toBeUndefined();
  });

  it('projects only the fields the SDK acts on, leaving the rest of the bag behind', () => {
    install(() => ({ 'asset.A': { name: 'A', folderPath: 'Finance', ConnectionId: 'c-1' } }));
    expect(resolveOverride('Asset', 'A')).toEqual({ name: 'A', folderPath: 'Finance' });
  });

  it('matches the folder-scoped entry when the caller names a folder', () => {
    install(() => ({
      'asset.A': { name: 'unscoped' },
      'asset.A.Shared/Apps': { name: 'scoped' },
    }));
    expect(resolveOverride('Asset', 'A', 'Shared/Apps')?.name).toBe('scoped');
  });

  it('matches the scoped folder segment case-sensitively too', () => {
    install(() => ({
      'asset.A.Shared/Apps': { name: 'scoped' },
    }));
    expect(resolveOverride('Asset', 'A', 'shared/apps')).toBeUndefined();
  });

  it('falls back to the unscoped entry when the scoped key is not published — solution-inline shape', () => {
    install(() => ({ 'asset.A': { name: 'unscoped' } }));
    expect(resolveOverride('Asset', 'A', 'Shared/Apps')?.name).toBe('unscoped');
  });

  it('does not narrow an unscoped call to a folder-scoped entry either', () => {
    install(() => ({ 'asset.A.Shared/Apps': { name: 'scoped' } }));
    expect(resolveOverride('Asset', 'A')).toBeUndefined();
  });

  it('addresses an entry by type and name alone — the target folder rides in the value', () => {
    install(() => ({ 'asset.A': { name: 'A', folderPath: 'Finance/Prod' } }));
    expect(resolveOverride('Asset', 'A')?.folderPath).toBe('Finance/Prod');
  });

  it('reports undefined for an unlisted resource, leaving the caller on its own name', () => {
    install(() => ASSET);
    expect(resolveOverride('Asset', 'Other')).toBeUndefined();
    expect(resolveOverride('Bucket', 'MyAsset')).toBeUndefined();
  });

  it('reports undefined when no host published a table', () => {
    expect(resolveOverride('Asset', 'MyAsset')).toBeUndefined();
  });

  it('re-reads the channel per lookup, so a host installed later is seen', () => {
    expect(resolveOverride('Asset', 'MyAsset')).toBeUndefined();

    install(() => ASSET);
    expect(resolveOverride('Asset', 'MyAsset')?.name).toBe('Prod-MyAsset');
  });

  it('asks the host per lookup, so a pooled process answers each invocation from its own table', () => {
    let current: ResourceOverrides | undefined;
    install(() => current);

    current = { 'asset.Shared': { name: 'user-A' } };
    expect(resolveOverride('Asset', 'Shared')?.name).toBe('user-A');
    current = { 'asset.Shared': { name: 'user-B' } };
    expect(resolveOverride('Asset', 'Shared')?.name).toBe('user-B');
  });

  it('degrades to no overrides when the host source throws, instead of failing the lookup', () => {
    install(() => {
      throw new Error('host broke');
    });
    expect(resolveOverride('Asset', 'MyAsset')).toBeUndefined();
  });
});
