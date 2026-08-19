import { describe, it, expect, afterEach } from 'vitest';
import { probeChannel } from '../../../../src/utils/ambient/channel';

const KEY = Symbol.for('uipath.test.channel.v1');

function install(source: unknown): void {
  (globalThis as Record<symbol, unknown>)[KEY] = source;
}

afterEach(() => {
  delete (globalThis as Record<symbol, unknown>)[KEY];
});

describe('probeChannel', () => {
  it('reports the installed source value', () => {
    install(() => 'installed');
    expect(probeChannel<string>(KEY)()).toBe('installed');
  });

  it('asks the source on every call, so a host answers each caller from its own state', () => {
    let current = 'first';
    install(() => current);
    const channel = probeChannel<string>(KEY);

    expect(channel()).toBe('first');
    current = 'second';
    expect(channel()).toBe('second');
  });

  it('re-reads the slot per call, so a source installed after binding is still seen', () => {
    const channel = probeChannel<string>(KEY);
    expect(channel()).toBeUndefined();

    install(() => 'late');
    expect(channel()).toBe('late');
  });

  it('falls back when nothing is installed', () => {
    expect(probeChannel<string>(KEY, () => 'fallback')()).toBe('fallback');
  });

  it('prefers the installed source over the fallback', () => {
    install(() => 'installed');
    expect(probeChannel<string>(KEY, () => 'fallback')()).toBe('installed');
  });

  it('keeps an installed source that reports nothing — absence is its answer, not a miss', () => {
    install(() => undefined);
    expect(probeChannel<string>(KEY, () => 'fallback')()).toBeUndefined();
  });

  it('ignores a slot holding something that is not callable', () => {
    install({ notAFunction: true });
    expect(probeChannel<string>(KEY, () => 'fallback')()).toBe('fallback');
  });

  it('reports undefined when the installed source throws', () => {
    install(() => {
      throw new Error('host broke');
    });
    expect(probeChannel<string>(KEY, () => 'fallback')()).toBeUndefined();
  });

  it('reports undefined when the fallback throws', () => {
    expect(
      probeChannel<string>(KEY, () => {
        throw new Error('fallback broke');
      })(),
    ).toBeUndefined();
  });

  it('reports undefined with neither a source nor a fallback', () => {
    expect(probeChannel<string>(KEY)()).toBeUndefined();
  });
});
