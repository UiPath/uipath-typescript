/** What a host installs on a channel: resolves the value for whoever is asking. */
export type ChannelSource<T> = () => T | undefined;

/** The source currently holding the channel's slot, if anything does. */
function currentSource<T>(key: symbol): ChannelSource<T> | undefined {
  const slot = (globalThis as Record<symbol, unknown>)[key];
  return typeof slot === 'function' ? (slot as ChannelSource<T>) : undefined;
}

/** Binds a prober for one channel: the installed source when there is one, else `fallback`. */
export function probeChannel<T>(key: symbol, fallback?: ChannelSource<T>): ChannelSource<T> {
  return () => {
    const source = currentSource<T>(key) ?? fallback;
    if (!source) return undefined;
    try {
      return source();
    } catch {
      return undefined;
    }
  };
}
