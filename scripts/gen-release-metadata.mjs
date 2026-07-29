/**
 * release-metadata:gen — deterministic generator for release-metadata.json.
 *
 * Reads the freshly-built dist/ public surface (never a stale local dist), carries
 * existing `since` values forward from the previous release-metadata.json, stamps
 * newly-added capabilities with the package version, and tombstones removed ones
 * (`deleted` / `replacedBy`). No LLM — pure static analysis + a JSON diff, so the
 * same inputs always produce byte-identical output.
 *
 *   npm run build && node scripts/gen-release-metadata.mjs
 *
 * Contract (see docs/release-metadata.md): `services` is an array of
 * { name, subpath, since, methods[] }; `methods` is an array of { name, since };
 * `since: null` = baseline (shipped before tracking); `@internal` is excluded.
 */

import ts from 'typescript';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const OUT = join(ROOT, 'release-metadata.json');

const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
const VERSION = pkg.version;
const PKG = pkg.name;

if (!existsSync(DIST)) {
  console.error('FAIL: dist/ not found. Run `npm run build` first (generate off a fresh build).');
  process.exit(1);
}

// ── previous file: the carry-forward history source ─────────────────────────────
const prev = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : { services: [] };
const prevSvc = new Map((prev.services ?? []).map((s) => [s.name, s]));
const prevMethodSince = (svc, m) => {
  const entry = prevSvc.get(svc)?.methods?.find((x) => x.name === m);
  return entry ? (entry.since ?? null) : undefined; // undefined = not present in prev
};

// ── enumerate the public surface from the built subpath barrels ─────────────────
const subpaths = Object.keys(pkg.exports ?? {})
  .filter((k) => k !== '.' && k !== './core')
  .map((k) => k.replace(/^\.\//, ''));

const isInternal = (node) =>
  (ts.getJSDocTags(node) || []).some((t) => t.tagName?.escapedText === 'internal');

// The `*ServiceModel` interface is the SDK's source of truth for the public surface.
// PR #594 moved each method's JSDoc — including `@internal` — off the service class onto
// its interface, and TypeDoc renders the docs from the interface with `excludeInternal`.
// Reading the class would miss interface-level `@internal` and publish hidden methods, so
// enumerate the interface. Service classes carry no public methods beyond their model, and
// no `*ServiceModel` extends another, so no heritage walk is needed.
function interfaceMethods(iface) {
  const out = new Set();
  for (const m of iface.members) {
    if (!ts.isMethodSignature(m)) continue;
    if (!m.name || !ts.isIdentifier(m.name)) continue;
    if (isInternal(m)) continue;
    out.add(m.name.text);
  }
  return out;
}

// the `*ServiceModel` a service class implements (its public contract)
function implementedModel(cls) {
  for (const h of cls.heritageClauses || []) {
    if (h.token !== ts.SyntaxKind.ImplementsKeyword) continue;
    for (const t of h.types) {
      if (ts.isIdentifier(t.expression) && t.expression.text.endsWith('ServiceModel')) return t.expression.text;
    }
  }
  return undefined;
}

const surface = []; // { name, subpath, methods: string[] }
for (const sub of subpaths) {
  const dts = join(DIST, sub, 'index.d.ts');
  if (!existsSync(dts)) continue;
  const sf = ts.createSourceFile(dts, readFileSync(dts, 'utf8'), ts.ScriptTarget.Latest, true);
  const classesByName = new Map();
  const interfacesByName = new Map();
  const alias = new Map(); // local *Service class -> public export name
  sf.forEachChild((node) => {
    if (ts.isClassDeclaration(node) && node.name) classesByName.set(node.name.text, node);
    if (ts.isInterfaceDeclaration(node) && node.name) interfacesByName.set(node.name.text, node);
    if (ts.isExportDeclaration(node) && node.exportClause && ts.isNamedExports(node.exportClause)) {
      for (const el of node.exportClause.elements) {
        // Only aliased exports (`XService as PublicName`) are public services;
        // a bare `export { XService }` re-exports the internal class name — skip it.
        if (!el.propertyName) continue;
        const local = el.propertyName.text;
        if (local.endsWith('Service')) alias.set(local, el.name.text);
      }
    }
  });
  for (const [local, publicName] of alias) {
    const cls = classesByName.get(local);
    if (!cls) continue;
    const modelName = implementedModel(cls);
    const iface = modelName && interfacesByName.get(modelName);
    if (!iface) {
      // No `*ServiceModel` to read → skip and flag loudly, rather than silently falling
      // back to the (leak-prone) class surface.
      console.warn(`WARN: ${publicName} (${local}) implements no *ServiceModel — skipping.`);
      continue;
    }
    const methods = [...interfaceMethods(iface)].filter((m) => m !== 'constructor');
    if (!methods.length) {
      // Entire *ServiceModel is @internal → no public surface. The SDK docs omit these
      // (excludeInternal renders an empty page; docs-post-process never lists them), so
      // the metadata omits them too — a service with nothing public advertises nothing.
      console.log(`skip ${publicName}: no public methods (all @internal)`);
      continue;
    }
    surface.push({ name: publicName, subpath: `${PKG}/${sub}`, methods });
  }
}

// ── build entries (carry-forward + stamp new) ───────────────────────────────────
const services = surface.map((s) => {
  const prevS = prevSvc.get(s.name);
  const since = prevS ? (prevS.since ?? null) : VERSION; // in prev → carry forward; new → this version
  const methods = [...new Set(s.methods)].sort().map((name) => {
    const carried = prevMethodSince(s.name, name);
    let ms = carried !== undefined ? carried : VERSION;
    // A method cannot predate its service: a null (baseline) method under a service
    // that has a real `since` inherits the service version. Self-heals stale nulls.
    if (ms === null && since !== null) ms = since;
    return { name, since: ms };
  });
  const entry = { name: s.name, subpath: s.subpath, since };
  if (methods.length) entry.methods = methods;
  return entry;
});

// ── tombstones: things in prev but gone from the surface (deletions) ────────────
const svcNames = new Set(surface.map((s) => s.name));
const svcMethods = new Map(surface.map((s) => [s.name, new Set(s.methods)]));
for (const ps of prev.services ?? []) {
  if (!svcNames.has(ps.name)) {
    services.push({ ...ps, deleted: ps.deleted ?? VERSION }); // whole service removed
    continue;
  }
  const present = svcMethods.get(ps.name) ?? new Set();
  const outS = services.find((x) => x.name === ps.name);
  for (const pm of ps.methods ?? []) {
    if (present.has(pm.name)) continue; // still there
    outS.methods = outS.methods ?? [];
    if (!outS.methods.some((x) => x.name === pm.name)) outS.methods.push({ ...pm, deleted: pm.deleted ?? VERSION });
  }
}

// ── stable sort + write ─────────────────────────────────────────────────────────
services.sort((a, b) => a.name.localeCompare(b.name));
for (const s of services) if (s.methods) s.methods.sort((a, b) => a.name.localeCompare(b.name));

writeFileSync(OUT, JSON.stringify({ schema: 1, sdkVersion: VERSION, services }, null, 2) + '\n');
const nMethods = services.reduce((n, s) => n + (s.methods?.length || 0), 0);
console.log(`release-metadata:gen — ${services.length} services, ${nMethods} methods, sdkVersion ${VERSION}`);
