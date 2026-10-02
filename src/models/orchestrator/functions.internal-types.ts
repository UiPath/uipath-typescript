/**
 * Internal types for the Functions service — raw API wire formats before
 * transformation. Not exported through the public barrel.
 */

import type { RawFunctionGetResponse } from './functions.types';


/**
 * Raw HTTP trigger row from `GET /odata/HttpTriggers` after
 * `pascalToCamelCaseKeys()`. Only the fields consumed by the service are
 * declared; the API returns many more job-runner fields that the SDK drops.
 */
export interface RawFunctionTrigger {
  /** Trigger identifier (GUID). */
  id: string;
  /** Trigger name — unique within a folder. */
  name: string;
  /** URL path segment within the package. */
  slug: string;
  /** HTTP verb, e.g. `Post`. */
  method: string;
  /** Description from the function definition. */
  description?: string | null;
  /** Whether the trigger is enabled. */
  enabled: boolean;
  /** Default input arguments as a JSON string. */
  inputArguments?: string | null;
  /** Source file path inside the package. */
  entryPointPath?: string | null;
  /**
   * The route Orchestrator matches invocations against:
   * `<Method> <route> <FOLDER_KEY>`, e.g. `Post my-functions/hello 4DBF78CB-…`.
   */
  externalReference?: string | null;
  /** Key (GUID) of the release that owns the trigger. */
  releaseKey: string;
  /** Numeric ID of the folder the trigger lives in. */
  organizationUnitId: number;
  /** Release (process) that packages the function. */
  release: {
    name: string;
    slug: string;
  };
}

/** Where to send a function's invocation: `orchestrator_/t/<folderKey>/<route>`. */
export interface FunctionInvokeTarget {
  /** Folder key (GUID) of the folder the trigger lives in. */
  folderKey: string;
  /** The trigger's path within the folder, e.g. `my-functions/hello` or `hello`. */
  route: string;
}

/** A function found by name, with the invoke target its trigger declares when it declares one. */
export interface ResolvedFunction {
  fn: RawFunctionGetResponse;
  target?: FunctionInvokeTarget;
}

/**
 * Raw folder entity from `GET /odata/Folders({id})` — PascalCase wire format,
 * limited to the field the Functions service consumes.
 */
export interface RawFolderResponse {
  /** Folder key (GUID) — the `t/{key}` segment of the function invoke URL. */
  Key: string;
}

export type { StudioWebLicense } from '../../core/licensing/types';

/**
 * Options for acquiring a license directly.
 *
 * @internal
 */
export interface FunctionAcquireLicenseOptions {
  /**
   * Acquires a fresh license instead of returning the one already held.
   * Defaults to `false`.
   */
  refresh?: boolean;
}

