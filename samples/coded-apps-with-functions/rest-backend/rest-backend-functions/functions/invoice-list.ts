/**
 * The collection: `GET /invoices`.
 *
 * The first of three routes that together form the REST progression this sample
 * is about — collection, item, sub-resource:
 *
 *   GET /invoices                              this file
 *   GET /invoices/:invoiceId                   invoice-read.ts
 *   GET /invoices/:invoiceId/lines/:lineNo     invoice-line-read.ts
 *
 * WHY THIS SHAPE MATTERS. The same three operations could be one function
 * called `POST /doInvoiceThing` with an `action` field. It would work. It would
 * also be resisted by every web developer who has to consume it, because it
 * reads as RPC through a keyhole: nothing about the URL says what it does, the
 * verb carries no meaning, and no HTTP cache, proxy or client library can do
 * anything useful with it. Route shape is the adoption lever.
 *
 * FILTER VS ADDRESS — the distinction that decides path param or query param:
 *   `status` is a filter over the collection, so it is a QUERY param. Two
 *   different filters return two valid representations of the same resource.
 *   `invoiceId` addresses one resource, so it is a PATH param. Change it and
 *   you are pointing at a different thing.
 * Getting this backwards (`/invoices/pending`) is the most common REST mistake
 * in review: it makes a filter look like an identifier, and it collides the
 * moment an invoice is genuinely called "pending".
 */
import { defineFunction, defineSchema } from "@uipath/coded-functions-js-sdk"
import { invoiceCount, listInvoices } from "../lib/invoices.ts"
import type { InvoiceListInput } from "../lib/contract.ts"

export default defineFunction({
  name: "invoice-list",
  method: "GET",
  path: "/invoices",
  input: defineSchema<InvoiceListInput>(),
  /* Inlined rather than shared from lib/. The entry-point extractor reads these
     schemas statically, so an identifier in place of a literal can be dropped
     silently — the same trap as a non-literal numeric bound. Verbose beats
     silently schema-less. */
  output: {
    type: "object",
    properties: {
      invoices: {
        type: "array",
        items: {
          type: "object",
          properties: {
            invoiceId: { type: "string" },
            vendor: { type: "string" },
            status: { type: "string" },
            currency: { type: "string" },
            issuedAt: { type: "string" },
            dueAt: { type: "string" },
            totalEur: { type: "number" },
            lineCount: { type: "number" },
          },
          required: [
            "invoiceId",
            "vendor",
            "status",
            "currency",
            "issuedAt",
            "dueAt",
            "totalEur",
            "lineCount",
          ],
          additionalProperties: false,
        },
      },
      totalCount: { type: "number" },
    },
    required: ["invoices", "totalCount"],
    additionalProperties: false,
  },
  description:
    "List invoices, optionally filtered by status. The collection route of a REST-shaped backend.",
  handler: async (inp) => {
    const rows = listInvoices(inp.status)

    /* An empty collection is 200 with an empty array, NOT 404. A collection
       resource exists whether or not anything is in it; 404 here would tell the
       caller the endpoint is wrong, which is a different and misleading fact. */
    return {
      invoices: rows.map(({ lines: _lines, poReference: _poReference, ...summary }) => summary),
      totalCount: invoiceCount(),
    }
  },
})
