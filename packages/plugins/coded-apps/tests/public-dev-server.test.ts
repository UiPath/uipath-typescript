import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { EventEmitter } from 'node:events'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
  addPublicDevMiddleware,
  bindingKey,
  injectPublicBaseUrlScriptHtml,
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
    expect(toPublicConfig({ ...CONFIG, access: [] as unknown as string })).toEqual({
      orgName: 'org',
      tenantName: 'tenant',
      appKey: 'local-dev',
    })
    const html = injectPublicBaseUrlScriptHtml('<html><head lang="en"><title>t</title></head></html>')
    expect(html).toMatch(/^<html><head lang="en">\n  <script>.*location\.origin.*<\/script><title>/)
  })

  it('puts the proxy first in webpack-dev-server, ahead of the app\'s own middlewares', () => {
    const own = vi.fn((middlewares: unknown[]) => [...middlewares, 'app'])
    const devServer = { setupMiddlewares: own }
    const middleware = vi.fn()
    addPublicDevMiddleware(devServer, middleware)
    const result = devServer.setupMiddlewares(['static'], {})
    expect(own).toHaveBeenCalled()
    expect(result).toEqual([{ name: 'coded-apps-public-app', middleware }, 'static', 'app'])
  })
})

// ===== Middleware =====

interface Reply { status: number; headers: Record<string, string>; body?: unknown }

function fakeFetch() {
  const calls: { url: string; init: RequestInit }[] = []
  const fetchImpl = vi.fn(async (url: string, init: RequestInit) => {
    calls.push({ url, init })
    const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 })
    if (url.endsWith('/identity_/connect/token')) return ok({ access_token: 'app-token', expires_in: 3600 })
    if (url.includes('StartJobs')) return ok({ value: [{ Key: 'job-1' }] })
    if (url.includes('/insert')) return ok({ Id: RECORD_ID.toUpperCase(), Name: 'x' })
    if (url.includes('/read')) return ok({ value: [] })
    return new Response('{}', { status: 404 })
  })
  return { fetchImpl: fetchImpl as unknown as typeof fetch, calls }
}

function request(middleware: ReturnType<typeof createPublicDevMiddleware>, method: string, route: string, { body, cookie }: { body?: unknown; cookie?: string } = {}): Promise<Reply> {
  return new Promise((resolve) => {
    const req = Object.assign(new EventEmitter(), {
      method,
      url: API + route,
      headers: { cookie, 'content-type': 'application/json' } as Record<string, string | undefined>,
    })
    const headers: Record<string, string> = {}
    const res = {
      statusCode: 0,
      setHeader: (name: string, value: string) => { headers[name.toLowerCase()] = value },
      end: (text?: string) => resolve({ status: res.statusCode, headers, body: text ? JSON.parse(text) : undefined }),
    }
    middleware(req as never, res as never, () => resolve({ status: -1, headers }))
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
    getConfig: () => CONFIG,
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
})
