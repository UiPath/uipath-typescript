import type { UiPath } from '@uipath/uipath-typescript/core';
import { Functions } from '@uipath/uipath-typescript/functions';
import type {
  ProductsInput,
  ProductsOutput,
  Quote,
  QuoteInput,
  FUNCTION_NAMES as ContractFunctionNames,
} from '../coded-functions/lib/contract';

/**
 * Numeric id of the folder the functions are deployed to. Copy `.env.example`
 * to `.env` and set it.
 *
 * This is the folder's *numeric* id. The folder key (a GUID) is a different
 * value, used by `uip functions publish --feed-id` and by the trigger URL.
 */
const FOLDER_ID = Number(import.meta.env.VITE_UIPATH_FOLDER_ID);

if (!Number.isFinite(FOLDER_ID) || FOLDER_ID <= 0) {
  throw new Error(
    'VITE_UIPATH_FOLDER_ID is not set. Copy .env.example to .env and set it to the numeric '
      + 'id of the folder you deployed the functions to.',
  );
}

/**
 * Mirrors `FUNCTION_NAMES` from the contract.
 *
 * The contract is imported with `import type` only, so nothing crosses the
 * project boundary at build time. Annotating with `typeof` of the contract's own
 * `as const` still makes a renamed function a compile error here rather than a
 * runtime not-found.
 */
const FUNCTION_NAMES: typeof ContractFunctionNames = {
  listProducts: 'promo-shop-fn_list-products',
  quote: 'promo-shop-fn_quote',
};

export interface Api {
  listProducts(): Promise<ProductsOutput>;
  requestQuote(input: QuoteInput): Promise<Quote>;
}

/** Binds the function calls to an already-authenticated SDK instance. */
export function createApi(sdk: UiPath): Api {
  const functions = new Functions(sdk);

  return {
    listProducts() {
      return functions.invoke<ProductsInput, ProductsOutput>(
        { name: FUNCTION_NAMES.listProducts },
        {},
        { folderId: FOLDER_ID },
      );
    },

    /**
     * Prices the basket and, when a code is supplied, validates it against the
     * Secret asset. The browser sends product ids, quantities and the code.
     * Never prices, and never the code list.
     */
    requestQuote(input) {
      return functions.invoke<QuoteInput, Quote>({ name: FUNCTION_NAMES.quote }, input, {
        folderId: FOLDER_ID,
      });
    },
  };
}

/** Pulls a readable message out of whatever the SDK or function threw. */
export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Unexpected error';
}
