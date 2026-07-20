/**
 * Coded Functions Module
 *
 * Provides access to UiPath Coded Functions — lightweight units of
 * TypeScript/JavaScript or Python code deployed to UiPath and executed on
 * demand. Discover deployed functions and invoke them with typed input and
 * output, without dealing with the underlying process and trigger plumbing.
 *
 * @example
 * ```typescript
 * import { UiPath } from '@uipath/uipath-typescript/core';
 * import { Functions } from '@uipath/uipath-typescript/functions';
 *
 * const sdk = new UiPath(config);
 * await sdk.initialize();
 *
 * const functions = new Functions(sdk);
 * const result = await functions.invoke('hello', { name: 'Alice' }, { folderId: 123 });
 * ```
 *
 * @module
 */

export { FunctionService as Functions, FunctionService } from './functions';

export * from '../../../models/orchestrator/functions.types';
export * from '../../../models/orchestrator/functions.models';
