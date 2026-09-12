/**
 * HTTP semantics: `POST /echo`.
 *
 * `method` and `path` are the whole declaration. Declaring them gives this
 * function an HTTP trigger, so a caller invokes it and waits for the answer —
 * one round trip, the result in hand, ordinary error handling.
 *
 * The cost is that a request and a response are the only channels. There is
 * nowhere to put a payload that does not fit in them, which is what bulk.ts is
 * for.
 */
import { defineFunction, defineSchema, logger } from "@uipath/coded-functions-js-sdk"
import { makeText, sizeKb } from "../lib/contract.ts"
import type { CallInput } from "../lib/contract.ts"

export default defineFunction({
  name: "echo",
  method: "POST",
  path: "/echo",
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
  description: "Echo text over an HTTP trigger. Synchronous.",
  handler: async (inp) => {
    const started = Date.now()
    const received = inp.data ?? ""
    const data = makeText(Math.max(0, Math.min(4096, Number(inp.outputKb) || 0)))

    logger.info(`echo: received ${sizeKb(received)} KB, returning ${sizeKb(data)} KB`)

    return {
      label: inp.label ?? "echo",
      receivedKb: sizeKb(received),
      returnedKb: sizeKb(data),
      data,
      elapsedMs: Date.now() - started,
    }
  },
})
