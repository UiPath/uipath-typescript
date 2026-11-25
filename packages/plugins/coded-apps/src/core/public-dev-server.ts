import { randomBytes, randomUUID } from 'node:crypto'
import fs from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import path from 'node:path'
import { parse } from 'dotenv'
import { DEV_ENV_FILES, PLUGIN_NAME } from '../constants'
import type { UiPathConfig } from '../types'

/**
 * Local public mode: `npm run dev` with `UIPATH_PUBLIC_APP=true` serves the app the way a public
 * deployment does. The page gets an app key and talks to this dev server instead of the Apps
 * service; the dev server holds the external application's secret, mints its token, and applies
 * the Apps service's rules (declared resources only, session or all reads, no change or delete)
 * before it calls Orchestrator and Data Fabric. The secret and the token never reach the browser.
 *
 * Mirrors business-apps-jamjam server/src/api/integrations/coded-app/*. Keep the two in step.
 */

export const PUBLIC_ENV = {
  ENABLED: 'UIPATH_PUBLIC_APP',
  CLIENT_ID: 'UIPATH_PUBLIC_APP_CLIENT_ID',
  CLIENT_SECRET: 'UIPATH_PUBLIC_APP_CLIENT_SECRET',
  FOLDER_KEY: 'UIPATH_PUBLIC_APP_FOLDER_KEY',
} as const

export const LOCAL_APP_KEY = 'local-dev'
const RESOURCES_FILE = 'uipath_resources.ts'
const BINDINGS_FILE = 'bindings_v2.json'
const BINDING_KINDS = new Set(['process', 'entity', 'bucket'])
const ROUTE_RE = /\/apps_\/default\/api\/v1\/default\/integrations\/codedapp\/([^?]*)/
const SESSION_COOKIE = 'uipath_local_public_session'
const SESSION_ID_RE = /^[a-f0-9]{64}$/
const PORT_RE = /:(\d+)$/
const COOKIE_SEPARATOR_RE = /;\s*/
const NAME_FIELD_RE = /name\s*:\s*(['"`])(.*?)\1/
const FOLDER_PATH_FIELD_RE = /folderPath\s*:\s*(['"`])(.*?)\1/
const HEAD_OPEN_TAG_RE = /<head\b[^>]*>/i
const TRAILING_SLASH_RE = /\/$/
const DASH_RE = /-/g
const SINGLE_QUOTE_RE = /'/g
const IPV6_BRACKET_RE = /^\[|\]$/g
const PROCESS_JOBS_RE = /^orchestrator\/processes\/([^/]+)\/jobs$/
const JOB_OUTPUT_RE = /^orchestrator\/jobs\/([^/]+)\/output$/
const ENTITY_RECORDS_RE = /^datafabric\/entities\/([^/]+)\/records(?:\/([^/]+))?$/
const BUCKET_FILES_RE = /^orchestrator\/buckets\/([^/]+)\/files$/
// Keys a public deployment doesn't serve: no OAuth client, and the base URL is set in the page instead.
const NON_PUBLIC_CONFIG_KEYS = new Set(['clientId', 'scope', 'redirectUri', 'baseUrl'])
const TOKEN_REFRESH_MARGIN_SECONDS = 120
// The proxy acts as the app's external application, so only the developer's own browser may call it: a page on
// another site that rebinds its DNS to 127.0.0.1 still sends its own name as Host.
const LOCAL_HOST_RE = /^(localhost|127\.0\.0\.1|::1|[a-z0-9-]+\.localhost)$/i
// webpack-dev-server's own Host and cross-origin guards; the proxy goes right after them.
const WEBPACK_GUARD_MIDDLEWARES = ['host-header-check', 'cross-origin-header-check']
const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const RESOURCE_RE = /resource\.(process|entity|bucket)\(\s*\{([^}]*)\}\s*\)/g

type Kind = 'process' | 'entity' | 'bucket'

export interface DeclaredResource {
  kind: Kind
  name: string
  folderPath?: string
  /** The binding key as written in bindings_v2.json; derived from name and folder when absent. */
  key?: string
}

interface AccessEntry {
  resource?: string
  key?: string
  mode?: string
}

export interface PublicDevSettings {
  clientId: string
  clientSecret: string
  folderKey?: string
}

interface Session {
  owned: Set<string>
  jobFolders: Map<string, Record<string, string>>
}

// ===== Settings =====

/** Shell env first, then the dev env files (later file wins). Never exposed to the page. */
function readPublicEnv(cwd: string): Record<string, string | undefined> {
  const merged: Record<string, string> = {}
  for (const file of DEV_ENV_FILES) {
    const fullPath = path.resolve(cwd, file)
    if (fs.existsSync(fullPath)) Object.assign(merged, parse(fs.readFileSync(fullPath, 'utf-8')))
  }
  const read = (name: string) => process.env[name] || merged[name] || undefined
  return Object.fromEntries(Object.values(PUBLIC_ENV).map(name => [name, read(name)]))
}

/** `undefined` when local public mode is off. Throws when it is on but the credentials are missing. */
export function readPublicDevSettings(cwd: string = process.cwd()): PublicDevSettings | undefined {
  const env = readPublicEnv(cwd)
  if (env[PUBLIC_ENV.ENABLED] !== 'true') return undefined
  const clientId = env[PUBLIC_ENV.CLIENT_ID]
  const clientSecret = env[PUBLIC_ENV.CLIENT_SECRET]
  if (!clientId || !clientSecret) {
    throw new Error(
      `[${PLUGIN_NAME}] ${PUBLIC_ENV.ENABLED}=true needs ${PUBLIC_ENV.CLIENT_ID} and ${PUBLIC_ENV.CLIENT_SECRET} ` +
      '(the confidential external application the app is deployed with). Put them in .env.local and keep that file out of source control.'
    )
  }
  return { clientId, clientSecret, folderKey: env[PUBLIC_ENV.FOLDER_KEY] }
}

/** Read the declarations as text, like the CLI does when it writes bindings_v2.json. */
export function readDeclaredResources(cwd: string = process.cwd()): DeclaredResource[] {
  const declared = readResourceDeclarations(cwd)
  // Same order as the packer: declarations go over a hand-written bindings_v2.json.
  const seen = new Set(declared.map(item => `${item.kind}:${bindingKey(item)}`))
  return [...declared, ...readBindingsFile(cwd).filter(item => !seen.has(`${item.kind}:${bindingKey(item)}`))]
}

const field = (body: string, fieldRe: RegExp) => body.match(fieldRe)?.[2]

function readResourceDeclarations(cwd: string): DeclaredResource[] {
  const fullPath = path.resolve(cwd, RESOURCES_FILE)
  if (!fs.existsSync(fullPath)) return []
  const text = fs.readFileSync(fullPath, 'utf-8')
  return [...text.matchAll(RESOURCE_RE)].flatMap(([, kind, body]) => {
    const name = field(body, NAME_FIELD_RE)
    return name ? [{ kind: kind as Kind, name, folderPath: kind === 'entity' ? undefined : field(body, FOLDER_PATH_FIELD_RE) }] : []
  })
}

/**
 * A hand-written bindings_v2.json, where the packer looks for one: next to package.json, or one level up when
 * the app sits in a solution project's source/ folder.
 */
function readBindingsFile(cwd: string): DeclaredResource[] {
  const fullPath = [path.resolve(cwd, BINDINGS_FILE), path.resolve(cwd, '..', BINDINGS_FILE)].find(candidate => fs.existsSync(candidate))
  if (!fullPath) return []
  let resources: unknown
  try {
    resources = JSON.parse(fs.readFileSync(fullPath, 'utf-8')).resources
  } catch (error) {
    console.warn(`[${PLUGIN_NAME}] Could not read ${fullPath}:`, error instanceof Error ? error.message : error)
    return []
  }
  if (!Array.isArray(resources)) return []
  return resources.flatMap((entry: { resource?: string; key?: string; value?: { name?: { defaultValue?: string }; folderPath?: { defaultValue?: string } } }) => {
    const kind = entry.resource?.toLowerCase()
    const name = entry.value?.name?.defaultValue
    if (!kind || !BINDING_KINDS.has(kind) || !name || !entry.key) return []
    const folder = entry.value?.folderPath?.defaultValue
    return [{ kind: kind as Kind, name, folderPath: folder && folder !== '.' ? folder : undefined, key: entry.key }]
  })
}

/** Same key the CLI writes into bindings_v2.json and the SDK sends: `Name.FolderPath`, entities by name only. */
export function bindingKey(resource: DeclaredResource): string {
  return resource.key ?? (resource.folderPath ? `${resource.name}.${resource.folderPath}` : resource.name)
}

/** uipath.json `access`; a resource without an entry is open to all. */
export function isOpenToAll(access: unknown, kind: Kind, key: string): boolean {
  const entry = Array.isArray(access)
    ? (access as AccessEntry[]).find(item => item.resource?.toLowerCase() === kind && item.key === key)
    : undefined
  return entry?.mode !== 'session'
}

/** The meta tags a public deployment serves: no OAuth client and an app key. The base URL comes from PUBLIC_BASE_URL_SCRIPT. */
export function toPublicConfig(config: UiPathConfig): UiPathConfig {
  const result: UiPathConfig = {}
  for (const [key, value] of Object.entries(config)) {
    if (typeof value === 'string' && !NON_PUBLIC_CONFIG_KEYS.has(key)) result[key] = value
  }
  return { ...result, appKey: LOCAL_APP_KEY }
}

/**
 * Points the SDK at the dev server that served the page, as a deployed public app points it at the Apps service.
 * Set in the page rather than at build time, so it holds for any port or host the dev server answers on.
 * Runs inline in <head>, before the app's scripts read the meta tags.
 */
export const PUBLIC_BASE_URL_SCRIPT =
  "document.head.appendChild(Object.assign(document.createElement('meta'),{name:'uipath:base-url',content:location.origin}));"

/** Inject the base URL script directly after <head> (for webpack, which edits the emitted HTML). */
export function injectPublicBaseUrlScriptHtml(html: string): string {
  return html.replace(HEAD_OPEN_TAG_RE, match => `${match}\n  <script>${PUBLIC_BASE_URL_SCRIPT}</script>`)
}

export function logPublicMode(settings: PublicDevSettings, cwd: string = process.cwd()): void {
  const declared = readDeclaredResources(cwd).map(item => `${item.kind} ${bindingKey(item)}`)
  console.log(
    `[${PLUGIN_NAME}] Public mode: the app runs without sign-in, as external application ${settings.clientId}. ` +
    `Declared resources: ${declared.length ? declared.join(', ') : 'none'}.`
  )
}

type DevServerMiddlewares = unknown[]
interface WebpackDevServerOptions {
  setupMiddlewares?: (middlewares: DevServerMiddlewares, devServer: unknown) => DevServerMiddlewares
}

/**
 * webpack-dev-server reads `devServer` from the compiler's options after plugins run. The proxy goes after the
 * server's Host and cross-origin guards and ahead of the app's own `setupMiddlewares`.
 */
export function addPublicDevMiddleware(devServer: WebpackDevServerOptions, middleware: Middleware): void {
  const existing = devServer.setupMiddlewares
  devServer.setupMiddlewares = (middlewares, server) => {
    const result = existing ? existing(middlewares, server) : middlewares
    const lastGuard = Math.max(-1, ...WEBPACK_GUARD_MIDDLEWARES.map(name =>
      result.findIndex(entry => (entry as { name?: string })?.name === name)))
    result.splice(lastGuard + 1, 0, { name: `${PLUGIN_NAME}-public-app`, middleware })
    return result
  }
}

// ===== Server =====

export type Middleware = (req: IncomingMessage, res: ServerResponse, next: () => void) => void

/** The part of `fetch` the proxy uses, so tests can pass a plain function. */
export type FetchLike = (url: string, init: RequestInit) => Promise<Response>

export interface PublicDevServerOptions {
  settings: PublicDevSettings
  /** uipath.json as last read, so an edit applies on the next call. */
  getConfig: () => UiPathConfig
  cwd?: string
  fetchImpl?: FetchLike
}

class HttpError extends Error {
  constructor(public status: number, public body?: Record<string, unknown>) {
    super(String(status))
  }
}

const same = (a?: string, b?: string) => !!a && !!b && a.toLowerCase() === b.toLowerCase()

export function createPublicDevMiddleware({ settings, getConfig, cwd = process.cwd(), fetchImpl = fetch }: PublicDevServerOptions): Middleware {
  const sessions = new Map<string, Session>()
  let token: { value: string; expiresAt: number } | undefined
  const baseUrl = () => (getConfig().baseUrl ?? '').replace(TRAILING_SLASH_RE, '')

  async function appToken(): Promise<string> {
    if (token && Date.now() < token.expiresAt) return token.value
    const config = getConfig()
    const response = await fetchImpl(`${baseUrl()}/${config.orgName}/identity_/connect/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: settings.clientId,
        client_secret: settings.clientSecret,
        scope: config.scope ?? '',
      }),
    })
    const body = await response.json().catch(() => ({})) as { access_token?: string; expires_in?: number; error?: string; error_description?: string }
    if (!response.ok || !body.access_token) {
      const reason = [body.error, body.error_description].filter(Boolean).join(': ')
      // The deployed app sends the same scope, so fix it in uipath.json rather than here.
      const hint = body.error === 'invalid_scope'
        ? ' Set `scope` in uipath.json to application scopes of the external application only (no openid or offline_access).'
        : ''
      throw new HttpError(500, { message: `Identity rejected the app's client credentials${reason ? ` (${reason})` : ''}.${hint}` })
    }
    token = { value: body.access_token, expiresAt: Date.now() + ((body.expires_in ?? 3600) - TOKEN_REFRESH_MARGIN_SECONDS) * 1000 }
    return token.value
  }

  // Declarations and access are re-read per call, so an edit applies on the next request.
  function declared(kind: Kind, key: string): DeclaredResource {
    const resource = readDeclaredResources(cwd).find(item => item.kind === kind && bindingKey(item) === key)
    if (!resource) {
      throw new HttpError(403, { message: `This app isn't allowed to use the ${kind} "${key}". Add it to ${BINDINGS_FILE}.` })
    }
    return resource
  }

  // `access` comes from the same uipath.json the plugin reads (its `configPath`), as last read.
  const access = (): unknown => (getConfig() as Record<string, unknown>).access

  // Orchestrator picks the folder by encoded path, then key; with neither, the deployment's folder.
  function folderHeaders(resource?: DeclaredResource): Record<string, string> {
    if (resource?.folderPath) {
      return { 'X-UIPATH-FolderPath-Encoded': Buffer.from(resource.folderPath, 'utf16le').toString('base64') }
    }
    return settings.folderKey ? { 'X-UIPATH-FolderKey': settings.folderKey } : {}
  }

  async function call(method: string, url: string, headers: Record<string, string> = {}, body?: BodyInit): Promise<Response> {
    const response = await fetchImpl(url, { method, headers: { Authorization: `Bearer ${await appToken()}`, ...headers }, body })
    if (!response.ok) {
      const data = await response.json().catch(() => ({})) as Record<string, unknown>
      const message = [data.message, data.error].find(value => typeof value === 'string')
      // A downstream 401 means the app token was rejected; the SDK would loop on a new session, so it becomes a 500.
      throw new HttpError(response.status === 401 ? 500 : response.status, {
        errorCode: data.errorCode ?? data.code,
        message: message ?? `The service behind this app returned ${response.status}.`,
      })
    }
    return response
  }

  async function handle(method: string, route: string, url: URL, session: Session, body: Buffer, contentType?: string): Promise<{ status: number; data?: unknown }> {
    const config = getConfig()
    const tenantUrl = `${baseUrl()}/${config.orgName}/${config.tenantName}`
    const readJson = (): Record<string, unknown> => {
      try {
        return body.length ? JSON.parse(body.toString()) : {}
      } catch {
        throw new HttpError(400, { message: 'The request body is not valid JSON.' })
      }
    }
    let match: RegExpMatchArray | null

    if (method === 'POST' && (match = route.match(PROCESS_JOBS_RE))) {
      const process = declared('process', decodeURIComponent(match[1]))
      const inputArguments = readJson().inputArguments
      const startInfo: Record<string, unknown> = { ReleaseName: process.name, Source: 'Apps', Strategy: 'ModernJobsCount', JobsCount: 1 }
      if (inputArguments !== undefined && inputArguments !== null) {
        startInfo.InputArguments = typeof inputArguments === 'string' ? inputArguments : JSON.stringify(inputArguments)
      }
      const headers = folderHeaders(process)
      const response = await call('POST', `${tenantUrl}/orchestrator_/odata/Jobs/UiPath.Server.Configuration.OData.StartJobs`, { ...headers, 'Content-Type': 'application/json' }, JSON.stringify({ startInfo }))
      const result = await response.json() as { value?: Record<string, unknown>[] }
      const jobKey = result.value?.[0]?.Key ?? result.value?.[0]?.key
      if (typeof jobKey !== 'string') throw new HttpError(500)
      session.owned.add(jobKey)
      session.jobFolders.set(jobKey, headers)
      return { status: 200, data: result }
    }

    if (method === 'GET' && (match = route.match(JOB_OUTPUT_RE))) {
      const jobKey = decodeURIComponent(match[1])
      const owns = session.owned.has(jobKey)
      const openProcesses = readDeclaredResources(cwd).filter(item => item.kind === 'process' && isOpenToAll(access(), 'process', bindingKey(item)))
      if (!owns && openProcesses.length === 0) throw new HttpError(404)
      // Orchestrator needs a folder header here but finds the job in any folder, so any declared folder will do.
      const headers = session.jobFolders.get(jobKey)
        ?? openProcesses.map(folderHeaders).find(candidate => Object.keys(candidate).length > 0)
        ?? {}
      const response = await call('GET', `${tenantUrl}/orchestrator_/odata/Jobs/UiPath.Server.Configuration.OData.GetByKey(identifier=${encodeURIComponent(jobKey)})?$expand=Release`, headers)
      const job = await response.json() as { Key?: string; FolderKey?: string; OrganizationUnitFullyQualifiedName?: string; Release?: { Name?: string } }
      if (!job.Key) throw new HttpError(404)
      const fromOpenProcess = openProcesses.some(item =>
        item.name === job.Release?.Name &&
        (item.folderPath ? same(job.OrganizationUnitFullyQualifiedName, item.folderPath) : same(job.FolderKey, settings.folderKey)))
      if (!owns && !fromOpenProcess) throw new HttpError(404)
      return { status: 200, data: job }
    }

    if ((match = route.match(ENTITY_RECORDS_RE))) {
      const entityKey = decodeURIComponent(match[1])
      const recordId = match[2] && decodeURIComponent(match[2])
      const entityUrl = (entity: DeclaredResource) => `${tenantUrl}/datafabric_/api/v3/entities/${encodeURIComponent(entity.name)}`

      if (method === 'POST' && !recordId) {
        const entity = declared('entity', entityKey)
        // A caller-chosen Id is one they could claim ownership of.
        const fields = readJson()
        delete fields.Id
        const response = await call('POST', `${entityUrl(entity)}/insert?expansionLevel=0`, { ...folderHeaders(entity), 'Content-Type': 'application/json' }, JSON.stringify(fields))
        const record = await response.json() as { Id?: unknown }
        if (typeof record.Id !== 'string') throw new HttpError(500)
        session.owned.add(record.Id.toLowerCase())
        return { status: 200, data: record }
      }

      if (method === 'GET' && recordId) {
        const canRead = GUID_RE.test(recordId) && (session.owned.has(recordId.toLowerCase()) || isOpenToAll(access(), 'entity', entityKey))
        if (!canRead) throw new HttpError(404)
        const entity = declared('entity', entityKey)
        const response = await call('GET', `${entityUrl(entity)}/read/${encodeURIComponent(recordId)}?expansionLevel=0`, folderHeaders(entity))
        return { status: 200, data: await response.json() }
      }

      if (method === 'GET' && !recordId) {
        // All-access entities only: one table holds every visitor's records.
        if (!isOpenToAll(access(), 'entity', entityKey)) throw new HttpError(403)
        const entity = declared('entity', entityKey)
        const query = new URLSearchParams({ expansionLevel: '0' })
        for (const name of ['start', 'limit']) {
          const value = url.searchParams.get(name)
          if (value !== null) query.set(name, value)
        }
        const response = await call('GET', `${entityUrl(entity)}/read?${query}`, folderHeaders(entity))
        return { status: 200, data: await response.json() }
      }
    }

    if (method === 'POST' && (match = route.match(BUCKET_FILES_RE))) {
      const fileName = url.searchParams.get('fileName')?.trim()
      if (!fileName) throw new HttpError(400, { message: 'A file name is required.' })
      const bucket = declared('bucket', decodeURIComponent(match[1]))
      // The service picks the path, so a visitor can only add files, never overwrite one.
      const uploadId = randomUUID().replace(DASH_RE, '')
      const dot = fileName.lastIndexOf('.')
      const filePath = dot > 0 ? `${fileName.slice(0, dot)}_${uploadId}${fileName.slice(dot)}` : `${fileName}_${uploadId}`
      const type = contentType || 'application/octet-stream'
      const headers = folderHeaders(bucket)
      const bucketsUrl = `${tenantUrl}/orchestrator_/odata/Buckets`
      const filter = new URLSearchParams({ $filter: `Name eq '${bucket.name.replace(SINGLE_QUOTE_RE, "''")}'`, $select: 'Id' })
      const buckets = await (await call('GET', `${bucketsUrl}?${filter}`, headers)).json() as { value?: { Id?: unknown }[] }
      const bucketId = buckets.value?.[0]?.Id
      if (bucketId === undefined) throw new HttpError(404, { message: `The "${bucket.name}" bucket wasn't found in its folder in Orchestrator.` })
      const writeQuery = new URLSearchParams({ path: filePath, contentType: type })
      const write = await (await call('GET', `${bucketsUrl}(${bucketId})/UiPath.Server.Configuration.OData.GetWriteUri?${writeQuery}`, headers)).json() as {
        Uri: string; Verb: string; RequiresAuth: boolean; Headers?: { Keys?: string[]; Values?: string[] } | null
      }
      const uploadHeaders: Record<string, string> = Object.fromEntries((write.Headers?.Keys ?? []).map((key, index) => [key, write.Headers?.Values?.[index] ?? '']))
      if (write.RequiresAuth) Object.assign(uploadHeaders, headers, { Authorization: `Bearer ${await appToken()}` })
      const stored = await fetchImpl(write.Uri, { method: write.Verb, headers: { 'Content-Type': type, ...uploadHeaders }, body: body as BodyInit })
      // A storage 401 would make the SDK open a new session and upload again, so it becomes a 500, like call().
      if (!stored.ok) throw new HttpError(stored.status >= 400 && stored.status !== 401 ? stored.status : 500, { message: `The file couldn't be saved to storage (storage returned ${stored.status}).` })
      return { status: 200, data: { path: filePath } }
    }

    throw new HttpError(404)
  }

  return (req, res, next) => {
    const route = req.url?.match(ROUTE_RE)?.[1]
    if (route === undefined) {
      next()
      return
    }
    const send = (status: number, data?: unknown) => {
      res.statusCode = status
      res.setHeader('Cache-Control', 'no-store')
      if (data === undefined) {
        res.end()
        return
      }
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(data))
    }

    if (!isLocalRequest(req)) {
      send(403, { message: 'Local public mode answers only to pages served from localhost.' })
      return
    }

    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => {
      const method = req.method ?? 'GET'
      // Cookies on localhost are shared across ports, so each dev server gets its own cookie name.
      const cookieName = `${SESSION_COOKIE}_${requestHost(req).match(PORT_RE)?.[1] ?? 'default'}`
      const sessionId = readCookie(req.headers.cookie, cookieName)

      if (method === 'POST' && route === 'session') {
        const id = sessionId && sessions.has(sessionId) ? sessionId : randomBytes(32).toString('hex')
        if (!sessions.has(id)) sessions.set(id, { owned: new Set(), jobFolders: new Map() })
        res.setHeader('Set-Cookie', `${cookieName}=${id}; Path=/; HttpOnly; SameSite=Lax`)
        send(204)
        return
      }

      const session = sessionId ? sessions.get(sessionId) : undefined
      if (!session) {
        send(401, { message: 'A session is required. Call /session first.' })
        return
      }

      const url = new URL(req.url ?? '/', 'http://localhost')
      handle(method, route, url, session, Buffer.concat(chunks), req.headers['content-type'])
        .then(({ status, data }) => send(status, data))
        .catch((error: unknown) => {
          if (error instanceof HttpError) {
            send(error.status, error.body)
          } else {
            console.error(`[${PLUGIN_NAME}] local public app call failed:`, error instanceof Error ? error.message : error)
            send(500, { message: "The local public app proxy couldn't complete the call." })
          }
        })
    })
  }
}

/** Host must be a loopback name, and a browser call must come from the same origin as the page. */
/** HTTP/1.1 sends Host; HTTP/2 (Vite over HTTPS) sends :authority instead. */
export function requestHost(req: Pick<IncomingMessage, 'headers'>): string {
  const authority = (req.headers as Record<string, string | string[] | undefined>)[':authority']
  return req.headers.host ?? (typeof authority === 'string' ? authority : '')
}

function readCookie(header: string | undefined, name: string): string | undefined {
  const value = header?.split(COOKIE_SEPARATOR_RE).find(part => part.startsWith(`${name}=`))?.slice(name.length + 1)
  return value && SESSION_ID_RE.test(value) ? value : undefined
}

export function isLocalRequest(req: Pick<IncomingMessage, 'headers'>): boolean {
  const host = requestHost(req)
  const hostname = host.replace(PORT_RE, '').replace(IPV6_BRACKET_RE, '')
  if (!LOCAL_HOST_RE.test(hostname)) return false
  if (req.headers['sec-fetch-site'] === 'cross-site') return false
  const origin = req.headers.origin
  if (!origin) return true
  try {
    return new URL(origin).host === host
  } catch (error) {
    console.warn(`[${PLUGIN_NAME}] Could not parse the Origin header, so the call is refused:`, error instanceof Error ? error.message : error)
    return false
  }
}
