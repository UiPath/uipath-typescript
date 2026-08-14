/**
 * Shared I/O contract.
 *
 * The functions import these types directly; the app imports them with
 * `import type`, so both halves share one definition and nothing is bundled
 * across the boundary. Keep this file dependency-free.
 */

/** A catalogue product. */
export interface Product {
  id: string;
  sku: string;
  name: string;
  /** One line of detail, shown on the card. */
  description: string;
  /** Groups the catalogue in the UI, and is searchable. */
  category: string;
  unitPrice: number;
  currency: string;
}

/** What the browser is allowed to ask for. */
export interface LineInput {
  productId: string;
  quantity: number;
}

/** A priced line, computed by the function from its own catalogue. */
export interface QuoteLine {
  productId: string;
  sku: string;
  name: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

/**
 * What happened to the submitted promo code.
 *
 * A rejection carries no hint about which codes are valid. The point is that
 * the list stays unreadable from the browser.
 */
export interface PromoOutcome {
  code: string;
  applied: boolean;
  /** Only set when applied. */
  percentOff?: number;
  /** Human-readable name of the offer, e.g. "Spring sale". */
  label?: string;
  /** Only set when rejected. */
  reason?: string;
}

export interface Quote {
  lines: QuoteLine[];
  subtotal: number;
  /** Zero unless a valid promo code was supplied. */
  discount: number;
  total: number;
  currency: string;
  /** Null when no code was submitted. */
  promo: PromoOutcome | null;
}

export interface ProductsOutput {
  products: Product[];
}

/** No arguments: the catalogue is small and the UI filters it locally. */
export type ProductsInput = Record<string, never>;

export interface QuoteInput {
  items: LineInput[];
  promoCode?: string;
}

/**
 * Deployed function names are package-prefixed by Orchestrator, so the `quote`
 * function inside the `functions-app-fn` package registers as `functions-app-fn_quote`.
 */
export const FUNCTION_NAMES = {
  listProducts: 'functions-app-fn_list-products',
  quote: 'functions-app-fn_quote',
} as const;

/**
 * Orchestrator Secret asset holding the valid codes, as a JSON array of
 * `{ code, percentOff, label }`. A Secret is unreadable from the browser even
 * with the signed-in user's own token, which is what forces validation into
 * the function.
 */
export const PROMO_CODES_ASSET = 'promo-codes';
