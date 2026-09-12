/**
 * A nested sub-resource with two path params:
 * `GET /invoices/:invoiceId/lines/:lineNo`.
 *
 * The form REST developers expect for "a thing that belongs to a thing", and the
 * reason it is a third function rather than a query param on invoice-read: the
 * line is addressable. It has its own identity, so it gets its own URL, and a
 * client can link to it, cache it and refetch it on its own.
 *
 * WHY `:lineNo` IS PLAIN AND NOT `:lineNo{[0-9]+}`. The regex form was the
 * intent, and it works when the trigger is called directly. It cannot work
 * through `Functions.invoke()`, which sends the declared slug verbatim — the
 * literal string ":lineNo" is not `[0-9]+`, so the constrained route never
 * matches and the call 404s. The plain form matches, binds ":lineNo" as an
 * ordinary segment, and takes the real value from the query string the SDK adds.
 *
 * That difference cost real debugging time and was first written up as a
 * local-versus-deployed matcher difference. It is not: local was tested with a
 * hand-built curl carrying real values, deployed through the SDK carrying
 * literals. Same matcher, different request.
 *
 * So validation lives in the handler, where it holds however the caller arrives.
 * That is the right place for it anyway — a route constraint answers "does this
 * URL exist", not "is 7 a line on this invoice".
 *
 * COERCION: `ctx.params.lineNo` is the string "2"; the typed input below has
 * already been coerced to the number 2. Use the input.
 */
import { defineFunction, defineSchema, FunctionError } from "@uipath/coded-functions-js-sdk"
import { findInvoice, findLine, knownInvoiceIds } from "../lib/invoices.ts"
import type { InvoiceLineReadInput } from "../lib/contract.ts"

export default defineFunction({
  name: "invoice-line-read",
  method: "GET",
  path: "/invoices/:invoiceId/lines/:lineNo",
  input: defineSchema<InvoiceLineReadInput>(),
  output: {
    type: "object",
    properties: {
      invoiceId: { type: "string" },
      lineNo: { type: "number" },
      sku: { type: "string" },
      description: { type: "string" },
      quantity: { type: "number" },
      unitPriceEur: { type: "number" },
      lineTotalEur: { type: "number" },
    },
    required: [
      "invoiceId",
      "lineNo",
      "sku",
      "description",
      "quantity",
      "unitPriceEur",
      "lineTotalEur",
    ],
    additionalProperties: false,
  },
  description:
    "Fetch one line of one invoice. The sub-resource route: two path params, nested.",
  handler: async (inp) => {
    const invoice = findInvoice(inp.invoiceId)
    if (!invoice) {
      throw new FunctionError(
        `No invoice "${inp.invoiceId}". Known ids: ${knownInvoiceIds().join(", ")}.`,
        404,
        "INVOICE_NOT_FOUND",
      )
    }

    const line = findLine(invoice, inp.lineNo)
    if (!line) {
      /* Two different 404s, deliberately. "The invoice does not exist" and "the
         invoice exists but has no line 9" send the caller to different fixes, so
         they must not collapse into one message. */
      const available = invoice.lines.map((l) => l.lineNo).join(", ")
      throw new FunctionError(
        `Invoice ${invoice.invoiceId} has no line ${inp.lineNo}. Available lines: ${available}.`,
        404,
        "LINE_NOT_FOUND",
      )
    }

    return {
      invoiceId: invoice.invoiceId,
      lineNo: line.lineNo,
      sku: line.sku,
      description: line.description,
      quantity: line.quantity,
      unitPriceEur: line.unitPriceEur,
      lineTotalEur: Math.round(line.quantity * line.unitPriceEur * 100) / 100,
    }
  },
})
