/**
 * The invoice store.
 *
 * `lib/` rather than `functions/` because the tooling treats every module under
 * `functions/` as an entry point. Helpers and data live here.
 *
 * The data ships inside the function package, so this sample needs no
 * Orchestrator resource, no folder permission and no outbound network call.
 * That is deliberate: the subject here is the SHAPE of the endpoints, and a
 * missing asset or a permissions error would only obscure it. A real backend
 * would query a database or an ERP; the three lookups below are the only seam
 * that would change.
 */
import type { Invoice, InvoiceStatus } from "./contract.ts"

const INVOICES: Invoice[] = [
  {
    invoiceId: "INV-1001",
    vendor: "Northwind Components BV",
    status: "pending",
    currency: "EUR",
    issuedAt: "2026-08-14",
    dueAt: "2026-09-13",
    poReference: "PO-55120",
    totalEur: 0,
    lineCount: 0,
    lines: [
      { lineNo: 1, sku: "NC-BRG-08", description: "Bearing assembly, 8mm", quantity: 40, unitPriceEur: 12.5 },
      { lineNo: 2, sku: "NC-SEAL-22", description: "Shaft seal, 22mm", quantity: 100, unitPriceEur: 3.75 },
      { lineNo: 3, sku: "NC-FRT-01", description: "Freight surcharge", quantity: 1, unitPriceEur: 85 },
    ],
  },
  {
    invoiceId: "INV-1002",
    vendor: "Aurora Print & Packaging",
    status: "approved",
    currency: "EUR",
    issuedAt: "2026-08-22",
    dueAt: "2026-09-21",
    poReference: "PO-55204",
    totalEur: 0,
    lineCount: 0,
    lines: [
      { lineNo: 1, sku: "AP-BOX-L", description: "Corrugated box, large", quantity: 500, unitPriceEur: 1.1 },
      { lineNo: 2, sku: "AP-LBL-4X6", description: "Thermal label 4x6, roll", quantity: 24, unitPriceEur: 8.4 },
    ],
  },
  {
    invoiceId: "INV-1003",
    vendor: "Helios Facility Services",
    status: "rejected",
    currency: "EUR",
    issuedAt: "2026-07-30",
    dueAt: "2026-08-29",
    poReference: "PO-54877",
    totalEur: 0,
    lineCount: 0,
    lines: [
      { lineNo: 1, sku: "HF-CLN-MO", description: "Monthly cleaning, Building B", quantity: 1, unitPriceEur: 2400 },
    ],
  },
  {
    invoiceId: "INV-1004",
    vendor: "Beacon Logistics GmbH",
    status: "pending",
    currency: "EUR",
    issuedAt: "2026-09-01",
    dueAt: "2026-10-01",
    poReference: "PO-55310",
    totalEur: 0,
    lineCount: 0,
    lines: [
      { lineNo: 1, sku: "BL-PAL-EU", description: "Pallet delivery, EU zone 2", quantity: 12, unitPriceEur: 47.5 },
      { lineNo: 2, sku: "BL-FUEL", description: "Fuel adjustment", quantity: 1, unitPriceEur: 63.2 },
    ],
  },
  {
    invoiceId: "INV-1005",
    vendor: "Cobalt Software Ltd",
    status: "draft",
    currency: "EUR",
    issuedAt: "2026-09-05",
    dueAt: "2026-10-05",
    poReference: "PO-55341",
    totalEur: 0,
    lineCount: 0,
    lines: [
      { lineNo: 1, sku: "CS-LIC-25", description: "Analytics licence, 25 seats", quantity: 25, unitPriceEur: 180 },
    ],
  },
]

/**
 * Money in cents while summing, then back to euros once.
 * Adding 0.1 + 0.2 in floating point is how invoice totals end up at 0.30000000000000004.
 */
function totalEur(invoice: Invoice): number {
  const cents = invoice.lines.reduce(
    (sum, l) => sum + Math.round(l.quantity * l.unitPriceEur * 100),
    0,
  )
  return cents / 100
}

/** Totals and line counts are derived, never stored twice. */
const STORE: Invoice[] = INVOICES.map((i) => ({
  ...i,
  totalEur: totalEur(i),
  lineCount: i.lines.length,
}))

/** Case-insensitive, so `INV-1001` and `inv-1001` both resolve — as a REST API should. */
export function findInvoice(invoiceId: string): Invoice | undefined {
  const wanted = invoiceId.trim().toLowerCase()
  return STORE.find((i) => i.invoiceId.toLowerCase() === wanted)
}

export function findLine(invoice: Invoice, lineNo: number) {
  return invoice.lines.find((l) => l.lineNo === lineNo)
}

export function listInvoices(status?: InvoiceStatus): Invoice[] {
  return status ? STORE.filter((i) => i.status === status) : STORE
}

export function invoiceCount(): number {
  return STORE.length
}

/** Ids that exist, so a 404 can tell the caller what would have worked. */
export function knownInvoiceIds(): string[] {
  return STORE.map((i) => i.invoiceId)
}
