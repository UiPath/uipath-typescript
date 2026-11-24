import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { EventEmitter } from 'node:events'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
  addPublicDevMiddleware,
  bindingKey,
  injectPublicBaseUrlScriptHtml,
  isLocalRequest,
  createPublicDevMiddleware,
  isOpenToAll,
  readDeclaredResources,
  readPublicDevSettings,
  toPublicConfig,
} from '../src/core/public-dev-server'

const API = '/org/apps_/default/api/v1/default/integrations/codedapp/'
const CONFIG = { baseUrl: 'https://alpha.uipath.com', orgName: 'org', tenantName: 'tenant', scope: 'OR.Jobs', clientId: 'pkce', redirectUri: 'http://localhost:5173' }
const RECORD_ID = '0f8fad5b-d9cb-469f-a165-70867728950e'

let dir: string

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'coded-apps-public-'))
  fs.writeFileSync(path.join(dir, 'uipath_resources.ts'), `
import { resource } from '@uipath/uipath-typescript/resources';
export class ProjectResources {
    static readonly feedback = resource.entity({ name: 'EventFeedback' });
    static readonly summarize = resource.process({ name: 'Summarize', folderPath: 'Shared' });
    static readonly uploads = resource.bucket({ name: "Uploads", folderPath: "Shared/Docs" });
}`)
})

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true })
  vi.unstubAllEnvs()
})

function writeAccess(access: unknown): void {
  fs.writeFileSync(path.join(dir, 'uipath.json'), JSON.stringify({ access }))
}

describe('readPublicDevSettings', () => {
  it('is off unless UIPATH_PUBLIC_APP is true', () => {
    expect(readPublicDevSettings(dir)).toBeUndefined()
  })

  it('reads the credentials from .env.local', () => {
    fs.writeFileSync(path.join(dir, '.env.local'), 'UIPATH_PUBLIC_APP=true\nUIPATH_PUBLIC_APP_CLIENT_ID=id\nUIPATH_PUBLIC_APP_CLIENT_SECRET=s3cret\n')
    expect(readPublicDevSettings(dir)).toEqual({ clientId: 'id', clientSecret: 's3cret', folderKey: undefined })
  })

  it('fails when public mode is on without a secret', () => {
    vi.stubEnv('UIPATH_PUBLIC_APP', 'true')
    vi.stubEnv('UIPATH_PUBLIC_APP_CLIENT_ID', 'id')
    expect(() => readPublicDevSettings(dir)).toThrow(/UIPATH_PUBLIC_APP_CLIENT_SECRET/)
  })
})

describe('declarations and access', () => {
  it('reads processes, entities and buckets with the CLI binding keys', () => {
    expect(readDeclaredResources(dir).map(item => `${item.kind}:${bindingKey(item)}`)).toEqual([
      'entity:EventFeedback',
      'process:Summarize.Shared',
      'bucket:Uploads.Shared/Docs',
    ])
  })

  it('opens a resource to all unless access says session', () => {
    const access = [{ resource: 'entity', key: 'EventFeedback', mode: 'session' }]
    expect(isOpenToAll(access, 'entity', 'EventFeedback')).toBe(false)
    expect(isOpenToAll(access, 'process', 'Summarize.Shared')).toBe(true)
    expect(isOpenToAll(undefined, 'entity', 'EventFeedback')).toBe(true)
  })

  it('serves public meta tags: no OAuth client and an app key; the base URL is set in the page', () => {
    expect(toPublicConfig({ ...CONFIG, ...JSON.parse('{"access":[]}') })).toEqual({
      orgName: 'org',
      tenantName: 'tenant',
      appKey: 'local-dev',
    })
    const html = injectPublicBaseUrlScriptHtml('<html><head lang="en"><title>t</title></head></html>')
    expect(html).toMatch(/^<html><head lang="en">\n  <script>.*location\.origin.*<\/script><title>/)
  })

  it('puts the proxy first in webpack-dev-server, ahead of the app\'s own middlewares', () => {
    const own = vi.fn((middlewares: unknown[]) => [...middlewares, 'app'])
    const devServer: Parameters<typeof addPublicDevMiddleware>[0] = { setupMiddlewares: own }
    const middleware = vi.fn()
    addPublicDevMiddleware(devServer, middleware)
    const result = devServer.setupMiddlewares!(['static'], {})
    expect(own).toHaveBeenCalled()
    expect(result).toEqual([{ name: 'coded-apps-public-app', middleware }, 'static', 'app'])
  })

  it('puts the proxy after webpack-dev-server\'s host and cross-origin guards', () => {
    const devServer: Parameters<typeof addPublicDevMiddleware>[0] = {}
    const middleware = vi.fn()
    addPublicDevMiddleware(devServer, middleware)
    const result = devServer.setupMiddlewares!([{ name: 'host-header-check' }, { name: 'cross-origin-header-check' }, 'static'], {})
    expect(result).toEqual([{ name: 'host-header-check' }, { name: 'cross-origin-header-check' }, { name: 'coded-apps-public-app', middleware }, 'static'])
  })

  it('answers only to the developer\'s own browser on localhost', () => {
    expect(isLocalRequest({ headers: { host: 'localhost:5173' } })).toBe(true)
    expect(isLocalRequest({ headers: { host: '127.0.0.1:5173', origin: 'http://127.0.0.1:5173' } })).toBe(true)
    expect(isLocalRequest({ headers: { host: '[::1]:5173' } })).toBe(true)
    // DNS rebinding: the attacker's name arrives as Host
    expect(isLocalRequest({ headers: { host: 'evil.example:5173', origin: 'http://evil.example:5173' } })).toBe(false)
    expect(isLocalRequest({ headers: { host: 'localhost:5173', origin: 'https://evil.example' } })).toBe(false)
    expect(isLocalRequest({ headers: { host: 'localhost:5173', 'sec-fetch-site': 'cross-site' } })).toBe(false)
    // HTTP/2 (Vite over HTTPS) sends :authority instead of Host
    expect(isLocalRequest({ headers: { ':authority': 'localhost:5173', origin: 'https://localhost:5173' } as never })).toBe(true)
  })
})

// ===== Middleware =====

interface Reply { status: number; headers: Record<string, string>; body?: unknown }

// Job GetByKey returns; tests set the process and folder it came from.
let job: Record<string, unknown> = {}
// What GetWriteUri returns as Headers, the storage status, and the token reply; tests override them.
let writeHeaders: unknown = { Keys: ['x-ms-blob-type'], Values: ['BlockBlob'] }
let storageStatus = 201
let buckets: unknown[] = [{ Id: 7 }]
let tokenReply: { status: number; body: unknown } = { status: 200, body: { access_token: 'app-token', expires_in: 3600 } }

beforeEach(() => {
  writeHeaders = { Keys: ['x-ms-blob-type'], Values: ['BlockBlob'] }
  storageStatus = 201
  buckets = [{ Id: 7 }]
  tokenReply = { status: 200, body: { access_token: 'app-token', expires_in: 3600 } }
})

function fakeFetch() {
  const calls: { url: string; init: RequestInit }[] = []
  const fetchImpl = vi.fn(async (url: string, init: RequestInit) => {
    calls.push({ url, init })
    const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 })
    if (url.endsWith('/identity_/connect/token')) return new Response(JSON.stringify(tokenReply.body), { status: tokenReply.status })
    if (url.includes('StartJobs')) return ok({ value: [{ Key: 'job-1' }] })
    if (url.includes('/insert')) return ok({ Id: RECORD_ID.toUpperCase(), Name: 'x' })
    if (url.includes('/read')) return ok({ value: [] })
    if (url.includes('GetByKey')) return ok(job)
    if (url.includes('GetWriteUri')) return ok({ Uri: 'https://storage.example/put', Verb: 'PUT', RequiresAuth: false, Headers: writeHeaders })
    if (url.includes('/odata/Buckets?')) return ok({ value: buckets })
    if (url === 'https://storage.example/put') return new Response(null, { status: storageStatus })
    return new Response('{}', { status: 404 })
  })
  return { fetchImpl, calls }
}

function request(middleware: ReturnType<typeof createPublicDevMiddleware>, method: string, route: string, { body, cookie, raw, host = 'localhost:5173' }: { body?: unknown; cookie?: string; raw?: Buffer; host?: string } = {}): Promise<Reply> {
  return new Promise((resolve) => {
    const req = Object.assign(new EventEmitter(), {
      method,
      url: API + route,
      headers: { host, cookie, 'content-type': 'application/json' } as Record<string, string | undefined>,
    })
    const headers: Record<string, string> = {}
    const res = {
      statusCode: 0,
      setHeader: (name: string, value: string) => { headers[name.toLowerCase()] = value },
      end: (text?: string) => resolve({ status: res.statusCode, headers, body: text ? JSON.parse(text) : undefined }),
    }
    middleware(req as never, res as never, () => resolve({ status: -1, headers }))
    if (raw) req.emit('data', raw)
    if (body !== undefined) req.emit('data', Buffer.from(JSON.stringify(body)))
    req.emit('end')
  })
}

async function openSession(middleware: ReturnType<typeof createPublicDevMiddleware>): Promise<string> {
  const reply = await request(middleware, 'POST', 'session')
  expect(reply.status).toBe(204)
  return reply.headers['set-cookie'].split(';')[0]
}

function setup() {
  const { fetchImpl, calls } = fakeFetch()
  const middleware = createPublicDevMiddleware({
    settings: { clientId: 'ext-app', clientSecret: 's3cret' },
    // Stands in for the plugin's readConfig: uipath.json from the project, here only `access`.
    getConfig: () => {
      const file = path.join(dir, 'uipath.json')
      return { ...CONFIG, ...(fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf-8')) : {}) }
    },
    cwd: dir,
    fetchImpl,
  })
  return { middleware, calls }
}

describe('createPublicDevMiddleware', () => {
  it('passes other requests through', async () => {
    const { middleware } = setup()
    const req = Object.assign(new EventEmitter(), { method: 'GET', url: '/src/main.ts', headers: {} })
    const next = vi.fn()
    middleware(req as never, {} as never, next)
    expect(next).toHaveBeenCalled()
  })

  it('needs a session, like the Apps service', async () => {
    const { middleware } = setup()
    expect((await request(middleware, 'GET', 'datafabric/entities/EventFeedback/records')).status).toBe(401)
  })

  it('starts one job as the app, in the declared folder, and never returns the secret', async () => {
    const { middleware, calls } = setup()
    const cookie = await openSession(middleware)
    const reply = await request(middleware, 'POST', 'orchestrator/processes/Summarize.Shared/jobs', { cookie, body: { inputArguments: { text: 'hi' } } })

    expect(reply.status).toBe(200)
    const tokenCall = calls.find(call => call.url.endsWith('/connect/token'))!
    expect(String(tokenCall.init.body)).toContain('client_secret=s3cret')
    const start = calls.find(call => call.url.includes('StartJobs'))!
    expect(start.url).toBe('https://alpha.uipath.com/org/tenant/orchestrator_/odata/Jobs/UiPath.Server.Configuration.OData.StartJobs')
    expect(JSON.parse(String(start.init.body))).toEqual({
      startInfo: { ReleaseName: 'Summarize', Source: 'Apps', Strategy: 'ModernJobsCount', JobsCount: 1, InputArguments: '{"text":"hi"}' },
    })
    expect((start.init.headers as Record<string, string>)['X-UIPATH-FolderPath-Encoded']).toBe(Buffer.from('Shared', 'utf16le').toString('base64'))
    expect((start.init.headers as Record<string, string>).Authorization).toBe('Bearer app-token')
    expect(JSON.stringify(reply)).not.toContain('s3cret')
    expect(JSON.stringify(reply)).not.toContain('app-token')
  })

  it('refuses a resource the app did not declare', async () => {
    const { middleware, calls } = setup()
    const cookie = await openSession(middleware)
    const reply = await request(middleware, 'POST', 'orchestrator/processes/Other.Shared/jobs', { cookie, body: {} })
    expect(reply.status).toBe(403)
    expect(calls).toHaveLength(0)
  })

  it('lets only the session that added a record read it when the entity is session-only', async () => {
    writeAccess([{ resource: 'entity', key: 'EventFeedback', mode: 'session' }])
    const { middleware, calls } = setup()
    const owner = await openSession(middleware)
    const other = await openSession(middleware)

    const insert = await request(middleware, 'POST', 'datafabric/entities/EventFeedback/records', { cookie: owner, body: { Id: 'mine', Name: 'x' } })
    expect(insert.status).toBe(200)
    expect(JSON.parse(String(calls.find(call => call.url.includes('/insert'))!.init.body))).toEqual({ Name: 'x' })

    expect((await request(middleware, 'GET', `datafabric/entities/EventFeedback/records/${RECORD_ID}`, { cookie: owner })).status).toBe(200)
    expect((await request(middleware, 'GET', `datafabric/entities/EventFeedback/records/${RECORD_ID}`, { cookie: other })).status).toBe(404)
    expect((await request(middleware, 'GET', 'datafabric/entities/EventFeedback/records', { cookie: owner })).status).toBe(403)
  })

  it('lists an entity that is open to all', async () => {
    const { middleware, calls } = setup()
    const cookie = await openSession(middleware)
    const reply = await request(middleware, 'GET', 'datafabric/entities/EventFeedback/records?start=0&limit=20', { cookie })
    expect(reply.status).toBe(200)
    expect(calls.at(-1)!.url).toBe('https://alpha.uipath.com/org/tenant/datafabric_/api/v3/entities/EventFeedback/read?expansionLevel=0&start=0&limit=20')
  })

  describe('job output', () => {
    const output = (key: string) => `orchestrator/jobs/${key}/output`

    it('lets the session that started the job read it', async () => {
      writeAccess([{ resource: 'process', key: 'Summarize.Shared', mode: 'session' }])
      job = { Key: 'job-1', Release: { Name: 'Summarize' }, OrganizationUnitFullyQualifiedName: 'Shared' }
      const { middleware } = setup()
      const owner = await openSession(middleware)
      await request(middleware, 'POST', 'orchestrator/processes/Summarize.Shared/jobs', { cookie: owner, body: {} })
      expect((await request(middleware, 'GET', output('job-1'), { cookie: owner })).status).toBe(200)
    })

    it('refuses another session without calling Orchestrator when no process is open to all', async () => {
      writeAccess([{ resource: 'process', key: 'Summarize.Shared', mode: 'session' }])
      const { middleware, calls } = setup()
      const other = await openSession(middleware)
      expect((await request(middleware, 'GET', output('job-1'), { cookie: other })).status).toBe(404)
      expect(calls.some(call => call.url.includes('GetByKey'))).toBe(false)
    })

    it('lets any session read a job from a declared process that is open to all', async () => {
      job = { Key: 'job-9', Release: { Name: 'Summarize' }, OrganizationUnitFullyQualifiedName: 'shared' }
      const { middleware } = setup()
      const other = await openSession(middleware)
      expect((await request(middleware, 'GET', output('job-9'), { cookie: other })).status).toBe(200)
    })

    it('refuses a job from another folder or an undeclared process', async () => {
      const { middleware } = setup()
      const other = await openSession(middleware)
      job = { Key: 'job-9', Release: { Name: 'Summarize' }, OrganizationUnitFullyQualifiedName: 'Finance' }
      expect((await request(middleware, 'GET', output('job-9'), { cookie: other })).status).toBe(404)
      job = { Key: 'job-9', Release: { Name: 'Payroll' }, OrganizationUnitFullyQualifiedName: 'Shared' }
      expect((await request(middleware, 'GET', output('job-9'), { cookie: other })).status).toBe(404)
    })
  })

  describe('bucket upload', () => {
    it('stores the file under a path it picks, in the declared bucket and folder', async () => {
      const { middleware, calls } = setup()
      const cookie = await openSession(middleware)
      const reply = await request(middleware, 'POST', 'orchestrator/buckets/Uploads.Shared%2FDocs/files?fileName=report.pdf', { cookie, raw: Buffer.from('pdf') })

      expect(reply.status).toBe(200)
      const { path: stored } = reply.body as { path: string }
      expect(stored).toMatch(/^report_[0-9a-f]{32}\.pdf$/)
      const lookup = calls.find(call => call.url.includes('/odata/Buckets?'))!
      expect(new URL(lookup.url).searchParams.get('$filter')).toBe("Name eq 'Uploads'")
      expect((lookup.init.headers as Record<string, string>)['X-UIPATH-FolderPath-Encoded']).toBe(Buffer.from('Shared/Docs', 'utf16le').toString('base64'))
      expect(calls.find(call => call.url.includes('GetWriteUri'))!.url).toContain(`path=${encodeURIComponent(stored)}`)
      const put = calls.find(call => call.url === 'https://storage.example/put')!
      expect(put.init.method).toBe('PUT')
      expect((put.init.headers as Record<string, string>)['x-ms-blob-type']).toBe('BlockBlob')
      expect((put.init.headers as Record<string, string>).Authorization).toBeUndefined()
    })

    it('needs a file name and a declared bucket', async () => {
      const { middleware } = setup()
      const cookie = await openSession(middleware)
      expect((await request(middleware, 'POST', 'orchestrator/buckets/Uploads.Shared%2FDocs/files', { cookie })).status).toBe(400)
      expect((await request(middleware, 'POST', 'orchestrator/buckets/Other.Shared/files?fileName=a.txt', { cookie })).status).toBe(403)
    })
  })

  describe('review fixes', () => {
    it('keeps a separate session per dev server port, since localhost cookies are shared across ports', async () => {
      const { middleware } = setup()
      const reply = await request(middleware, 'POST', 'session', { host: 'localhost:5174' })
      expect(reply.headers['set-cookie']).toMatch(/^uipath_local_public_session_5174=[a-f0-9]{64};/)
      const cookie = reply.headers['set-cookie'].split(';')[0]
      // The 5173 server does not know the 5174 cookie
      expect((await request(middleware, 'GET', 'datafabric/entities/EventFeedback/records', { cookie, host: 'localhost:5173' })).status).toBe(401)
    })

    it('uploads when GetWriteUri returns no headers', async () => {
      writeHeaders = null
      const { middleware } = setup()
      const cookie = await openSession(middleware)
      expect((await request(middleware, 'POST', 'orchestrator/buckets/Uploads.Shared%2FDocs/files?fileName=a.txt', { cookie, raw: Buffer.from('a') })).status).toBe(200)
    })

    it('turns a storage 401 into a 500, so the SDK does not start a new session and upload again', async () => {
      storageStatus = 401
      const { middleware } = setup()
      const cookie = await openSession(middleware)
      expect((await request(middleware, 'POST', 'orchestrator/buckets/Uploads.Shared%2FDocs/files?fileName=a.txt', { cookie, raw: Buffer.from('a') })).status).toBe(500)
    })

    it('explains an invalid_scope from Identity', async () => {
      tokenReply = { status: 400, body: { error: 'invalid_scope' } }
      const { middleware } = setup()
      const cookie = await openSession(middleware)
      const reply = await request(middleware, 'POST', 'orchestrator/processes/Summarize.Shared/jobs', { cookie, body: {} })
      expect(reply.status).toBe(500)
      expect((reply.body as { message: string }).message).toContain('offline_access')
    })
  })

  describe('bucket upload failures', () => {
    it('answers 404 when the declared bucket is not in its folder', async () => {
      buckets = []
      const { middleware, calls } = setup()
      const cookie = await openSession(middleware)
      const reply = await request(middleware, 'POST', 'orchestrator/buckets/Uploads.Shared%2FDocs/files?fileName=a.txt', { cookie, raw: Buffer.from('a') })
      expect(reply.status).toBe(404)
      expect(calls.some(call => call.url.includes('GetWriteUri'))).toBe(false)
    })

    it('passes a storage error status on', async () => {
      storageStatus = 403
      const { middleware } = setup()
      const cookie = await openSession(middleware)
      const reply = await request(middleware, 'POST', 'orchestrator/buckets/Uploads.Shared%2FDocs/files?fileName=a.txt', { cookie, raw: Buffer.from('a') })
      expect(reply.status).toBe(403)
      expect((reply.body as { message: string }).message).toContain('storage returned 403')
    })
  })
})
