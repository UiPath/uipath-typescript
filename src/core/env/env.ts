import { isBrowser } from '../../utils/platform';

/** Global assigned by the deployment's `env.js`, or by the dev plugin's inline script, before the app bundle runs. */
export const UIPATH_ENV_GLOBAL = '__UIPATH_ENV__';

/**
 * Names and types of an app's environment variables. Empty here; an app augments it so property
 * access on {@link env} is typed:
 *
 * ```ts
 * declare module '@uipath/uipath-typescript' {
 *   interface UiPathEnvironment {
 *     UIPATH_PUBLIC_API_BASE_URL: string;
 *     UIPATH_PUBLIC_REGION?: string;
 *   }
 * }
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface UiPathEnvironment {}

/**
 * The deployment's environment variables, readable synchronously before sign-in.
 *
 * Property access returns the value or `undefined`; `get(name)` is the same read as a method.
 * Reads never throw: without `env.js` the object is empty.
 */
export type UiPathEnv = Readonly<UiPathEnvironment> &
  Readonly<Record<string, string | undefined>> & {
    /**
     * Reads one variable by name; the same read as property access.
     *
     * @param name - Variable name including its `UIPATH_PUBLIC_` prefix, e.g. `UIPATH_PUBLIC_REGION`
     * @returns The value, or `undefined` when the deployment did not set it
     */
    get(name: string): string | undefined;
  };

type EnvTable = Readonly<Record<string, string>>;

function readGlobal(): EnvTable {
  if (!isBrowser) return {};
  const raw: unknown = (globalThis as Record<string, unknown>)[UIPATH_ENV_GLOBAL];
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return {};

  const table: Record<string, string> = {};
  for (const [name, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === 'string') table[name] = value;
  }
  return table;
}

let cached: EnvTable | undefined;

// `in` and plain indexing would also see Object.prototype, so `env.toString` would look set.
function hasOwn(table: EnvTable, name: string): boolean {
  return Object.prototype.hasOwnProperty.call(table, name);
}

// Read on first use rather than at import: the SDK can be imported before the page exists (SSR
// tooling, tests) and the global is guaranteed only once the document has run its head scripts.
function table(): EnvTable {
  if (!cached) cached = readGlobal();
  return cached;
}

/** Test hook: forget the cached table so the next read sees the current global. */
export function resetEnvCache(): void {
  cached = undefined;
}

const GET = 'get';

export const env: UiPathEnv = new Proxy({} as UiPathEnv, {
  get(_target, property) {
    if (property === GET) return (name: string) => (hasOwn(table(), name) ? table()[name] : undefined);
    return typeof property === 'string' && hasOwn(table(), property) ? table()[property] : undefined;
  },
  has(_target, property) {
    return property === GET || (typeof property === 'string' && hasOwn(table(), property));
  },
  ownKeys() {
    return Object.keys(table());
  },
  getOwnPropertyDescriptor(_target, property) {
    if (typeof property !== 'string' || !hasOwn(table(), property)) return undefined;
    return { value: table()[property], enumerable: true, configurable: true, writable: false };
  },
  set() {
    return false;
  },
  deleteProperty() {
    return false;
  },
});
