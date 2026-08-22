import { describe, it, expect, vi } from 'vitest';
import { resolveRefToId } from '../../../../src/utils/refs/resolve-ref';
import { ValidationError } from '../../../../src/core/errors';

const CALLER = 'Assets.updateValue';

describe('resolveRefToId', () => {
  it('returns id directly with an empty effectiveFolder when ref is {id} — no lookup runs', async () => {
    const byName = vi.fn();
    const byKey = vi.fn();
    const result = await resolveRefToId<number>({ id: 42 }, { byName, byKey }, CALLER);
    expect(result).toEqual({ id: 42, effectiveFolder: {} });
    expect(byName).not.toHaveBeenCalled();
    expect(byKey).not.toHaveBeenCalled();
  });

  it('invokes byName and carries the resolved folderId onto effectiveFolder', async () => {
    const byName = vi.fn().mockResolvedValue({ id: 7, folderId: 99 });
    const result = await resolveRefToId<number>({ name: 'MyAsset' }, { byName }, CALLER);
    expect(result).toEqual({ id: 7, effectiveFolder: { folderId: 99 } });
    expect(byName).toHaveBeenCalledExactlyOnceWith('MyAsset');
  });

  it('invokes byKey and carries the resolved folderId onto effectiveFolder', async () => {
    const byKey = vi.fn().mockResolvedValue({ id: 55, folderId: 12 });
    const result = await resolveRefToId<number>(
      { key: '5f6dadf1-3677-49dc-8aca-c2999dd4b3ba' },
      { byKey },
      CALLER,
    );
    expect(result).toEqual({ id: 55, effectiveFolder: { folderId: 12 } });
    expect(byKey).toHaveBeenCalledExactlyOnceWith('5f6dadf1-3677-49dc-8aca-c2999dd4b3ba');
  });

  it('omits folderId on effectiveFolder when the lookup does not supply one (non-folder-scoped services)', async () => {
    const byName = vi.fn().mockResolvedValue({ id: 'guid-abc' });
    const result = await resolveRefToId<string>({ name: 'MyEntity' }, { byName }, CALLER);
    expect(result).toEqual({ id: 'guid-abc', effectiveFolder: { folderId: undefined } });
  });

  it('supports non-numeric ids — the lookup return type carries through', async () => {
    const byName = vi.fn().mockResolvedValue({ id: 'guid-abc' });
    const result = await resolveRefToId<string>({ name: 'MyEntity' }, { byName }, CALLER);
    expect(result.id).toBe('guid-abc');
  });

  it('throws ValidationError when the ref is undefined', async () => {
    await expect(resolveRefToId<number>(undefined, {}, CALLER)).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it('throws ValidationError when neither id, name, nor key is supplied', async () => {
    await expect(resolveRefToId<number>({} as never, {}, CALLER)).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it('rejects a {name} ref when the service does not declare a byName lookup', async () => {
    await expect(
      resolveRefToId<number>({ name: 'X' }, { byKey: vi.fn() }, CALLER),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejects a {key} ref when the service does not declare a byKey lookup', async () => {
    await expect(
      resolveRefToId<number>({ key: 'guid' }, { byName: vi.fn() }, CALLER),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('includes the caller label in the error message so failures point at the offending method', async () => {
    try {
      await resolveRefToId<number>(undefined, {}, 'Buckets.uploadFile');
      throw new Error('should have thrown');
    } catch (err) {
      expect((err as Error).message).toContain('Buckets.uploadFile');
    }
  });

  it('propagates a rejection from the byName lookup', async () => {
    const byName = vi.fn().mockRejectedValue(new Error('name not found'));
    await expect(
      resolveRefToId<number>({ name: 'ghost' }, { byName }, CALLER),
    ).rejects.toThrow('name not found');
  });

  it('propagates a rejection from the byKey lookup', async () => {
    const byKey = vi.fn().mockRejectedValue(new Error('key not found'));
    await expect(
      resolveRefToId<number>({ key: 'ghost-guid' }, { byKey }, CALLER),
    ).rejects.toThrow('key not found');
  });

  it('treats id === 0 as a real value (does not fall through to the name/key branch)', async () => {
    // `id != null` avoids treating a valid `0` as missing — regression guard.
    const byName = vi.fn();
    const result = await resolveRefToId<number>({ id: 0 }, { byName }, CALLER);
    expect(result).toEqual({ id: 0, effectiveFolder: {} });
    expect(byName).not.toHaveBeenCalled();
  });

  it('treats an empty name as invalid — falls through to the ValidationError path', async () => {
    const byName = vi.fn();
    await expect(
      resolveRefToId<number>({ name: '' } as never, { byName }, CALLER),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(byName).not.toHaveBeenCalled();
  });

  it('treats an empty key as invalid — falls through to the ValidationError path', async () => {
    const byKey = vi.fn();
    await expect(
      resolveRefToId<number>({ key: '' } as never, { byKey }, CALLER),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(byKey).not.toHaveBeenCalled();
  });
});
