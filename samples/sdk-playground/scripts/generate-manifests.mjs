/**
 * Generates per-version method manifests + a lazy-import registry for the playground.
 *
 * For each `sdk-vX_Y_Z` npm alias installed in node_modules:
 *   1. Reads the alias package.json `exports` map to discover service subpaths.
 *   2. Parses each subpath's rolled-up `.d.ts` with ts-morph and extracts every
 *      `{Entity}ServiceModel` interface implemented by a service class:
 *      method names, JSDoc, parameters (with enum values and object shapes).
 *   3. Reads the subpath's `.mjs` export statement to find the public alias
 *      (e.g. `TaskService as Tasks`).
 *
 * Emits:
 *   src/manifests/<version>.json      — one manifest per version
 *   src/sdk/registry.gen.ts           — static import thunks (Vite-analyzable)
 */
import { Project } from 'ts-morph';
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const NODE_MODULES = join(ROOT, 'node_modules');
const MANIFEST_DIR = join(ROOT, 'src', 'manifests');
const GEN_FILE = join(ROOT, 'src', 'sdk', 'registry.gen.ts');

// Subpaths that expose infrastructure rather than user-facing services
const SKIP_SUBPATHS = new Set(['.', './core', './package.json']);
// BaseService/HTTP plumbing that must never surface as callable methods
const SKIP_METHODS = new Set(['get', 'post', 'put', 'delete', 'patch', 'head', 'options']);
const MAX_OBJECT_PROPS = 60;

const aliases = readdirSync(NODE_MODULES)
  .filter((d) => /^sdk-v\d+_\d+_\d+$/.test(d))
  .sort();

if (aliases.length === 0) {
  console.error('No sdk-vX_Y_Z aliases found in node_modules — run npm install first.');
  process.exit(1);
}

mkdirSync(MANIFEST_DIR, { recursive: true });
mkdirSync(dirname(GEN_FILE), { recursive: true });

/** Extracts `Original as Alias` pairs from the runtime .mjs export statement. */
function readRuntimeAliases(mjsPath) {
  const map = new Map();
  if (!existsSync(mjsPath)) return map;
  const source = readFileSync(mjsPath, 'utf8');
  const exportBlocks = source.match(/export\s*\{[^}]*\}/g) ?? [];
  for (const block of exportBlocks) {
    for (const m of block.matchAll(/(\w+)\s+as\s+(\w+)/g)) {
      map.set(m[1], m[2]);
    }
  }
  return map;
}

function classifyType(type, typeText) {
  // unwrap `T | undefined` from optional params
  const parts = type.isUnion() ? type.getUnionTypes().filter((t) => !t.isUndefined() && !t.isNull()) : [type];
  const t = parts.length === 1 ? parts[0] : type;

  if (typeText === 'Date' || t.getText().endsWith('Date')) return { kind: 'date' };
  if (parts.length > 1 && parts.every((p) => p.isStringLiteral() || p.isNumberLiteral())) {
    return { kind: 'enum', enumValues: parts.map((p) => p.getLiteralValue()) };
  }
  if (t.isEnum() || t.isEnumLiteral()) {
    const values = (t.isEnum() ? t.getUnionTypes() : [t])
      .map((u) => u.getLiteralValue())
      .filter((v) => v !== undefined);
    return { kind: 'enum', enumValues: values };
  }
  if (t.isString()) return { kind: 'string' };
  if (t.isNumber()) return { kind: 'number' };
  if (t.isBoolean()) return { kind: 'boolean' };
  if (t.isString() || t.isStringLiteral()) return { kind: 'string' };
  return { kind: 'json' };
}

function extractObjectShape(type) {
  const parts = type.isUnion() ? type.getUnionTypes().filter((t) => !t.isUndefined() && !t.isNull()) : [type];
  if (parts.length !== 1) return undefined;
  const props = parts[0].getProperties().slice(0, MAX_OBJECT_PROPS);
  if (props.length === 0) return undefined;
  const shape = [];
  for (const p of props) {
    const decl = p.getDeclarations()[0];
    if (!decl) continue;
    const declText = decl.getText();
    // skip methods on response-ish shapes
    if (/^\s*\w+\s*[(<]/.test(declText) && !declText.includes(':')) continue;
    shape.push({
      name: p.getName(),
      optional: p.isOptional?.() ?? declText.includes('?:'),
      typeText: truncate(declText.split(/:(.+)/)[1]?.trim()?.replace(/;$/, '') ?? 'unknown', 120),
    });
  }
  return shape.length > 0 ? shape : undefined;
}

function truncate(text, max) {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function extractJsDoc(node) {
  const docs = node.getJsDocs?.() ?? [];
  if (docs.length === 0) return {};
  const doc = docs[docs.length - 1];
  const description = doc.getDescription().trim() || undefined;
  const example = doc
    .getTags()
    .filter((t) => t.getTagName() === 'example')
    .map((t) => t.getCommentText()?.trim())
    .filter(Boolean)[0];
  return { description, example };
}

const registryEntries = [];
const summary = [];

for (const alias of aliases) {
  const version = alias.replace('sdk-v', '').replaceAll('_', '.');
  const pkgDir = join(NODE_MODULES, alias);
  const pkg = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8'));
  const subpaths = Object.keys(pkg.exports ?? {}).filter((s) => !SKIP_SUBPATHS.has(s));

  const project = new Project({
    compilerOptions: { skipLibCheck: true },
    skipAddingFilesFromTsConfig: true,
  });

  const services = [];
  const moduleSubpaths = [];

  for (const subpath of subpaths) {
    const sub = subpath.replace('./', '');
    const dtsPath = join(pkgDir, 'dist', sub, 'index.d.ts');
    const mjsPath = join(pkgDir, 'dist', sub, 'index.mjs');
    if (!existsSync(dtsPath)) continue;

    const file = project.addSourceFileAtPath(dtsPath);
    const runtimeAliases = readRuntimeAliases(mjsPath);
    let moduleHasService = false;

    for (const cls of file.getClasses()) {
      const impl = cls
        .getImplements()
        .map((i) => i.getExpression().getText())
        .find((n) => n.endsWith('ServiceModel'));
      if (!impl) continue;
      const model = file.getInterface(impl);
      if (!model) continue;
      const className = cls.getName();
      if (!className || !runtimeAliases.has(className)) {
        // not exported from this module's runtime — likely a dependency rolled into the d.ts
        if (!className) continue;
        const isExported = readFileSync(mjsPath, 'utf8').includes(className);
        if (!isExported) continue;
      }

      const methods = [];
      for (const method of model.getMethods()) {
        const name = method.getName();
        if (SKIP_METHODS.has(name) || name.startsWith('_')) continue;
        const { description, example } = extractJsDoc(method);
        const params = method.getParameters().map((param) => {
          const typeNode = param.getTypeNode();
          const typeText = truncate(typeNode ? typeNode.getText() : param.getType().getText(), 160);
          const type = param.getType();
          const classified = classifyType(type, typeText);
          const entry = {
            name: param.getName(),
            optional: param.isOptional() || param.hasQuestionToken(),
            typeText,
            ...classified,
          };
          if (classified.kind === 'json') {
            const properties = extractObjectShape(type);
            if (properties) entry.properties = properties;
          }
          return entry;
        });
        methods.push({
          name,
          description,
          example,
          params,
          returnType: truncate(method.getReturnTypeNode()?.getText() ?? '', 200),
        });
      }
      if (methods.length === 0) continue;

      services.push({
        name: runtimeAliases.get(className) ?? className,
        className,
        subpath: sub,
        methods,
      });
      moduleHasService = true;
    }

    if (moduleHasService) moduleSubpaths.push(sub);
  }

  services.sort((a, b) => a.name.localeCompare(b.name));
  const manifest = { version, services };
  writeFileSync(join(MANIFEST_DIR, `${version}.json`), JSON.stringify(manifest, null, 2));
  registryEntries.push({ version, alias, moduleSubpaths });
  summary.push(`${version}: ${services.length} services, ${services.reduce((n, s) => n + s.methods.length, 0)} methods`);
}

// semver-descending so the picker defaults to the newest version
registryEntries.sort((a, b) => {
  const pa = a.version.split('.').map(Number);
  const pb = b.version.split('.').map(Number);
  return pb[0] - pa[0] || pb[1] - pa[1] || pb[2] - pa[2];
});

const gen = `// AUTO-GENERATED by scripts/generate-manifests.mjs — do not edit.
import type { VersionManifest } from '../types/manifest';

export interface SdkModule {
  [exportName: string]: unknown;
}

export interface VersionEntry {
  manifest: () => Promise<VersionManifest>;
  core: () => Promise<SdkModule>;
  modules: Record<string, () => Promise<SdkModule>>;
}

function mod(loader: () => Promise<object>): () => Promise<SdkModule> {
  return () => loader().then((m) => m as SdkModule);
}

export const SDK_VERSIONS: Record<string, VersionEntry> = {
${registryEntries
  .map(
    (e) => `  '${e.version}': {
    manifest: () => import('../manifests/${e.version}.json').then((m) => m.default as VersionManifest),
    core: mod(() => import('${e.alias}/core')),
    modules: {
${e.moduleSubpaths.map((s) => `      '${s}': mod(() => import('${e.alias}/${s}')),`).join('\n')}
    },
  },`
  )
  .join('\n')}
};

export const VERSION_LIST = Object.keys(SDK_VERSIONS);
`;
writeFileSync(GEN_FILE, gen);

console.log('Generated manifests:');
for (const line of summary) console.log(`  ${line}`);
console.log(`Registry: ${GEN_FILE}`);
