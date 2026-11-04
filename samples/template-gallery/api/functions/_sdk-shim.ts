// Minimal stand-in for `@uipath/coded-functions-js-sdk` so `copies.ts` is written exactly as a
// coded function and can move to a `uip function` project unchanged once the tool is installed.
// Only the pieces the handler uses are modelled.

export interface FunctionUser {
  sub: string;
  name?: string;
  email?: string;
  accessToken?: string;
}

export interface FunctionPlatform {
  baseUrl: string;
  orgId: string;
  tenantId: string;
  folderKey: string | null;
}

export interface FunctionContext {
  user: FunctionUser | null;
  robot: { key: string; accessToken: string } | null;
  platform: FunctionPlatform | null;
  headers: Record<string, string>;
  params: Record<string, string>;
  logger: { info: (m: string) => void; warn: (m: string) => void; error: (m: string) => void };
}

export class FunctionError extends Error {
  readonly status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.name = 'FunctionError';
    this.status = status;
  }
}

export interface FunctionDefinition<I, O> {
  name: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path?: string;
  input: unknown;
  output: unknown;
  handler: (input: I, ctx: FunctionContext) => Promise<O>;
}

export function defineFunction<I, O>(def: FunctionDefinition<I, O>): FunctionDefinition<I, O> {
  return def;
}

// The real SDK lowers the generic to a JSON Schema at build time; the local host validates nothing.
export function defineSchema<T>(): T | undefined {
  return undefined;
}
