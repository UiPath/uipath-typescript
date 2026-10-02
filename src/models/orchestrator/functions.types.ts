import { FolderScopedOptions, RequestOptions } from '../common/types';
import { PaginationOptions } from '../../utils/pagination';

/**
 * HTTP verb a coded function accepts, declared via `defineFunction` in the
 * function's source.
 */
export enum FunctionHttpMethod {
  Get = 'Get',
  Post = 'Post',
  Put = 'Put',
  Patch = 'Patch',
  Delete = 'Delete',
}

/**
 * A deployed coded function.
 *
 * A coded function is packaged as a process and exposed for invocation through
 * an HTTP endpoint. Each function is uniquely named within its folder.
 */
export interface RawFunctionGetResponse {
  /** Unique identifier (GUID) of the function's HTTP endpoint. */
  id: string;
  /**
   * Function name — unique within a folder. Functions deployed since July 2026
   * carry their process name as a prefix, e.g. `my-functions_hello`.
   */
  name: string;
  /** URL path segment of the function within its package. */
  slug: string;
  /** HTTP verb the function accepts. */
  method: FunctionHttpMethod;
  /** Human-readable description from the function definition. */
  description?: string | null;
  /** Whether the function can currently be invoked. */
  enabled: boolean;
  /** Sample input arguments as a JSON string — parse with `JSON.parse()`. */
  inputArguments?: string | null;
  /** Source file path of the function inside its package (e.g. `content/functions/hello.ts`). */
  entryPointPath?: string | null;
  /** Key (GUID) of the process that packages this function. */
  processKey: string;
  /** Display name of the process that packages this function. */
  processName: string;
  /** URL slug of the process that packages this function. */
  processSlug: string;
  /** ID of the folder the function lives in. */
  folderId: number;
}

/**
 * Options for retrieving functions with folder scoping, filtering, and pagination.
 *
 * Folder context is required: pass one of `folderId`, `folderKey`, or `folderPath`,
 * or initialize the SDK with a folder context.
 */
export type FunctionGetAllOptions = RequestOptions & PaginationOptions & FolderScopedOptions;

/**
 * Options for invoking a function.
 *
 * Folder context is required: pass one of `folderId`, `folderKey`, or `folderPath`,
 * or initialize the SDK with a folder context.
 */
export interface FunctionInvokeOptions extends FolderScopedOptions {
  /** Key (GUID) of the job this invocation belongs to, so the run is attributed to it. */
  jobKey?: string;
  /**
   * Re-acquires the signed-in user's license in the background. Defaults to `false`.
   *
   * @deprecated A coded app acquires the license on sign-in; the invocation never waits for it.
   */
  refreshLicense?: boolean;
}

/**
 * Identifies the function to invoke by name; additional identifiers (for
 * example, `id`) may be added in future releases.
 */
export interface FunctionRef {
  /**
   * Name of the function to invoke: either the name it is declared with in its
   * source (`hello`) or the full name shown by `getAll` (`my-functions_hello`).
   */
  name: string;
  /**
   * Name of the process the function is deployed as. Only needed when several
   * processes in the folder declare a function with the same name.
   */
  processName?: string;
}
