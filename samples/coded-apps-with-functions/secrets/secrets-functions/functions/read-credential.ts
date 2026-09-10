/**
 * Use a Credential asset from a function, without the secret ever reaching the
 * browser.
 *
 * THE POINT OF THE SAMPLE. A function is handed two identities on every call:
 * `ctx.user`, the caller's delegated token, and `ctx.robot`, its own. A
 * Credential asset is where they stop being interchangeable — and that is the
 * reason the robot token exists.
 *
 * This reads the credential with `ctx.robot` through the ROBOT-EXECUTION
 * endpoint: the route a robot uses to resolve its own assets while executing,
 * which a caller cannot reach on its own behalf. It needs no Orchestrator
 * setting switched on, and the page never holds the secret — only a username, a
 * length and a non-reversible fingerprint come back.
 *
 * THE VERB TRAP, because this endpoint is easy to write off as missing:
 * it is a POST with a JSON body. Issued as a GET with inline OData parameters
 * it answers `404` with an EMPTY body, which is indistinguishable from a route
 * that is not on the build. Issued as a POST with a bad key it answers
 * `404 {"message":"Invalid robot key","errorCode":1002}` — that is the route
 * telling you it is alive.
 *
 * There is one other way to read a credential, and the README explains why this
 * sample does not use it: `api/Assets/name/{name}/value` with the caller's own
 * token, which requires `AllowDirectApiAccess` to be switched ON. That flag is
 * identity-blind, so switching it on opens the credential to every identity
 * holding Assets.View on the folder. It is a widening, not an enablement step.
 *
 * CONFUSED DEPUTY. The robot identity is more privileged than the caller, so an
 * arbitrary `assetName` from the request body would let any caller make this
 * function fetch any credential the robot can see — broken object-level
 * authorization with the function as the deputy. The readable set is an
 * ALLOWLIST in code. A privileged backend narrows what it will do on request;
 * it never widens it.
 */
import { defineFunction, defineSchema, FunctionError, logger } from "@uipath/coded-functions-js-sdk"
import {
  assetFolderHeaders,
  coords,
  detail,
  fingerprint,
  orchestratorBase,
  readRobotAsset,
  robotToken,
} from "../lib/orchestrator.ts"
import type { ReadCredentialInput } from "../lib/contract.ts"

/** The ONLY assets this function will read. Adding one is a reviewable act. */
const READABLE = new Set(["SamplePartnerCredential"])

type Asset = {
  ValueType?: string
  CredentialUsername?: string | null
  CredentialPassword?: string | null
}

export default defineFunction({
  name: "read-credential",
  method: "POST",
  path: "/credential/read",
  input: defineSchema<ReadCredentialInput>(),
  output: {
    type: "object",
    properties: {
      /* NOT named "status": the runtime reads a numeric top-level `status` on a
         returned object as a FunctionResponse envelope and sends that status
         with an EMPTY body — the real payload disappears silently, with the job
         still reporting Successful. */
      route: { type: "string" },
      httpStatus: { type: "number" },
      username: { anyOf: [{ type: "string" }, { type: "null" }] },
      secretLength: { type: "number" },
      secretFingerprint: { anyOf: [{ type: "string" }, { type: "null" }] },
      verified: { type: "boolean" },
      verdict: { type: "string" },
    },
    required: ["route", "httpStatus", "secretLength", "verified", "verdict"],
    additionalProperties: false,
  },
  description:
    "Read an allowlisted Credential asset with the function's own robot identity. Returns proof of use, never the secret.",
  handler: async (inp, ctx) => {
    const assetName = inp.assetName ?? "SamplePartnerCredential"

    // Confused-deputy guard FIRST, before any privileged call is made.
    if (!READABLE.has(assetName)) {
      throw new FunctionError(
        `"${assetName}" is not in this function's allowlist. A privileged backend must not fetch caller-named secrets. Allowed: ${[...READABLE].join(", ")}`,
        403,
        "NOT_ALLOWLISTED",
      )
    }

    const c = coords(ctx)
    const base = orchestratorBase(c)
    const token = robotToken(ctx)
    const robotKey = ctx.robot?.key ?? ""
    if (!robotKey) {
      throw new FunctionError(
        "No robot key on this invocation. ctx.robot is always null under local `uip functions serve`, so this path is deployed-only by design.",
        500,
        "NO_ROBOT_KEY",
      )
    }

    /* Both asset routes authorize on the NUMERIC folder Id, not the folder Key
       GUID. Omit it and this answers 400/1101; send the GUID instead and it
       answers 403/1017, which looks exactly like AllowDirectApiAccess being off. */
    const headers = await assetFolderHeaders(base, token, c.folderKey)

    const r = await readRobotAsset(base, token, robotKey, assetName, headers)
    if (!r.ok) {
      throw new FunctionError(
        `Robot-execution endpoint returned ${r.status}: ${detail(r.text)}`,
        r.status,
        "ROBOT_READ_FAILED",
      )
    }

    const asset = JSON.parse(r.text) as Asset
    const username = asset.CredentialUsername ?? null
    const secret = asset.CredentialPassword ?? ""

    // Only logger.* reaches job logs. Log the act, never the value.
    logger.info(`read-credential "${assetName}" as the robot: ${r.status}`)

    return {
      route: "POST odata/…GetRobotAssetByNameForRobotKey",
      httpStatus: r.status,
      username,
      secretLength: secret.length,
      secretFingerprint: secret ? fingerprint(secret) : null,
      verified: Boolean(secret),
      verdict:
        "Read with the function's own robot identity, through the robot-execution endpoint. No Orchestrator setting had to be switched on, and the secret never left this function — the app receives a username, a length and a fingerprint.",
    }
  },
})
