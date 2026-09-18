/**
 * The single source of truth for this sample's I/O types.
 *
 * The functions import it directly; the app imports it with `import type`, so a
 * mismatch between the two halves is a build error rather than a runtime 400.
 * Nothing is bundled across the boundary — the type-only import disappears at
 * compile time.
 */

export interface InvoiceLine {
  lineNo: number
  sku: string
  description: string
  quantity: number
  unitPriceEur: number
}

/** A row in the collection response: enough to render a list, no lines. */
export interface InvoiceSummary {
  invoiceId: string
  vendor: string
  status: InvoiceStatus
  currency: string
  issuedAt: string
  dueAt: string
  totalEur: number
  lineCount: number
}

export type InvoiceStatus = "draft" | "pending" | "approved" | "rejected"

/** The single-resource response: the summary plus its lines. */
export interface Invoice extends InvoiceSummary {
  poReference: string
  lines: InvoiceLine[]
}

export interface InvoiceListInput {
  /** Optional filter, applied to the collection. Query string, not a path param. */
  status?: InvoiceStatus
}

export interface InvoiceListOutput {
  invoices: InvoiceSummary[]
  /** Rows before filtering, so the UI can say "3 of 5". */
  totalCount: number
}

export interface InvoiceReadInput {
  /** Path param. */
  invoiceId: string
}

export interface InvoiceLineReadInput {
  /** Path param. */
  invoiceId: string
  /** Path param. Arrives as a string on the wire; the schema coerces it. */
  lineNo: number
}

export interface InvoiceLineReadOutput extends InvoiceLine {
  invoiceId: string
  lineTotalEur: number
}

/**
 * A deployed function's registered name is package-prefixed, so the prefix is
 * spelled once here rather than at every call site.
 */
export const FUNCTIONS_PACKAGE = "rest-backend-functions"

export const FUNCTION_NAMES = {
  invoiceList: "invoice-list",
  invoiceRead: "invoice-read",
  invoiceLineRead: "invoice-line-read",
} as const

export type FunctionName = (typeof FUNCTION_NAMES)[keyof typeof FUNCTION_NAMES]

export function qualifiedName(fn: FunctionName): string {
  return `${FUNCTIONS_PACKAGE}_${fn}`
}
