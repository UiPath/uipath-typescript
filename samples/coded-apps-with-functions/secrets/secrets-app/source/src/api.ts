import type { UiPath } from '@uipath/uipath-typescript/core';
import { Functions } from '@uipath/uipath-typescript/functions';
import {
  FUNCTION_NAMES,
  qualifiedName,
  type ReadCredentialInput,
  type ReadCredentialOutput,
} from '../../../secrets-functions/lib/contract';

/**
 * One wrapper per function, typed from the shared contract in
 * `secrets-functions/lib/contract.ts`.
 *
 * Importing the contract rather than re-declaring the shapes is what makes a
 * mismatch a compile error instead of a runtime 400 — the app and the functions
 * ship as one solution, so they should fail to build together, not fail apart.
 */

/**
 * Numeric id of the folder the solution deployed into. Locally, copy
 * `.env.example` to `.env` and set it; the deployed app does not need it,
 * because the platform supplies the folder context.
 */
const FOLDER_ID = Number(import.meta.env.VITE_UIPATH_FOLDER_ID);

const folderOption = Number.isFinite(FOLDER_ID) && FOLDER_ID > 0 ? { folderId: FOLDER_ID } : undefined;

export type { ReadCredentialOutput };

/**
 * A function's own `FunctionError` text arrives on the thrown SDK error. That
 * message is the useful part — the allowlist guard explains itself there — so
 * the app shows it rather than replacing it with something generic.
 */
export function errorMessage(e: unknown): string {
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message);
  return String(e);
}

export function createApi(sdk: UiPath) {
  const functions = new Functions(sdk);

  return {
    /** Read the credential with the function's own robot identity. */
    readCredential: async (input: ReadCredentialInput = {}): Promise<ReadCredentialOutput> =>
      (await functions.invoke(
        { name: qualifiedName(FUNCTION_NAMES.readCredential) },
        input as Record<string, unknown>,
        folderOption,
      )) as ReadCredentialOutput,
  };
}

export type Api = ReturnType<typeof createApi>;
