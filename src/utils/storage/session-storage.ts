/**
 * Session storage that may not exist: absent outside a browser, and a browser
 * can deny it or fail a write. Reads come back `undefined`, and a write that
 * did not land returns `false`, rather than throwing.
 */

function storage(): Storage | undefined {
  try {
    return globalThis.sessionStorage;
  } catch (error) {
    console.warn('[UiPath SDK] Session storage is unavailable', error);
    return undefined;
  }
}

export function readSession(key: string): string | undefined {
  try {
    return storage()?.getItem(key) ?? undefined;
  } catch (error) {
    console.warn(`[UiPath SDK] Could not read ${key} from session storage`, error);
    return undefined;
  }
}

export function writeSession(key: string, value: string): boolean {
  try {
    const store = storage();
    store?.setItem(key, value);
    return store !== undefined;
  } catch (error) {
    console.warn(`[UiPath SDK] Could not write ${key} to session storage`, error);
    return false;
  }
}

export function removeSession(key: string): void {
  try {
    storage()?.removeItem(key);
  } catch (error) {
    console.warn(`[UiPath SDK] Could not remove ${key} from session storage`, error);
  }
}

export function readSessionJson<T>(key: string): T | undefined {
  const stored = readSession(key);
  if (!stored) return undefined;
  try {
    return (JSON.parse(stored) as T | null) ?? undefined;
  } catch (error) {
    console.warn(`[UiPath SDK] Could not parse ${key} from session storage`, error);
    return undefined;
  }
}

export function writeSessionJson(key: string, value: unknown): boolean {
  return writeSession(key, JSON.stringify(value));
}
