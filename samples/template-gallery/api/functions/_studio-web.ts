// What `uip codedapp push` does, as a library: create a Studio Web solution with one coded web app
// project and upload a project's files into it. Ported from the CLI's codedapp-tool
// (actions/push.ts, core/webapp-file-handler/*). No Node-only APIs: fetch, FormData, Blob,
// TextDecoder, crypto.randomUUID only, so it runs in the coded functions runtime.

import { unzipSync } from 'fflate';

export interface StudioWebSession {
  baseUrl: string; // https://cloud.uipath.com
  orgId: string; // org GUID (the org logical name also works in the path)
  tenantId: string; // tenant GUID, sent as x-uipath-internal-tenantid
  accessToken: string; // the caller's token: the solution is created as them
}

export interface ProjectFile {
  remotePath: string; // source/src/App.tsx, source/dist/index.html
  bytes: Uint8Array;
}

export interface CopyResult {
  projectId: string;
  solutionId: string | null;
  designerUrl: string;
  filesUploaded: number;
}

const ORIGIN = { origin: 'uip', command: 'codedapp' };
const API_VERSION = '2';
const LOCK_KEY_HEADER = 'x-uipath-sw-lockkey';
const SOURCE = 'source';
const BUNDLE_DIR = 'dist';
const CONTENT_ROOT = `${SOURCE}/${BUNDLE_DIR}`;
const MANIFEST_NAME = 'webAppManifest.json';
const PUSH_METADATA_SCHEMA_VERSION = '1.0.0';
const SKIP_DIRS = new Set(['node_modules', '.git', '.uipath']);
const SKIP_FILES = new Set(['.env', '.DS_Store']);
const UPLOAD_CONCURRENCY = 8;
const EMPTY_GUID = '00000000-0000-0000-0000-000000000000';

const utf8 = new TextDecoder();
const encode = (s: string) => new TextEncoder().encode(s);

// ---------- zip -> files ----------

/** Unzips a project archive into upload entries. Entries that escape the archive root are refused. */
export function filesFromZip(zip: Uint8Array): Map<string, Uint8Array> {
  const out = new Map<string, Uint8Array>();
  for (const [rawPath, bytes] of Object.entries(unzipSync(zip))) {
    if (rawPath.endsWith('/')) continue; // directory entry
    const path = rawPath.replace(/\\/g, '/');
    const parts = path.split('/');
    if (path.startsWith('/') || parts.some((p) => p === '..' || p === '')) {
      throw new Error(`refusing archive entry outside the project root: ${rawPath}`);
    }
    if (parts.some((p) => SKIP_DIRS.has(p))) continue;
    if (SKIP_FILES.has(parts[parts.length - 1])) continue;
    out.set(path, bytes);
  }
  return out;
}

/** Maps project-relative paths to the remote layout push uses: dist/** under source/dist, the rest under source/. */
export function toProjectFiles(files: Map<string, Uint8Array>): ProjectFile[] {
  const out: ProjectFile[] = [];
  for (const [path, bytes] of files) {
    const remotePath =
      path === BUNDLE_DIR || path.startsWith(`${BUNDLE_DIR}/`)
        ? `${CONTENT_ROOT}${path.slice(BUNDLE_DIR.length)}`
        : `${SOURCE}/${path}`;
    out.push({ remotePath, bytes });
  }
  return out;
}

// ---------- client ----------

export class StudioWebClient {
  constructor(private readonly s: StudioWebSession) {}

  /** The whole Edit flow: create solution + project, upload under a lock, point the manifest at the bundle. */
  async createCopy(solutionName: string, appName: string, files: ProjectFile[]): Promise<CopyResult> {
    const { projectId, solutionId: createdSolutionId } = await this.createSolutionWithProject(solutionName, appName);
    const solutionId = createdSolutionId ?? (await this.solutionIdOf(projectId));

    const author = emailFromToken(this.s.accessToken);
    const withMeta: ProjectFile[] = [
      ...files,
      {
        remotePath: `${SOURCE}/push_metadata.json`,
        bytes: encode(
          JSON.stringify(
            {
              schemaVersion: PUSH_METADATA_SCHEMA_VERSION,
              projectId,
              description: '',
              lastPushDate: new Date().toISOString(),
              lastPushAuthor: author,
              buildDir: BUNDLE_DIR,
            },
            null,
            2,
          ),
        ),
      },
    ];

    const lock = await this.acquireLock(projectId, solutionId);
    try {
      const folderIds = await this.ensureFolders(projectId, lock.key, withMeta);
      await this.uploadAll(projectId, lock.key, withMeta, folderIds);
      await this.setBundlePath(projectId, lock.key);
    } finally {
      await lock.release().catch(() => undefined);
    }

    const designerUrl = `${this.s.baseUrl}/${this.s.orgId}/studio_/designer/${projectId}${solutionId ? `?solutionId=${solutionId}` : ''}`;
    return { projectId, solutionId, designerUrl, filesUploaded: withMeta.length };
  }

  // ----- requests -----

  private url(path: string, query: Record<string, string> = {}): string {
    const u = new URL(`${this.s.baseUrl}/${this.s.orgId}/studio_/backend${path}`);
    for (const [k, v] of Object.entries({ ...ORIGIN, ...query })) u.searchParams.set(k, v);
    return u.toString();
  }

  private headers(extra: Record<string, string> = {}): Record<string, string> {
    return {
      Authorization: `Bearer ${this.s.accessToken}`,
      'x-uipath-internal-tenantid': this.s.tenantId,
      ...extra,
    };
  }

  private async ok(res: Response, what: string): Promise<Response> {
    if (res.ok) return res;
    const body = await res.text().catch(() => '');
    throw new Error(`${what}: ${res.status} ${res.statusText} ${body.slice(0, 300)}`);
  }

  // ----- solution + project (push.ts createCodedAppProject / buildCreateProjectForm) -----

  private projectForm(appName: string): FormData {
    const manifest = JSON.stringify({
      type: 'Coded',
      solutionResourceSubType: 'Coded',
      config: { isCompiled: true, isActionApp: false },
    });
    const f = new FormData();
    f.append('createDefaultProjectCommand[expressionLanguage]', 'VisualBasic');
    f.append('createDefaultProjectCommand[projectType]', 'AppV2');
    f.append('createDefaultProjectCommand[triggerType]', 'Manual');
    f.append('createDefaultProjectCommand[projectMode]', 'AppV2');
    f.append('createDefaultProjectCommand[isTenantLocked]', 'false');
    f.append('createDefaultProjectCommand[name]', appName);
    f.append('createDefaultProjectCommand[isApp]', 'false');
    f.append('createDefaultProjectCommand[context][expressionLanguage]', 'VB');
    f.append('createDefaultProjectCommand[context][projectSubType]', 'Coded');
    f.append('createDefaultProjectCommand[context][serializedWebAppManifest]', manifest);
    f.append('createDefaultProjectCommand[isWindows]', 'false');
    f.append('createDefaultProjectCommand.file', new Blob([manifest], { type: 'application/octet-stream' }), MANIFEST_NAME);
    f.append('createDefaultProjectCommand.IsMain', 'false');
    return f;
  }

  private async createSolutionWithProject(solutionName: string, appName: string) {
    const form = this.projectForm(appName);
    form.append('name', solutionName);
    const res = await this.ok(
      await fetch(this.url('/api/Solution'), { method: 'POST', headers: this.headers(), body: form }),
      'create solution',
    );
    const data = (await res.json()) as { id?: string; solutionId?: string; projects?: Array<{ rootFolder?: { name?: string } }> };
    const projectId = data.projects?.[0]?.rootFolder?.name;
    if (!projectId) throw new Error('solution created but the response has no project id');
    return { projectId, solutionId: data.id ?? data.solutionId ?? null };
  }

  private async solutionIdOf(projectId: string): Promise<string | null> {
    const res = await fetch(this.url(`/api/Project/${projectId}`), { headers: this.headers() });
    if (!res.ok) return null;
    return ((await res.json()) as { solutionId?: string }).solutionId ?? null;
  }

  // ----- lock (lock-provider.ts server-driven, api.ts client-driven) -----

  private async acquireLock(projectId: string, solutionId: string | null): Promise<{ key: string; release: () => Promise<void> }> {
    const cfg = await fetch(this.url('/api/Locks/Configuration'), { headers: this.headers() });
    const serverDriven = cfg.ok && ((await cfg.json()) as { serverDrivesLockingStrategies?: boolean }).serverDrivesLockingStrategies === true;

    if (serverDriven) {
      const q: Record<string, string> = { pId: projectId };
      if (solutionId && solutionId !== EMPTY_GUID) q.sId = solutionId;
      const key = crypto.randomUUID();
      const res = await this.ok(
        await fetch(this.url(`/api/Locks/${encodeURIComponent(key)}`, q), {
          method: 'PUT',
          headers: this.headers({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ sharedOnly: true }),
        }),
        'acquire lock',
      );
      const locks = (await res.json()) as Array<{ lockKey: string; resourceType: string }>;
      const project = locks.find((l) => l.resourceType === 'Project')?.lockKey;
      const solution = locks.find((l) => l.resourceType === 'Solution')?.lockKey;
      const held = [project, solution].filter((k): k is string => !!k);
      if (held.length === 0) throw new Error('lock acquired but no key returned');
      return {
        key: project ?? solution!,
        release: async () => {
          for (const k of held) {
            await fetch(this.url(`/api/Locks/${encodeURIComponent(k)}`, { ...q, sharedOnly: 'true' }), { method: 'DELETE', headers: this.headers() });
          }
        },
      };
    }

    const base = `/api/Project/${projectId}/Lock`;
    await this.ok(
      await fetch(this.url(`${base}/dummy-uuid-Shared`, { 'api-version': API_VERSION }), { method: 'PUT', headers: this.headers() }),
      'acquire lock',
    );
    const info = await this.ok(await fetch(this.url(base, { 'api-version': API_VERSION }), { headers: this.headers() }), 'read lock');
    const body = (await info.json()) as unknown;
    const key =
      (Array.isArray(body) ? body[0]?.lockKey : undefined) ??
      (body as { lockKey?: string })?.lockKey ??
      (body as { projectLockKey?: string })?.projectLockKey;
    if (!key) throw new Error('could not read the lock key');
    return {
      key,
      release: async () => {
        await fetch(this.url(`${base}/${encodeURIComponent(key)}`, { 'api-version': API_VERSION }), { method: 'DELETE', headers: this.headers() });
      },
    };
  }

  // ----- structure, folders, files (FileOperations) -----

  private async structure(projectId: string): Promise<Map<string, string>> {
    const res = await this.ok(await fetch(this.url(`/api/Project/${projectId}/FileOperations/Structure`), { headers: this.headers() }), 'fetch structure');
    const s = (await res.json()) as { files?: unknown; folders?: unknown };
    const ids = new Map<string, string>(); // lower-cased folder path -> id; "/<file>" for root files
    type F = { id: string | null; name: string; files?: unknown; folders?: unknown };
    const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
    for (const f of arr<{ id: string; name: string }>(s.files)) ids.set(`/${f.name}`, f.id);
    const walk = (folders: F[], prefix: string) => {
      for (const f of folders) {
        const p = prefix ? `${prefix}/${f.name}` : f.name;
        if (f.id) ids.set(p.toLowerCase(), f.id);
        walk(arr<F>(f.folders), p);
      }
    };
    walk(arr<F>(s.folders), '');
    return ids;
  }

  private async ensureFolders(projectId: string, lockKey: string, files: ProjectFile[]): Promise<Map<string, string>> {
    const needed = new Set<string>();
    for (const f of files) {
      const parts = f.remotePath.split('/').slice(0, -1);
      let cur = '';
      for (const p of parts) {
        cur = cur ? `${cur}/${p}` : p;
        needed.add(cur);
      }
    }
    let ids = await this.structure(projectId);
    for (const path of [...needed].sort((a, b) => a.split('/').length - b.split('/').length)) {
      if (ids.has(path.toLowerCase())) continue;
      const parts = path.split('/');
      const name = parts[parts.length - 1];
      const parent = parts.slice(0, -1).join('/');
      const body: Record<string, string> = { name, path };
      const parentId = parent ? ids.get(parent.toLowerCase()) : undefined;
      if (parentId) body.parentId = parentId;
      const res = await fetch(this.url(`/api/Project/${projectId}/FileOperations/Folder`), {
        method: 'POST',
        headers: this.headers({ 'Content-Type': 'application/json', [LOCK_KEY_HEADER]: lockKey }),
        body: JSON.stringify(body),
      });
      if (res.status !== 409) await this.ok(res, `create folder ${path}`);
      ids = await this.structure(projectId);
      if (!ids.has(path.toLowerCase())) throw new Error(`folder ${path} not visible after create`);
    }
    return ids;
  }

  private async uploadAll(projectId: string, lockKey: string, files: ProjectFile[], ids: Map<string, string>): Promise<void> {
    let i = 0;
    const worker = async () => {
      while (i < files.length) {
        const f = files[i++];
        const dir = f.remotePath.split('/').slice(0, -1).join('/');
        const form = new FormData();
        form.append('file', new Blob([f.bytes as BlobPart], { type: 'application/octet-stream' }), f.remotePath.split('/').pop()!);
        form.append('path', f.remotePath);
        const parentId = ids.get(dir.toLowerCase());
        if (parentId) form.append('parentId', parentId);
        else form.append('parentPath', dir);
        const res = await fetch(this.url(`/api/Project/${projectId}/FileOperations/File`), {
          method: 'POST',
          headers: this.headers({ [LOCK_KEY_HEADER]: lockKey }),
          body: form,
        });
        if (res.status !== 409) await this.ok(res, `upload ${f.remotePath}`);
      }
    };
    await Promise.all(Array.from({ length: UPLOAD_CONCURRENCY }, worker));
  }

  // ----- manifest (metadata.ts updateRemoteWebAppManifest) -----

  private async setBundlePath(projectId: string, lockKey: string): Promise<void> {
    const ids = await this.structure(projectId);
    const manifestId = ids.get(`/${MANIFEST_NAME}`);
    if (!manifestId) return;
    const fileUrl = this.url(`/api/Project/${projectId}/FileOperations/File/${manifestId}`);
    const current = await this.ok(await fetch(fileUrl, { headers: this.headers() }), 'download manifest');
    const parsed = JSON.parse(utf8.decode(new Uint8Array(await current.arrayBuffer()))) as { config?: Record<string, unknown> };
    parsed.config = { ...(parsed.config ?? {}), bundlePath: CONTENT_ROOT };
    const form = new FormData();
    form.append('file', new Blob([JSON.stringify(parsed, null, 2)], { type: 'application/octet-stream' }), MANIFEST_NAME);
    await this.ok(await fetch(fileUrl, { method: 'PUT', headers: this.headers({ [LOCK_KEY_HEADER]: lockKey }), body: form }), 'update manifest');
  }
}

/** Email claim of a JWT, as the CLI's getPushAuthorEmail reads it. Empty when absent. */
export function emailFromToken(token: string): string {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = JSON.parse(utf8.decode(Uint8Array.from(atob(payload), (c) => c.charCodeAt(0)))) as Record<string, unknown>;
    return String(json.email ?? json.preferred_username ?? '');
  } catch {
    return '';
  }
}
