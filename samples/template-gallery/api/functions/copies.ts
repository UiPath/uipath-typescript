// POST /copies: "Edit in Studio Web" for an OOTB template.
// Reads the template's project.zip from template storage and creates a solution with a coded web
// app project in the caller's workspace, as the caller (ctx.user.accessToken). This is the shape
// of the Apps endpoint; here it is a coded function so the gallery can call it.

import { defineFunction, defineSchema, FunctionError } from './_sdk-shim.ts';
import { StudioWebClient, filesFromZip, toProjectFiles } from './_studio-web.ts';

interface Input {
  /** Template id as listed in index.json, e.g. "process-app". */
  templateId: string;
  /** Semver to copy. Defaults to the live version in index.json. */
  version?: string;
  /** Name of the new solution. Defaults to "<template name> (copy)". */
  solutionName?: string;
}

interface Output {
  projectId: string;
  solutionId: string | null;
  designerUrl: string;
  templateId: string;
  version: string;
  filesUploaded: number;
}

const TEMPLATE_ID = /^[a-z0-9][a-z0-9-]{1,62}$/;
const SEMVER = /^\d+\.\d+\.\d+$/;

// Where the catalog and the version folders live. Server-side config, never from the request.
const STORAGE_BASE = (process.env.TEMPLATES_STORAGE_BASE ?? '').replace(/\/+$/, '');

interface Catalog {
  templates: Array<{ id: string; live: string; versions: string[] }>;
}
interface TemplateManifest {
  id: string;
  name?: string;
}

export default defineFunction({
  name: 'copies',
  method: 'POST',
  path: '/copies',
  input: defineSchema<Input>(),
  output: defineSchema<Output>(),
  handler: async (input, ctx): Promise<Output> => {
    // The copy is created as the caller. Never fall back to an ambient token: an unauthenticated
    // request must not act as whoever configured the host.
    const token = ctx.user?.accessToken;
    if (!token) throw new FunctionError('Unauthorized', 401);
    if (!ctx.platform) throw new FunctionError('Platform context missing (baseUrl, orgId, tenantId)', 500);
    if (!STORAGE_BASE) throw new FunctionError('TEMPLATES_STORAGE_BASE is not configured', 500);

    if (!TEMPLATE_ID.test(input.templateId)) throw new FunctionError('templateId must be a slug', 400);
    if (input.version !== undefined && !SEMVER.test(input.version)) throw new FunctionError('version must be semver', 400);
    if (input.solutionName !== undefined && (input.solutionName.length < 1 || input.solutionName.length > 100)) {
      throw new FunctionError('solutionName must be 1 to 100 characters', 400);
    }

    // 1. catalog: which version, is the template real
    const catalogRes = await fetch(`${STORAGE_BASE}/index.json`, { signal: AbortSignal.timeout(8_000) });
    if (!catalogRes.ok) throw new FunctionError('Template catalog unavailable', 502);
    const catalog = (await catalogRes.json()) as Catalog;
    const entry = catalog.templates.find((t) => t.id === input.templateId);
    if (!entry) throw new FunctionError(`Unknown template ${input.templateId}`, 404);
    const version = input.version ?? entry.live;
    if (!entry.versions.includes(version)) throw new FunctionError(`Version ${version} is not available`, 404);

    // 2. the stored project: path built from validated id and version only
    const base = `${STORAGE_BASE}/${entry.id}/${version}`;
    const [zipRes, manifestRes] = await Promise.all([
      fetch(`${base}/project.zip`, { signal: AbortSignal.timeout(15_000) }),
      fetch(`${base}/template.json`, { signal: AbortSignal.timeout(8_000) }),
    ]);
    if (!zipRes.ok) throw new FunctionError('Template source not found in storage', 502);
    const manifest: TemplateManifest = manifestRes.ok ? ((await manifestRes.json()) as TemplateManifest) : { id: entry.id };
    const files = toProjectFiles(filesFromZip(new Uint8Array(await zipRes.arrayBuffer())));
    if (files.length === 0) throw new FunctionError('Template source is empty', 502);

    // 3. create the copy as the caller
    const appName = manifest.name ?? entry.id;
    const solutionName = input.solutionName ?? `${appName} (copy)`;
    const client = new StudioWebClient({
      baseUrl: ctx.platform.baseUrl,
      orgId: ctx.platform.orgId,
      tenantId: ctx.platform.tenantId,
      accessToken: token,
    });
    ctx.logger.info(`copies: ${entry.id}@${version} -> solution "${solutionName}" (${files.length} files)`);
    const result = await client.createCopy(solutionName, appName, files);
    ctx.logger.info(`copies: created project ${result.projectId}`);

    return { ...result, templateId: entry.id, version };
  },
});
