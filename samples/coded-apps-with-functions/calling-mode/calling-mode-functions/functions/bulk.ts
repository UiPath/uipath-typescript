/**
 * Job semantics: no `method`, no `path`.
 *
 * Leaving them out is the whole declaration. The function gets no HTTP trigger,
 * so it cannot be invoked with a URL — it is started as a job and polled.
 *
 * What that buys is somewhere to put a large payload. A job carries big data as
 * an attachment in both directions, so megabytes are fine, and the caller does
 * not have to stay connected while the work runs.
 *
 * The handler is identical to echo.ts. Only the declaration differs.
 */
import { defineFunction, defineSchema, logger } from "@uipath/coded-functions-js-sdk"
import { makeText, sizeKb } from "../lib/contract.ts"
import type { CallInput } from "../lib/contract.ts"

export default defineFunction({
  name: "bulk",
  input: defineSchema<CallInput>(),
  output: {
    type: "object",
    properties: {
      label: { type: "string" },
      receivedKb: { type: "number" },
      returnedKb: { type: "number" },
      data: { type: "string" },
      elapsedMs: { type: "number" },
    },
    required: ["label", "receivedKb", "returnedKb", "data", "elapsedMs"],
    additionalProperties: false,
  },
  description: "Same work as echo, started as a job instead of over HTTP.",
  handler: async (inp) => {
    const started = Date.now()
    const received = inp.data ?? ""
    const data = makeText(Math.max(0, Math.min(4096, Number(inp.outputKb) || 0)))

    logger.info(`bulk: received ${sizeKb(received)} KB, returning ${sizeKb(data)} KB`)

    return {
      label: inp.label ?? "bulk",
      receivedKb: sizeKb(received),
      returnedKb: sizeKb(data),
      data,
      elapsedMs: Date.now() - started,
    }
  },
})
