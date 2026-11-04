// POST /deployments: "Deploy" for an OOTB template. Takes the stored build of a version and does what
// `uip codedapp pack`, `publish` and `deploy` do, as the caller: build the .nupkg in memory, upload it
// to the tenant feed, register it with Apps, deploy it into the chosen folder with the user's external
// app as the client. Nothing is built; the stored dist ships as is.

import { defineFunction, defineSchema, FunctionError } from './_sdk-shim.ts';
import { filesFromZip } from './_studio-web.ts';
import { buildNupkg, sanitizePackageName } from './_nupkg.ts';
import { AppsClient } from './_apps.ts';

interface Input {
  templateId: string;
  /** Defaults to the live version. */
  version?: string;
  /** Folder key (GUID) the app is deployed into. */
  folderKey: string;
  /** URL name of the deployed app: lowercase letters, digits, hyphens. */
  routingName: string;
  /** Package name in the tenant feed. Defaults to the template id. One package can be deployed under several URL names. */
  packageName?: string;
  /** The user's external application (PKCE) registered for the deployed app's URL. */
  clientId: string;
  /** Display name. Defaults to the template name. */
  title?: string;
  /** Tenant name as shown in URLs (the id comes from the platform context). Needed by the Apps publish call. */
  tenantName: string;
  /** Template inputs, written as UIPATH_PUBLIC_* environment variables of the deployment (same values for every user). */
  inputs?: Record<string, string>;
}

interface Output {
  packageName: string;
  packageVersion: string;
  systemName: string;
  deployVersion: number;
  deploymentId: string;
  routingName: string;
  url: string | null;
  upload: 'uploaded' | 'exists';
  registered: 'new' | 'reused';
  warnings: string[];
}

const TEMPLATE_ID = /^[a-z0-9][a-z0-9-]{1,62}$/;
const SEMVER = /^\d+\.\d+\.\d+$/;
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ROUTING_NAME = /^[a-z0-9-]{4,64}$/;
const STORAGE_BASE = (process.env.TEMPLATES_STORAGE_BASE ?? '').replace(/\/+$/, '');

interface Catalog {
  templates: Array<{ id: string; live: string; versions: string[] }>;
}

export default defineFunction({
  name: 'deployments',
  method: 'POST',
  path: '/deployments',
  input: defineSchema<Input>(),
  output: defineSchema<Output>(),
  handler: async (input, ctx): Promise<Output> => {
    const token = ctx.user?.accessToken;
    if (!token) throw new FunctionError('Unauthorized', 401);
    if (!ctx.platform) throw new FunctionError('Platform context missing', 500);
    if (!STORAGE_BASE) throw new FunctionError('TEMPLATES_STORAGE_BASE is not configured', 500);

    if (!TEMPLATE_ID.test(input.templateId)) throw new FunctionError('templateId must be a slug', 400);
    if (input.version !== undefined && !SEMVER.test(input.version)) throw new FunctionError('version must be semver', 400);
    if (!GUID.test(input.folderKey)) throw new FunctionError('folderKey must be a GUID', 400);
    if (!GUID.test(input.clientId)) throw new FunctionError('clientId must be a GUID', 400);
    if (!ROUTING_NAME.test(input.routingName)) throw new FunctionError('routingName: lowercase letters, digits and hyphens, 4 to 64 characters', 400);
    if (input.packageName !== undefined && !ROUTING_NAME.test(input.packageName)) throw new FunctionError('packageName: lowercase letters, digits and hyphens, 4 to 64 characters', 400);
    if (!/^[A-Za-z0-9]{1,32}$/.test(input.tenantName)) throw new FunctionError('tenantName must be a tenant name', 400);

    // 1. catalog and stored build
    const catalogRes = await fetch(`${STORAGE_BASE}/index.json`, { signal: AbortSignal.timeout(8_000) });
    if (!catalogRes.ok) throw new FunctionError('Template catalog unavailable', 502);
    const entry = ((await catalogRes.json()) as Catalog).templates.find((t) => t.id === input.templateId);
    if (!entry) throw new FunctionError(`Unknown template ${input.templateId}`, 404);
    const version = input.version ?? entry.live;
    if (!entry.versions.includes(version)) throw new FunctionError(`Version ${version} is not available`, 404);

    const base = `${STORAGE_BASE}/${entry.id}/${version}`;
    const [zipRes, manifestRes] = await Promise.all([
      fetch(`${base}/project.zip`, { signal: AbortSignal.timeout(15_000) }),
      fetch(`${base}/template.json`, { signal: AbortSignal.timeout(8_000) }),
    ]);
    if (!zipRes.ok) throw new FunctionError('Template source not found in storage', 502);
    const manifest = manifestRes.ok ? ((await manifestRes.json()) as { name?: string }) : {};
    const files = filesFromZip(new Uint8Array(await zipRes.arrayBuffer()));

    // the build is dist/** inside the project; uipath.json rides along for scopes and lineage
    const bundle = new Map<string, Uint8Array>();
    for (const [path, bytes] of files) if (path.startsWith('dist/')) bundle.set(path.slice('dist/'.length), bytes);
    if (!bundle.has('index.html')) throw new FunctionError('Template build has no index.html', 502);

    // 2. pack
    // Display name must be unique in the org; default to the URL name rather than the template's name.
    const title = input.title?.trim() || input.routingName;
    const packageName = sanitizePackageName(input.packageName ?? entry.id);
    const nupkg = buildNupkg({ packageName, version, title, description: `Deployed from template ${entry.id} ${version}`, bundle, uipathJson: files.get('uipath.json') });

    // 3. upload, register, deploy, as the caller
    const apps = new AppsClient({ baseUrl: ctx.platform.baseUrl, orgId: ctx.platform.orgId, tenantId: ctx.platform.tenantId, accessToken: token });
    const tenantName = input.tenantName;
    ctx.logger.info(`deployments: ${entry.id}@${version} as ${packageName} into folder ${input.folderKey} (${nupkg.byteLength} bytes)`);
    const upload = await apps.uploadPackage(nupkg, `${packageName}.${version}.nupkg`);
    const { systemName, deployVersion, reused } = await apps.registerCodedApp(tenantName, packageName, version, title);
    const envLines = Object.entries(input.inputs ?? {})
      .filter(([k, v]) => /^[A-Za-z][A-Za-z0-9_]*$/.test(k) && String(v).trim() !== '')
      .map(([k, v]) => `UIPATH_PUBLIC_${k.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toUpperCase()}=${String(v).replace(/\r?\n/g, ' ')}`);
    const deployed = await apps.deploy(systemName, deployVersion, input.folderKey, title, input.routingName, input.clientId, envLines.length ? envLines.join('\n') : undefined);
    const meta = await apps.deployedCodedApp(packageName, input.folderKey);
    ctx.logger.info(`deployments: deployed ${systemName} v${deployVersion} -> ${meta.launchUrl ?? meta.url ?? '(no url yet)'}`);

    return {
      packageName,
      packageVersion: version,
      systemName,
      deployVersion,
      deploymentId: deployed.id,
      routingName: input.routingName,
      url: meta.launchUrl ?? meta.url ?? null,
      upload,
      registered: reused ? 'reused' : 'new',
      warnings: deployed.warnings,
    };
  },
});
