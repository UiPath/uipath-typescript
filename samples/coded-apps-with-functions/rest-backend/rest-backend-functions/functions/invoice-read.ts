/**
 * One resource, addressed by a path param: `GET /invoices/:invoiceId`.
 *
 * THREE LAYERS THAT LOOK ALIKE, and get conflated in design reviews:
 *
 *   /invoices/{invoiceId}   the OpenAPI / RFC 6570 URI-template form. What you
 *                           publish to the consuming team, and what a REST
 *                           developer expects to read in a spec.
 *   /invoices/:invoiceId    what you DECLARE below. The functions runtime routes
 *                           with Hono, whose syntax is `:param` — plus
 *                           `:param{regex}`, `:param?` and `*`.
 *   /invoices/INV-1001      what goes on the wire.
 *
 * The colon form is a framework convention (Hono, Express, Fastify, Rails), not
 * a REST one. Curly braces in a declared path would match as a LITERAL segment
 * rather than a parameter.
 *
 * ROUTING MECHANICS worth knowing before you have to debug them:
 *   - Routes sort by SPECIFICITY, not declaration order: a literal segment beats
 *     a param, so `/invoices/summary` and `/invoices/:invoiceId` can coexist.
 *   - `ctx.params` values are always strings. The typed input the handler
 *     receives has been coerced by the schema — take numbers from the input, not
 *     from `ctx.params`.
 *   - A body key of the same name SHADOWS a path param. Only reachable on
 *     POST/PUT, and silent when it happens.
 *
 * ONE CAVEAT ABOUT THE SDK, because it makes this route look broken when it is
 * not. `Functions.invoke()` in @uipath/uipath-typescript does not substitute
 * path params: it builds the URL from the declared slug verbatim and sends the
 * input as query parameters, so the request arrives as
 *
 *   /…/invoices/:invoiceId?invoiceId=INV-1001
 *
 * The handler still receives the right value — from the query string — so the
 * call succeeds, and the only symptoms are the URL in the network tab and
 * `ctx.params.invoiceId` holding the literal ":invoiceId". A regex-constrained
 * param cannot match at all under that behaviour, which is why `:lineNo` in
 * invoice-line-read.ts is plain rather than `:lineNo{[0-9]+}`. Call the trigger
 * with curl and the declared REST form behaves exactly as written — the README
 * shows both.
 */
import { defineFunction, defineSchema, FunctionError } from "@uipath/coded-functions-js-sdk"
import { findInvoice, knownInvoiceIds } from "../lib/invoices.ts"
import type { InvoiceReadInput } from "../lib/contract.ts"

export default defineFunction({
  name: "invoice-read",
  method: "GET",
  path: "/invoices/:invoiceId",
  input: defineSchema<InvoiceReadInput>(),
  output: {
    type: "object",
    properties: {
      invoiceId: { type: "string" },
      vendor: { type: "string" },
      status: { type: "string" },
      currency: { type: "string" },
      issuedAt: { type: "string" },
      dueAt: { type: "string" },
      poReference: { type: "string" },
      totalEur: { type: "number" },
      lineCount: { type: "number" },
      lines: {
        type: "array",
        items: {
          type: "object",
          properties: {
            lineNo: { type: "number" },
            sku: { type: "string" },
            description: { type: "string" },
            quantity: { type: "number" },
            unitPriceEur: { type: "number" },
          },
          required: ["lineNo", "sku", "description", "quantity", "unitPriceEur"],
          additionalProperties: false,
        },
      },
    },
    required: [
      "invoiceId",
      "vendor",
      "status",
      "currency",
      "issuedAt",
      "dueAt",
      "poReference",
      "totalEur",
      "lineCount",
      "lines",
    ],
    additionalProperties: false,
  },
  description:
    "Fetch one invoice by id. The item route: a single resource addressed by a path param.",
  handler: async (inp) => {
    const invoice = findInvoice(inp.invoiceId)
    if (!invoice) {
      /* 404 is the right status for an address that resolves to nothing, and the
         message names what would have worked. An error that only says "not
         found" sends the caller to the docs; this one answers the question. */
      throw new FunctionError(
        `No invoice "${inp.invoiceId}". Known ids: ${knownInvoiceIds().join(", ")}.`,
        404,
        "INVOICE_NOT_FOUND",
      )
    }
    return invoice
  },
})
