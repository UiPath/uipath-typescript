import { FunctionGetAllOptions, FunctionInvokeOptions, FunctionRef, RawFunctionGetResponse } from './functions.types';
import { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../../utils/pagination';
import { ValidationError } from '../../core/errors/validation';

/** Combined response type for function data with bound methods. */
export type FunctionGetResponse = RawFunctionGetResponse & FunctionMethods;

/**
 *
 * @experimental
 *
 * /// warning
 * Preview: This service is experimental and may change or be removed in future releases.
 * ///
 *
 * Service for invoking UiPath Coded Functions.
 *
 * Coded functions are lightweight units of TypeScript/JavaScript or Python code
 * deployed to UiPath and executed on demand. Each function is packaged as a
 * process, exposed through an HTTP endpoint, and uniquely named within its folder.
 * This service lets you discover deployed functions and invoke them with typed
 * input and output — without dealing with the underlying process and trigger plumbing.
 *
 * ### Usage
 *
 * Prerequisites: Initialize the SDK first - see [Getting Started](/uipath-typescript/getting-started/#import-initialize)
 *
 * ```typescript
 * import { Functions } from '@uipath/uipath-typescript/functions';
 *
 * const functions = new Functions(sdk);
 * const result = await functions.invoke({ name: 'my-function' }, { amount: 42 }, { folderId: <folderId> });
 * ```
 */
export interface FunctionServiceModel {
  /**
   * Gets all functions in a folder with optional filtering and pagination.
   *
   * @experimental
   *
   * /// warning
   * Preview: This method is experimental and may change or be removed in future releases.
   * ///
   *
   * Returns each function's identity (name, slug, HTTP method), state, and
   * packaging details, with an {@link FunctionMethods.invoke | invoke} method
   * bound to each item. Folder context is required — pass one of `folderId`,
   * `folderKey`, or `folderPath` in the options, or initialize the SDK with a
   * folder context.
   *
   * One package can expose several functions, so filter on `processName`,
   * `processSlug`, or `processKey` to narrow the result to a single package.
   *
   * @param options - Query options including folder scoping (`folderId` / `folderKey` / `folderPath`), filtering, and pagination options
   * @returns Promise resolving to either an array of functions {@link NonPaginatedResponse}<{@link FunctionGetResponse}> or a {@link PaginatedResponse}<{@link FunctionGetResponse}> when pagination options are used.
   * @example
   * ```typescript
   * // Get all functions in a folder
   * const deployed = await functions.getAll({ folderId: <folderId> });
   *
   * // By folder path
   * const shared = await functions.getAll({ folderPath: 'Shared/Finance' });
   *
   * // With filtering
   * const enabled = await functions.getAll({
   *   folderId: <folderId>,
   *   filter: 'enabled eq true',
   *   orderby: 'name asc',
   * });
   *
   * // Only the functions deployed from one package
   * const fromPackage = await functions.getAll({
   *   folderId: <folderId>,
   *   filter: "processName eq 'my-functions'",
   * });
   *
   * // First page with pagination
   * const page1 = await functions.getAll({ folderId: <folderId>, pageSize: 10 });
   *
   * // Navigate using cursor
   * if (page1.hasNextPage) {
   *   const page2 = await functions.getAll({ folderId: <folderId>, cursor: page1.nextCursor });
   * }
   * ```
   */
  getAll<T extends FunctionGetAllOptions = FunctionGetAllOptions>(
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<FunctionGetResponse>
      : NonPaginatedResponse<FunctionGetResponse>
  >;

  /**
   * Invokes a function and returns its output.
   *
   * @experimental
   *
   * /// warning
   * Preview: This method is experimental and may change or be removed in future releases.
   * ///
   *
   * The call is synchronous — it resolves with the function's output.
   *
   * Type the input and output by supplying the generics — they should match the
   * input/output schema the function declares. Folder context is required — pass
   * one of `folderId`, `folderKey`, or `folderPath` in the options, or initialize
   * the SDK with a folder context.
   *
   * @param func - Function to invoke. Currently identified by `name` (unique within
   *   a folder); additional identifiers may be added in future releases.
   * @param input - Input for the function, sent as the request body (or as query
   *   parameters for functions declared with the `Get` method). Defaults to an empty object.
   * @param options - Folder scoping (`folderId` / `folderKey` / `folderPath`) and
   *   parent job attribution (`jobKey`)
   * @returns Promise resolving to the function's output
   *
   * @example
   * ```typescript
   * // Invoke a function
   * const result = await functions.invoke({ name: 'hello' }, { name: 'Alice' }, { folderId: <folderId> });
   * ```
   *
   * @example
   * ```typescript
   * // Typed input and output, attributed to a parent job's licensing transaction
   * interface SyncInput { since: string }
   * interface SyncOutput { processed: number }
   *
   * const result = await functions.invoke<SyncInput, SyncOutput>(
   *   { name: 'sync-invoices' },
   *   { since: '2026-01-01' },
   *   { folderPath: 'Shared/Finance', jobKey: '<parentJobKey>' }
   * );
   * console.log(result.processed);
   * ```
   */
  invoke<TInput extends object = Record<string, unknown>, TOutput = unknown>(
    func: FunctionRef,
    input?: TInput,
    options?: FunctionInvokeOptions
  ): Promise<TOutput>;
}

/**
 * Methods available on function response objects.
 * These are bound to the function data and delegate to the service.
 */
export interface FunctionMethods {
  /**
   * Invokes this function and returns its output.
   *
   * @experimental
   *
   * /// warning
   * Preview: This method is experimental and may change or be removed in future releases.
   * ///
   *
   * @param input - Input for the function, sent as the request body (or as query
   *   parameters for functions declared with the `Get` method). Defaults to an empty object.
   * @returns Promise resolving to the function's output
   *
   * @example
   * ```typescript
   * const deployed = await functions.getAll({ folderId: <folderId> });
   * const hello = deployed.items.find(f => f.name === 'hello');
   *
   * if (hello) {
   *   const result = await hello.invoke({ name: 'Alice' });
   * }
   * ```
   */
  invoke<TInput extends object = Record<string, unknown>, TOutput = unknown>(
    input?: TInput
  ): Promise<TOutput>;
}

/**
 * Creates methods for a function response object.
 *
 * @param functionData - The transformed function data
 * @param service - The function service instance
 * @returns Object containing function methods
 */
function createFunctionMethods(
  functionData: RawFunctionGetResponse,
  service: FunctionServiceModel
): FunctionMethods {
  return {
    async invoke<TInput extends object = Record<string, unknown>, TOutput = unknown>(
      input?: TInput
    ): Promise<TOutput> {
      if (!functionData.name) throw new ValidationError({ message: 'Function name is undefined' });
      if (!functionData.folderId) throw new ValidationError({ message: 'Function folderId is undefined' });
      return service.invoke<TInput, TOutput>({ name: functionData.name }, input, { folderId: functionData.folderId });
    },
  };
}

/**
 * Creates a function response with bound methods.
 *
 * @param functionData - The transformed function data
 * @param service - The function service instance
 * @returns A function object with added methods
 */
export function createFunctionWithMethods(
  functionData: RawFunctionGetResponse,
  service: FunctionServiceModel
): FunctionGetResponse {
  const methods = createFunctionMethods(functionData, service);
  return Object.assign({}, functionData, methods);
}
