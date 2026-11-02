import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { parse } from 'dotenv'
import { DEV_ENV_FILES } from '../constants'
import type { UiPathConfig } from '../types'
import { createPluginError } from './utils'

/**
 * Local stand-in for the Apps service's public coded app routes, so `npm run dev` can run an app in public mode.
 *
 * The SDK's public client calls `{base-url}/{org}/apps_/.../integrations/codedapp/...`. In dev the plugin points
 * base-url at the dev server and answers those calls here: it mints the external app's client_credentials token in
 * Node and calls Orchestrator and Data Fabric with it, applying the same rules as the deployed service (only the
 * bindings in bindings_v2.json, records and jobs visible to the session that created them, per-resource `access` from
 * uipath.json). The secret and the token never reach the browser.
 */

export const DEV_APP_KEY = 'local-dev'
export const CLIENT_ID_VARIABLE = 'UIPATH_APP_CLIENT_ID'
export const CLIENT_SECRET_VARIABLE = 'UIPATH_APP_CLIENT_SECRET'

const ROUTE = '/apps_/default/api/v1/default/integrations/codedapp/'
const SESSION_COOKIE = 'uipath_dev_session'
const NO_SESSION = "There's no session for this app, or it has expired."
const NO_EXPANSION = 'expansionLevel=0'

// Same mapping as the SDK's public client: Identity isn't served on the API host.
const API_HOST_TO_CLOUD_HOST: Record<string, string> = {
  'alpha.api.uipath.com': 'alpha.uipath.com',
  'staging.api.uipath.com': 'staging.uipath.com',
  'api.uipath.com': 'cloud.uipath.com',
}

interface Binding {
  type: string
  key: string
  name?: string
  folderPath?: string
}

/** uipath.json `access`: `all` lets any session read the resource, `session` only the session that created it. */
interface Access {
  resource: string
  key: string
  mode: string
}

export interface PublicDevContext {
  baseUrl: string
  orgName: string
  tenantName: string
  scope?: string
  folderKey?: string
  clientId: string
  clientSecret: string
  bindings: Binding[]
  shared: { type: string; key: string }[]
  access?: Access[]
}

type Fetch = typeof fetch
type Middleware = (req: IncomingMessage, res: ServerResponse, next: () => void) => void

/** The local public mode setup, or `undefined` when the env files hold no client id and secret. */
export function readPublicDevContext(config: UiPathConfig, cwd: string = process.cwd()): PublicDevContext | undefined {
  const env: Record<string, string> = {}
  for (const file of DEV_ENV_FILES) {
    const fullPath = path.resolve(cwd, file)
    if (fs.existsSync(fullPath)) Object.assign(env, parse(fs.readFileSync(fullPath, 'utf-8')))
  }
  const clientId = env[CLIENT_ID_VARIABLE]
  const clientSecret = env[CLIENT_SECRET_VARIABLE]
  if (!clientId || !clientSecret) return undefined

  const { baseUrl, orgName, tenantName, scope, folderKey } = config
  if (!baseUrl || !orgName || !tenantName) {
    throw createPluginError('Public mode needs baseUrl, orgName and tenantName in uipath.json.')
  }
  const { publicApp, access } = config as Record<string, unknown> as {
    publicApp?: { shared?: { type: string; key: string }[] }
    access?: Access[]
  }
  return {
    baseUrl: baseUrl.replace(/\/$/, ''),
    orgName,
    tenantName,
    scope,
    folderKey,
    clientId,
    clientSecret,
    bindings: readBindings(cwd),
    shared: publicApp?.shared ?? [],
    access: Array.isArray(access) ? access : undefined,
  }
}

function readBindings(cwd: string): Binding[] {
  const file = ['bindings_v2.json', 'source/bindings_v2.json'].map(name => path.resolve(cwd, name)).find(fs.existsSync)
  if (!file) return []
  const { resources = [] } = JSON.parse(fs.readFileSync(file, 'utf-8')) as {
    resources?: { resource: string; key: string; value?: Record<string, { defaultValue?: string }> }[]
  }
  return resources.map(r => ({
    type: r.resource.toLowerCase(),
    key: r.key,
    name: r.value?.name?.defaultValue,
    folderPath: r.value?.folderPath?.defaultValue,
  }))
}

// Orchestrator decodes the folder path header as base64 of the UTF-16LE bytes.
function folderHeaders(folderPath?: string, folderKey?: string): Record<string, string> {
  if (folderPath) return { 'X-UIPATH-FolderPath-Encoded': Buffer.from(folderPath, 'utf16le').toString('base64') }
  return folderKey ? { 'X-UiPath-FolderKey': folderKey } : {}
}

// Data Fabric ignores both folder path headers and only honours the folder key.
// ponytail: one folderKey from uipath.json for every entity; resolve per binding if an app spans folders.
function dataFabricFolderHeaders(folderKey?: string): Record<string, string> {
  return folderKey ? { 'X-UiPath-FolderKey': folderKey } : {}
}

export function createPublicDevMiddleware(ctx: PublicDevContext, fetchImpl: Fetch = fetch): Middleware {
  // ponytail: in memory, so sessions and ownership reset when the dev server restarts. Fine for local dev.
  const sessions = new Map<string, Set<string>>()
  let token: { value: string; expiresAt: number } | undefined
  const tenantBase = `${ctx.baseUrl}/${ctx.orgName}/${ctx.tenantName}`

  async function appToken(): Promise<string> {
    if (token && token.expiresAt > Date.now()) return token.value
    const url = new URL(ctx.baseUrl)
    const host = API_HOST_TO_CLOUD_HOST[url.hostname] ?? url.hostname
    const form = new URLSearchParams({ grant_type: 'client_credentials', client_id: ctx.clientId, client_secret: ctx.clientSecret })
    if (ctx.scope) form.set('scope', ctx.scope)
    const response = await fetchImpl(`${url.protocol}//${host}/identity_/connect/token`, { method: 'POST', body: form })
    const body = (await response.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error?: string }
    if (!response.ok || !body.access_token) {
      throw new DownstreamError(502, `Identity rejected the app's client credentials: ${body.error ?? response.status}`)
    }
    token = { value: body.access_token, expiresAt: Date.now() + ((body.expires_in ?? 3600) - 60) * 1000 }
    return token.value
  }

  async function call(method: string, apiPath: string, headers: Record<string, string> = {}, body?: BodyInit): Promise<Response> {
    const target = apiPath.startsWith('https://') ? apiPath : `${tenantBase}/${apiPath}`
    return fetchImpl(target, { method, headers: { Authorization: `Bearer ${await appToken()}`, ...headers }, body })
  }

  function binding(type: string, key: string): Binding {
    const found = ctx.bindings.find(b => b.type === type && b.key === key)
    if (!found) throw new DownstreamError(403, `The app doesn't declare the ${type} "${key}" in bindings_v2.json.`)
    if (!found.name) throw new DownstreamError(500, `The ${type} binding "${key}" carries no name.`)
    return found
  }

  // Same rule as the Apps service: without `access`, only publicApp.shared is open; with it, an explicit mode wins
  // and anything else follows the default.
  // ponytail: default is open to all, the service's preset for public-coded-app-default-access-all; make it
  // configurable if an environment turns that flag off.
  const isOpenToAll = (type: string, key: string) => {
    if (!ctx.access) return ctx.shared.some(s => s.type?.toLowerCase() === type && s.key === key)
    return ctx.access.find(a => a.resource?.toLowerCase() === type && a.key === key)?.mode !== 'session'
  }

  async function handle(req: IncomingMessage, res: ServerResponse, route: string, query: URLSearchParams): Promise<void> {
    if (route === 'session' && req.method === 'POST') {
      const id = randomUUID()
      sessions.set(id, new Set())
      res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${id}; Path=/; HttpOnly; SameSite=Lax`)
      return send(res, 204)
    }

    const owned = sessions.get(readCookie(req, SESSION_COOKIE) ?? '')
    if (!owned) return send(res, 401, { message: NO_SESSION })

    let m: RegExpMatchArray | null
    if ((m = route.match(/^orchestrator\/processes\/([^/]+)\/jobs$/)) && req.method === 'POST') {
      const process = binding('process', decodeURIComponent(m[1]))
      const { inputArguments } = (await readJson(req)) as { inputArguments?: unknown }
      const startInfo: Record<string, unknown> = { ReleaseName: process.name, Strategy: 'ModernJobsCount', JobsCount: 1 }
      if (inputArguments != null) {
        startInfo.InputArguments = typeof inputArguments === 'string' ? inputArguments : JSON.stringify(inputArguments)
      }
      const response = await call('POST', 'orchestrator_/odata/Jobs/UiPath.Server.Configuration.OData.StartJobs',
        { 'Content-Type': 'application/json', ...folderHeaders(process.folderPath, ctx.folderKey) }, JSON.stringify({ startInfo }))
      const text = await response.text()
      const jobKey = response.ok ? (JSON.parse(text) as { value?: { Key?: string }[] }).value?.[0]?.Key : undefined
      if (jobKey) owned.add(jobKey.toLowerCase())
      return relay(res, response, text)
    }

    if ((m = route.match(/^orchestrator\/jobs\/([^/]+)\/output$/)) && req.method === 'GET') {
      const jobKey = decodeURIComponent(m[1])
      const sharedProcesses = ctx.bindings.filter(b => b.type === 'process' && isOpenToAll('process', b.key))
      if (!owned.has(jobKey.toLowerCase()) && sharedProcesses.length === 0) return send(res, 404)
      // Orchestrator wants a folder header here but finds the job in any folder.
      const anyProcess = ctx.bindings.find(b => b.type === 'process')
      const response = await call('GET',
        `orchestrator_/odata/Jobs/UiPath.Server.Configuration.OData.GetByKey(identifier=${encodeURIComponent(jobKey)})?$expand=Release`,
        folderHeaders(anyProcess?.folderPath, ctx.folderKey))
      const text = await response.text()
      if (response.ok && !owned.has(jobKey.toLowerCase())) {
        const releaseName = (JSON.parse(text) as { Release?: { Name?: string } }).Release?.Name
        if (!sharedProcesses.some(p => p.name === releaseName)) return send(res, 404)
      }
      return relay(res, response, text)
    }

    if ((m = route.match(/^datafabric\/entities\/([^/]+)\/records(?:\/([^/]+))?$/))) {
      const entityKey = decodeURIComponent(m[1])
      const recordId = m[2] && decodeURIComponent(m[2])
      const entity = binding('entity', entityKey)
      const entityPath = `datafabric_/api/v3/entities/${encodeURIComponent(entity.name!)}`
      if (entity.folderPath && !ctx.folderKey) {
        throw new DownstreamError(500, `Set folderKey in uipath.json to the key of "${entity.folderPath}": Data Fabric finds folder entities only by folder key.`)
      }
      const headers = dataFabricFolderHeaders(ctx.folderKey)

      if (!recordId && req.method === 'POST') {
        // A caller-chosen Id is one they could claim ownership of.
        const { Id: _ignored, ...fields } = (await readJson(req)) as Record<string, unknown>
        const response = await call('POST', `${entityPath}/insert?${NO_EXPANSION}`, { 'Content-Type': 'application/json', ...headers }, JSON.stringify(fields))
        const text = await response.text()
        const id = response.ok ? (JSON.parse(text) as { Id?: string }).Id : undefined
        if (id) owned.add(id.toLowerCase())
        return relay(res, response, text)
      }
      if (recordId && req.method === 'GET') {
        if (!owned.has(recordId.toLowerCase()) && !isOpenToAll('entity', entityKey)) return send(res, 404)
        const response = await call('GET', `${entityPath}/read/${encodeURIComponent(recordId)}?${NO_EXPANSION}`, headers)
        return relay(res, response, await response.text())
      }
      if (!recordId && req.method === 'GET') {
        if (!isOpenToAll('entity', entityKey)) return send(res, 403, { message: `The entity "${entityKey}" isn't open to all in uipath.json.` })
        const page = new URLSearchParams()
        for (const name of ['start', 'limit']) if (query.has(name)) page.set(name, query.get(name)!)
        const response = await call('GET', `${entityPath}/read?${page.toString() ? `${page}&` : ''}${NO_EXPANSION}`, headers)
        return relay(res, response, await response.text())
      }
    }

    if ((m = route.match(/^orchestrator\/buckets\/([^/]+)\/files$/)) && req.method === 'POST') {
      const bucket = binding('bucket', decodeURIComponent(m[1]))
      const fileName = query.get('fileName')?.trim()
      if (!fileName) return send(res, 400, { message: 'A file name is required.' })
      // The service picks the path, so a visitor can only add files, never overwrite one.
      const dot = fileName.lastIndexOf('.')
      const uploadId = randomUUID().replace(/-/g, '')
      const filePath = dot > 0 ? `${fileName.slice(0, dot)}_${uploadId}${fileName.slice(dot)}` : `${fileName}_${uploadId}`
      const contentType = req.headers['content-type'] || 'application/octet-stream'
      const headers = folderHeaders(bucket.folderPath, ctx.folderKey)

      const filter = encodeURIComponent(`Name eq '${bucket.name!.replace(/'/g, "''")}'`)
      const lookup = await call('GET', `orchestrator_/odata/Buckets?$filter=${filter}&$select=Id`, headers)
      if (!lookup.ok) return relay(res, lookup, await lookup.text())
      const bucketId = ((await lookup.json()) as { value?: { Id?: number }[] }).value?.[0]?.Id
      if (bucketId === undefined) return send(res, 404, { message: `The "${bucket.key}" bucket wasn't found in its folder in Orchestrator.` })

      const write = await call('GET',
        `orchestrator_/odata/Buckets(${bucketId})/UiPath.Server.Configuration.OData.GetWriteUri?path=${encodeURIComponent(filePath)}&contentType=${encodeURIComponent(contentType)}`,
        headers)
      if (!write.ok) return relay(res, write, await write.text())
      const { Uri, Verb, RequiresAuth, Headers } = (await write.json()) as {
        Uri: string; Verb: string; RequiresAuth: boolean; Headers: { Keys: string[]; Values: string[] }
      }
      const uploadHeaders: Record<string, string> = { 'Content-Type': contentType }
      Headers.Keys.forEach((key, i) => { uploadHeaders[key] = Headers.Values[i] })
      const content = await readBody(req)
      const upload = RequiresAuth
        ? await call(Verb, Uri, { ...uploadHeaders, ...headers }, content)
        : await fetchImpl(Uri, { method: Verb, headers: uploadHeaders, body: content })
      if (!upload.ok) return send(res, upload.status, { message: `The file couldn't be saved to storage (storage returned ${upload.status}).` })
      return send(res, 200, { path: filePath })
    }

    send(res, 404)
  }

  return (req, res, next) => {
    const url = new URL(req.url ?? '/', 'http://localhost')
    const at = url.pathname.indexOf(ROUTE)
    if (at < 0) return next()
    handle(req, res, url.pathname.slice(at + ROUTE.length), url.searchParams).catch((error: unknown) => {
      const status = error instanceof DownstreamError ? error.status : 500
      send(res, status, { message: error instanceof Error ? error.message : String(error) })
    })
  }
}

class DownstreamError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message)
  }
}

function send(res: ServerResponse, status: number, body?: unknown): void {
  res.statusCode = status
  if (body === undefined) return void res.end()
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

function relay(res: ServerResponse, response: Response, text: string): void {
  res.statusCode = response.status
  const contentType = response.headers.get('content-type')
  if (contentType) res.setHeader('Content-Type', contentType)
  res.end(text)
}

function readCookie(req: IncomingMessage, name: string): string | undefined {
  return req.headers.cookie?.split(';').map(c => c.trim().split('=')).find(([k]) => k === name)?.[1]
}

async function readBody(req: IncomingMessage): Promise<Uint8Array<ArrayBuffer>> {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  return new Uint8Array(Buffer.concat(chunks))
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const text = new TextDecoder().decode(await readBody(req))
  return text ? JSON.parse(text) : {}
}
