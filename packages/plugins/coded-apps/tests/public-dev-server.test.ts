import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { Readable } from 'node:stream'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { createPublicDevMiddleware, readPublicDevContext, type PublicDevContext } from '../src/core/public-dev-server'

const BASE = '/acme/apps_/default/api/v1/default/integrations/codedapp/'

const ctx: PublicDevContext = {
  baseUrl: 'https://staging.api.uipath.com',
  orgName: 'acme',
  tenantName: 'Playground',
  scope: 'DataFabric.Data.Read DataFabric.Data.Write',
  clientId: 'client',
  clientSecret: 'secret',
  bindings: [
    { type: 'entity', key: 'Questions.QandA', name: 'Questions', folderPath: 'QandA' },
    { type: 'entity', key: 'Votes.QandA', name: 'Votes', folderPath: 'QandA' },
  ],
  folderKey: 'folder-key',
  shared: [{ type: 'entity', key: 'Votes.QandA' }],
}

interface Result { status: number; body: unknown; cookie?: string }

function request(middleware: ReturnType<typeof createPublicDevMiddleware>, method: string, route: string, options: { body?: unknown; cookie?: string } = {}): Promise<Result> {
  const req = Readable.from(options.body === undefined ? [] : [Buffer.from(JSON.stringify(options.body))]) as unknown as IncomingMessage
  Object.assign(req, { method, url: BASE + route, headers: options.cookie ? { cookie: options.cookie } : {} })
  return new Promise(resolve => {
    const headers: Record<string, string> = {}
    const res = {
      statusCode: 200,
      setHeader: (name: string, value: string) => { headers[name.toLowerCase()] = value },
      end: (text?: string) => resolve({ status: res.statusCode, body: text ? JSON.parse(text) : undefined, cookie: headers['set-cookie']?.split(';')[0] }),
    } as unknown as ServerResponse & { statusCode: number }
    middleware(req, res, () => resolve({ status: -1, body: undefined }))
  })
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

describe('createPublicDevMiddleware', () => {
  let fetchMock: ReturnType<typeof vi.fn>
  let middleware: ReturnType<typeof createPublicDevMiddleware>

  beforeEach(() => {
    fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith('/identity_/connect/token')) return json({ access_token: 'app-token', expires_in: 3600 })
      if (url.includes('/insert')) return json({ Id: 'ABC-1' })
      return json({ value: [] })
    })
    middleware = createPublicDevMiddleware(ctx, fetchMock as unknown as typeof fetch)
  })

  it('passes other requests to the next handler', async () => {
    const req = { method: 'GET', url: '/src/main.tsx', headers: {} } as IncomingMessage
    const next = vi.fn()
    middleware(req, {} as ServerResponse, next)
    expect(next).toHaveBeenCalled()
  })

  it('refuses a call without a session, so the SDK bootstraps one', async () => {
    expect((await request(middleware, 'GET', 'datafabric/entities/Votes.QandA/records')).status).toBe(401)
  })

  it('refuses a binding the app does not declare', async () => {
    const { cookie } = await request(middleware, 'POST', 'session')
    const result = await request(middleware, 'POST', 'datafabric/entities/Payroll.HR/records', { body: {}, cookie })
    expect(result.status).toBe(403)
  })

  it('lets only the session that inserted a record read it back', async () => {
    const mine = (await request(middleware, 'POST', 'session')).cookie
    const theirs = (await request(middleware, 'POST', 'session')).cookie

    const insert = await request(middleware, 'POST', 'datafabric/entities/Questions.QandA/records', { body: { Id: 'chosen', Text: 'hi' }, cookie: mine })
    expect(insert.status).toBe(200)
    const insertCall = fetchMock.mock.calls.find(([url]) => String(url).includes('/insert'))!
    expect(insertCall[0]).toBe('https://staging.api.uipath.com/acme/Playground/datafabric_/api/v3/entities/Questions/insert?expansionLevel=0')
    expect(JSON.parse(insertCall[1].body)).toEqual({ Text: 'hi' })
    expect(insertCall[1].headers.Authorization).toBe('Bearer app-token')
    expect(insertCall[1].headers['X-UiPath-FolderKey']).toBe('folder-key')

    expect((await request(middleware, 'GET', 'datafabric/entities/Questions.QandA/records/abc-1', { cookie: mine })).status).toBe(200)
    expect((await request(middleware, 'GET', 'datafabric/entities/Questions.QandA/records/abc-1', { cookie: theirs })).status).toBe(404)
  })

  it('lists only a shared entity', async () => {
    const { cookie } = await request(middleware, 'POST', 'session')
    expect((await request(middleware, 'GET', 'datafabric/entities/Questions.QandA/records', { cookie })).status).toBe(403)
    expect((await request(middleware, 'GET', 'datafabric/entities/Votes.QandA/records', { cookie })).status).toBe(200)
  })

  it('follows uipath.json access over publicApp.shared', async () => {
    const withAccess = createPublicDevMiddleware(
      { ...ctx, access: [{ resource: 'entity', key: 'Votes.QandA', mode: 'session' }] },
      fetchMock as unknown as typeof fetch,
    )
    const { cookie } = await request(withAccess, 'POST', 'session')
    expect((await request(withAccess, 'GET', 'datafabric/entities/Votes.QandA/records', { cookie })).status).toBe(403)
    // Not listed: open to all by default.
    expect((await request(withAccess, 'GET', 'datafabric/entities/Questions.QandA/records', { cookie })).status).toBe(200)
  })

  it('lets any session read a record of an entity open to all', async () => {
    const withAccess = createPublicDevMiddleware(
      { ...ctx, access: [{ resource: 'entity', key: 'Questions.QandA', mode: 'all' }] },
      fetchMock as unknown as typeof fetch,
    )
    const mine = (await request(withAccess, 'POST', 'session')).cookie
    const theirs = (await request(withAccess, 'POST', 'session')).cookie
    await request(withAccess, 'POST', 'datafabric/entities/Questions.QandA/records', { body: { Text: 'hi' }, cookie: mine })
    expect((await request(withAccess, 'GET', 'datafabric/entities/Questions.QandA/records/abc-1', { cookie: theirs })).status).toBe(200)
  })

  it('asks for folderKey when a folder entity has none', async () => {
    const noKey = createPublicDevMiddleware({ ...ctx, folderKey: undefined }, fetchMock as unknown as typeof fetch)
    const { cookie } = await request(noKey, 'POST', 'session')
    const result = await request(noKey, 'GET', 'datafabric/entities/Votes.QandA/records', { cookie })
    expect(result.status).toBe(500)
    expect((result.body as { message: string }).message).toContain('folderKey')
  })

  it('mints the app token once and reuses it', async () => {
    const { cookie } = await request(middleware, 'POST', 'session')
    await request(middleware, 'GET', 'datafabric/entities/Votes.QandA/records', { cookie })
    await request(middleware, 'GET', 'datafabric/entities/Votes.QandA/records', { cookie })
    const tokenCalls = fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/identity_/connect/token'))
    expect(tokenCalls).toHaveLength(1)
    expect(tokenCalls[0][0]).toBe('https://staging.uipath.com/identity_/connect/token')
  })
})

describe('readPublicDevContext', () => {
  let dir: string
  beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'coded-apps-public-')) })
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }))

  const config = { baseUrl: 'https://staging.api.uipath.com', orgName: 'acme', tenantName: 'Playground' }

  it('is off without a client id and secret', () => {
    expect(readPublicDevContext(config, dir)).toBeUndefined()
  })

  it('reads the secret from .env.local and the bindings from bindings_v2.json', () => {
    fs.writeFileSync(path.join(dir, '.env.local'), 'UIPATH_APP_CLIENT_ID=client\nUIPATH_APP_CLIENT_SECRET=secret\n')
    fs.writeFileSync(path.join(dir, 'bindings_v2.json'), JSON.stringify({
      resources: [{ resource: 'Entity', key: 'Questions.QandA', value: { name: { defaultValue: 'Questions' }, folderPath: { defaultValue: 'QandA' } } }],
    }))
    const result = readPublicDevContext(config, dir)
    expect(result?.clientSecret).toBe('secret')
    expect(result?.bindings).toEqual([{ type: 'entity', key: 'Questions.QandA', name: 'Questions', folderPath: 'QandA' }])
  })

  it('reads access from uipath.json', () => {
    fs.writeFileSync(path.join(dir, '.env.local'), 'UIPATH_APP_CLIENT_ID=client\nUIPATH_APP_CLIENT_SECRET=secret\n')
    const access = [{ resource: 'entity', key: 'Votes.QandA', mode: 'session' }]
    expect(readPublicDevContext({ ...config, access } as typeof config, dir)?.access).toEqual(access)
    expect(readPublicDevContext(config, dir)?.access).toBeUndefined()
  })
})
