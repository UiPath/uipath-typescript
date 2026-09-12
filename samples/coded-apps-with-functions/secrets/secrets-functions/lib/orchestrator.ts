/**
 * Orchestrator plumbing for the credential read.
 *
 * `lib/` is for shared code with no route of its own — the tooling treats
 * anything under `functions/` as an entry point, so helpers live here.
 */
import { FunctionError } from "@uipath/coded-functions-js-sdk"
import type { FunctionContext } from "@uipath/coded-functions-js-sdk"

export type Coords = {
  baseUrl: string
  orgId: string
  tenantId: string
  folderKey: string | null
}

/** Trusted platform coordinates. Never accept these from input. */
export function coords(ctx: FunctionContext): Coords {
  if (!ctx.platform) {
    throw new FunctionError(
      "Platform context unavailable. Locally, set UIPATH_BASE_URL + UIPATH_ORG_ID + UIPATH_TENANT_ID — it is all-or-nothing, one missing value nulls the whole object.",
      500,
    )
  }
  const { baseUrl, orgId, tenantId, folderKey } = ctx.platform
  return { baseUrl: baseUrl.replace(/\/+$/, ""), orgId, tenantId, folderKey }
}

export function orchestratorBase(c: Coords): string {
  return `${c.baseUrl}/${c.orgId}/${c.tenantId}/orchestrator_`
}

/** The function's own identity. */
export function robotToken(ctx: FunctionContext): string {
  const t = ctx.robot?.accessToken
  if (!t) {
    throw new FunctionError(
      "No robot token. ctx.robot is always null under local `uip functions serve`, so this path is deployed-only by design.",
      500,
      "NO_ROBOT_TOKEN",
    )
  }
  return t
}

/**
 * Upstream error text, bounded but never silently cut. A bare `.slice()` here
 * truncates mid-word and makes the reason look like it simply stopped.
 */
export function detail(text: string | null | undefined, max = 400): string {
  if (!text) return "(empty body)"
  return text.length <= max ? text : `${text.slice(0, max)} … [+${text.length - max} chars truncated]`
}

/**
 * The NUMERIC folder Id for a folder key.
 *
 * Both asset routes below authorize on `X-UIPATH-OrganizationUnitId`, which is
 * this number and not the folder Key GUID. Get it wrong and the errors mislead:
 * omit it entirely and you get `400 errorCode 1101`; send the GUID instead and
 * you get `403 errorCode 1017`, which is indistinguishable from
 * `AllowDirectApiAccess` being switched off.
 */
export async function assetFolderHeaders(
  base: string,
  token: string,
  folderKey: string | null,
): Promise<Record<string, string>> {
  if (!folderKey) return {}
  let id: number | null = null
  try {
    const res = await fetch(
      `${base}/odata/Folders?$filter=Key%20eq%20${encodeURIComponent(folderKey)}&$top=1`,
      { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(8_000) },
    )
    if (res.ok) {
      const body = (await res.json()) as { value?: Array<{ Id?: number }> }
      id = body.value?.[0]?.Id ?? null
    }
  } catch (err) {
    console.warn("assetFolderHeaders: folder-id lookup failed, continuing without the numeric id", err)
    id = null
  }
  return {
    ...(id != null ? { "X-UIPATH-OrganizationUnitId": String(id) } : {}),
    "X-UiPath-FolderKey": folderKey,
  }
}

/**
 * Read one asset as the ROBOT, through the robot-execution endpoint.
 *
 * This is the elevated path and the whole reason a function holds a robot
 * token: it is how a robot resolves its own assets while executing, and it does
 * NOT depend on the asset's `AllowDirectApiAccess` flag.
 *
 * IT IS A POST WITH A JSON BODY. Issued as a GET with inline OData parameters
 * it answers `404` with an EMPTY body — indistinguishable from a route that is
 * not on the build, which is exactly how this endpoint gets written off as
 * missing. Issued as a POST with a bad key it answers
 * `404 {"message":"Invalid robot key","errorCode":1002}`, which is the route
 * telling you it is alive.
 *
 * `supportsCredentialsProxyDisconnected` stays false deliberately: declaring
 * proxy support asks for a credential-proxy reference instead of the value.
 */
export async function readRobotAsset(
  base: string,
  token: string,
  robotKey: string,
  assetName: string,
  headers: Record<string, string>,
): Promise<{ status: number; ok: boolean; text: string }> {
  const res = await fetch(
    `${base}/odata/Assets/UiPath.Server.Configuration.OData.GetRobotAssetByNameForRobotKey`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ robotKey, assetName, supportsCredentialsProxyDisconnected: false }),
      signal: AbortSignal.timeout(10_000),
    },
  )
  return { status: res.status, ok: res.ok, text: await res.text() }
}

/**
 * A short checksum, so a reader can tell that swapping the credential changed
 * the value being read.
 *
 * NOT a digest that is safe to publish: 32 unkeyed bits are cheap to enumerate
 * against a guessable password, so this is a change indicator and nothing more.
 * What keeps the secret safe here is that it never leaves the function.
 */
export function fingerprint(secret: string): string {
  let h = 0
  for (const ch of secret) h = (Math.imul(31, h) + ch.charCodeAt(0)) | 0
  return (h >>> 0).toString(16).padStart(8, "0")
}
