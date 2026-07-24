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
 *   node scripts/gen-release-metadata.mjs --bootstrap   # one-time seed: unknown methods -> since: null
 *
 * Contract (see release-metadata.md): `services` is an array of
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
const BOOTSTRAP = process.argv.includes('--bootstrap');

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

const modifiersOf = (n) => (ts.canHaveModifiers?.(n) ? ts.getModifiers(n) : n.modifiers) || [];
const isHidden = (n) =>
  modifiersOf(n).some((m) =>
    [ts.SyntaxKind.PrivateKeyword, ts.SyntaxKind.ProtectedKeyword, ts.SyntaxKind.StaticKeyword].includes(m.kind)
  );

// public instance methods of a class, walking its extends chain (base classes in the same file)
function methodsOf(className, classesByName, acc = new Set(), seen = new Set()) {
  if (seen.has(className)) return acc;
  seen.add(className);
  const cls = classesByName.get(className);
  if (!cls) return acc;
  for (const m of cls.members) {
    if (!ts.isMethodDeclaration(m) && !ts.isMethodSignature(m)) continue;
    if (!m.name || !ts.isIdentifier(m.name)) continue;
    if (isHidden(m) || isInternal(m)) continue;
    acc.add(m.name.text);
  }
  for (const h of cls.heritageClauses || []) {
    if (h.token !== ts.SyntaxKind.ExtendsKeyword) continue;
    for (const t of h.types) if (ts.isIdentifier(t.expression)) methodsOf(t.expression.text, classesByName, acc, seen);
  }
  return acc;
}

const surface = []; // { name, subpath, methods: string[] }
for (const sub of subpaths) {
  const dts = join(DIST, sub, 'index.d.ts');
  if (!existsSync(dts)) continue;
  const sf = ts.createSourceFile(dts, readFileSync(dts, 'utf8'), ts.ScriptTarget.Latest, true);
  const classesByName = new Map();
  const alias = new Map(); // local *Service class -> public export name
  sf.forEachChild((node) => {
    if (ts.isClassDeclaration(node) && node.name) classesByName.set(node.name.text, node);
    if (ts.isExportDeclaration(node) && node.exportClause && ts.isNamedExports(node.exportClause)) {
      for (const el of node.exportClause.elements) {
        // Only aliased exports (`XService as PublicName`) are public services;
        // a bare `export { XService }` re-exports the internal class name — skip it.
        if (!el.propertyName) continue;
        const local = el.propertyName.text;
        if (/Service$/.test(local)) alias.set(local, el.name.text);
      }
    }
  });
  for (const [local, publicName] of alias) {
    if (!classesByName.has(local)) continue;
    const methods = [...methodsOf(local, classesByName)].filter((m) => m !== 'constructor');
    surface.push({ name: publicName, subpath: `${PKG}/${sub}`, methods });
  }
}

// ── build entries (carry-forward + stamp new) ───────────────────────────────────
const services = surface.map((s) => {
  const prevS = prevSvc.get(s.name);
  const since = prevS ? (prevS.since ?? null) : BOOTSTRAP ? null : VERSION;
  const methods = [...new Set(s.methods)].sort().map((name) => {
    const carried = prevMethodSince(s.name, name);
    const val = carried !== undefined ? carried : BOOTSTRAP ? null : VERSION;
    return { name, since: val };
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
console.log(
  `release-metadata:gen — ${services.length} services, ${nMethods} methods, sdkVersion ${VERSION}${BOOTSTRAP ? ' (bootstrap)' : ''}`
);
