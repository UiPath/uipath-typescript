#!/usr/bin/env node
// Generates a signature-level snapshot of the public API surface, one file per
// subpath export. The snapshot is committed; CI regenerates it and fails on
// drift, so any change to a published signature shows up as a reviewable diff.
//
// Reads source through the TypeScript AST with no type checker and no module
// resolution, so it can also be run against an arbitrary historical checkout
// that has no node_modules of its own (see api-surface-replay.sh).
//
// Every way this could silently under-report is a hole in the gate, so anything
// unresolvable or empty throws instead of being skipped.
import { readFileSync, existsSync, statSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import ts from 'typescript';

const ROOT = process.argv[2] ? resolve(process.argv[2]) : process.cwd();
const OUT = process.argv[3] ? resolve(process.argv[3]) : resolve(ROOT, 'scripts/api-surface.txt');

const fail = (msg) => { throw new Error(`api-surface: ${msg}`); };

// --- tsconfig path aliases -------------------------------------------------
// Barrels re-export through `@/...` as well as relative paths. Treating an
// alias as external silently drops everything behind it.
function readAliases() {
  const p = resolve(ROOT, 'tsconfig.json');
  if (!existsSync(p)) return [];
  const raw = readFileSync(p, 'utf8').replace(/\/\/[^\n]*/g, '');
  let paths;
  try { paths = JSON.parse(raw)?.compilerOptions?.paths ?? {}; } catch { return []; }
  return Object.entries(paths)
    .filter(([k]) => k.endsWith('/*') && k !== '*')
    .map(([k, v]) => ({ prefix: k.slice(0, -1), targets: v.map((t) => t.replace(/\*$/, '')) }));
}
const ALIASES = readAliases();

// --- entry points ----------------------------------------------------------
// package.json `exports` is the consumer contract; rollup.config.js holds the
// source entry for each. They must agree, or a subpath goes unmonitored.
function readEntries() {
  const pkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8'));
  const declared = new Set(
    Object.keys(pkg.exports ?? {}).filter((k) => k === '.' || k.startsWith('./')).map((k) => (k === '.' ? '.' : k.slice(2)))
  );
  const entries = [{ name: '.', input: 'src/index.ts' }];
  const cfgPath = resolve(ROOT, 'rollup.config.js');
  if (!existsSync(cfgPath)) fail('rollup.config.js not found; cannot resolve subpath entry points');
  const cfg = readFileSync(cfgPath, 'utf8');
  const at = cfg.indexOf('const serviceEntries');
  if (at === -1) fail('rollup.config.js has no `const serviceEntries` block');
  const block = cfg.slice(at);
  const re = /name:\s*['"`]([^'"`]+)['"`][\s\S]{0,200}?input:\s*['"`]([^'"`]+)['"`]/g;
  let m;
  while ((m = re.exec(block))) entries.push({ name: m[1], input: m[2] });

  for (const e of entries) {
    if (!existsSync(resolve(ROOT, e.input))) fail(`entry point '${e.name}' points at missing file ${e.input}`);
  }
  const found = new Set(entries.map((e) => e.name));
  const missing = [...declared].filter((d) => !found.has(d));
  const extra = [...found].filter((f) => !declared.has(f));
  if (missing.length || extra.length) {
    fail(
      `package.json exports and rollup.config.js entry points disagree.\n` +
      `  exported but not snapshotted: ${missing.join(', ') || '(none)'}\n` +
      `  snapshotted but not exported: ${extra.join(', ') || '(none)'}`
    );
  }
  return entries;
}

// --- parsing ---------------------------------------------------------------
const parsed = new Map();
function parse(file) {
  if (parsed.has(file)) return parsed.get(file);
  const sf = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  // createSourceFile error-recovers instead of throwing: a malformed file would
  // quietly yield fewer exports.
  if (sf.parseDiagnostics?.length) {
    fail(`${relative(ROOT, file)} failed to parse (${sf.parseDiagnostics.length} diagnostics); snapshot would be incomplete`);
  }
  parsed.set(file, sf);
  return sf;
}

const isFile = (p) => { try { return statSync(p).isFile(); } catch { return false; } };

function resolveSpec(fromFile, spec) {
  let bases = [];
  if (spec.startsWith('.')) {
    bases = [resolve(dirname(fromFile), spec)];
  } else {
    for (const a of ALIASES) {
      if (spec.startsWith(a.prefix)) bases.push(...a.targets.map((t) => resolve(ROOT, t + spec.slice(a.prefix.length))));
    }
    if (!bases.length) return null; // genuine external dependency
  }
  for (const base of bases) {
    for (const c of [`${base}.ts`, `${base}.tsx`, `${base}.d.ts`, `${base}/index.ts`, `${base}/index.tsx`, base]) {
      if (isFile(c)) return c;
    }
  }
  fail(`cannot resolve '${spec}' from ${relative(ROOT, fromFile)} -- symbols behind it would be missing`);
}

// --- export collection -----------------------------------------------------
// name -> { decls: node[], sf, namespace? }. Overload signatures share a name,
// so declarations accumulate rather than overwrite.
const memo = new Map();
const inProgress = new Set();

function addDecl(map, name, node, sf, extra = {}) {
  const cur = map.get(name);
  if (cur && cur.sf === sf) cur.decls.push(node);
  else map.set(name, { decls: [node], sf, ...extra });
}

function collectExports(file) {
  if (memo.has(file)) return memo.get(file);
  if (inProgress.has(file)) return new Map(); // true import cycle
  inProgress.add(file);

  const out = new Map();
  const local = new Map();
  const sf = parse(file);

  const isExported = (n) => n.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ?? false;

  for (const st of sf.statements) {
    if (
      ts.isInterfaceDeclaration(st) || ts.isClassDeclaration(st) ||
      ts.isTypeAliasDeclaration(st) || ts.isEnumDeclaration(st) || ts.isFunctionDeclaration(st)
    ) {
      const n = st.name && ts.isIdentifier(st.name) ? st.name.text : null;
      if (!n) continue;
      addDecl(local, n, st, sf);
      if (isExported(st)) addDecl(out, n, st, sf);
    } else if (ts.isVariableStatement(st)) {
      for (const d of st.declarationList.declarations) {
        const n = d.name && ts.isIdentifier(d.name) ? d.name.text : null;
        if (!n) continue;
        addDecl(local, n, d, sf);
        if (isExported(st)) addDecl(out, n, d, sf);
      }
    }
  }

  for (const st of sf.statements) {
    if (!ts.isExportDeclaration(st)) continue;
    const spec = st.moduleSpecifier?.text;
    const target = spec ? resolveSpec(file, spec) : null;
    if (spec && !target) continue; // external

    if (!st.exportClause) {                                   // export * from '...'
      if (target) for (const [k, v] of collectExports(target)) if (!out.has(k)) out.set(k, v);
      continue;
    }
    if (ts.isNamespaceExport(st.exportClause)) {              // export * as NS from '...'
      const ns = st.exportClause.name.text;
      if (!target) continue;
      for (const [k, v] of collectExports(target)) out.set(`${ns}.${k}`, { ...v, namespace: ns });
      continue;
    }
    if (!ts.isNamedExports(st.exportClause)) continue;
    for (const el of st.exportClause.elements) {              // export { a, b as c } [from '...']
      const exportedAs = el.name.text;
      const original = el.propertyName ? el.propertyName.text : exportedAs;
      const found = target ? collectExports(target).get(original) : local.get(original);
      if (found) out.set(exportedAs, found);
    }
  }

  inProgress.delete(file);
  memo.set(file, out);
  return out;
}

// --- rendering -------------------------------------------------------------
// `export`, decorators, `async`, `public` and `declare` are not part of the
// consumer contract; stripping them keeps a @track label edit from reading as
// an API change.
const stripNoise = (s) =>
  s.replace(/^\s*(@[A-Za-z_$][\w$]*\s*(\([\s\S]*?\))?\s*)+/, '')
   .replace(/^\s*(export\s+|public\s+|async\s+|declare\s+)+/, '');
const norm = (s) => stripNoise(s).replace(/\s+/g, ' ').replace(/\s*([<>(),;:|&])\s*/g, '$1').replace(/;$/, '').trim();

function tags(node) {
  const t = new Set();
  for (const tag of ts.getJSDocTags(node) ?? []) {
    const n = tag.tagName.text;
    if (['deprecated', 'experimental', 'internal', 'alpha', 'beta'].includes(n)) t.add(n);
  }
  return t.size ? `  @${[...t].sort().join(' @')}` : '';
}

// Signature without the body. Slicing at the first `{` would clip a default
// value such as `options: EntityInsertOptions = {}`.
function sigOf(n) {
  const sf = n.getSourceFile();
  const full = n.getText(sf);
  return n.body ? full.slice(0, n.body.getStart(sf) - n.getStart(sf)) : full;
}

const paramsAndReturn = (n) => {
  const sf = n.getSourceFile();
  const tp = n.typeParameters ? `<${n.typeParameters.map((p) => p.getText(sf)).join(',')}>` : '';
  const ps = (n.parameters ?? []).map((p) => p.getText(sf)).join(',');
  const rt = n.type ? `:${n.type.getText(sf)}` : '';
  return `${tp}(${ps})${rt}`;
};

const isPublicMember = (m) =>
  !m.modifiers?.some((x) => x.kind === ts.SyntaxKind.PrivateKeyword || x.kind === ts.SyntaxKind.ProtectedKeyword) &&
  !(m.name && ts.isPrivateIdentifier(m.name));

function renderMembers(name, node) {
  const members = (node.members ?? []).filter(isPublicMember);
  // An overload implementation signature is not callable as written; when
  // sibling overload declarations exist, only those are the contract.
  const overloaded = new Set(
    members.filter((m) => (ts.isMethodDeclaration(m) || ts.isMethodSignature(m)) && !m.body && m.name)
      .map((m) => m.name.getText(m.getSourceFile()))
  );
  const lines = [];
  for (const m of members) {
    if (ts.isSemicolonClassElement(m)) continue;
    let text;
    if (ts.isMethodSignature(m) || ts.isMethodDeclaration(m) || ts.isConstructorDeclaration(m)) {
      if (m.body && m.name && overloaded.has(m.name.getText(m.getSourceFile()))) continue;
      text = sigOf(m);
    } else if (
      ts.isPropertySignature(m) || ts.isPropertyDeclaration(m) || ts.isEnumMember(m) ||
      ts.isConstructSignatureDeclaration(m) || ts.isCallSignatureDeclaration(m) || ts.isIndexSignatureDeclaration(m)
    ) {
      text = m.getText(m.getSourceFile());
    } else continue;
    lines.push(`${name}.${norm(text)}${tags(m)}`);
  }
  return lines.sort();
}

function renderOne(name, node, sf) {
  const T = (n) => n.getText(sf);
  const tp = node.typeParameters ? `<${node.typeParameters.map((p) => norm(T(p))).join(',')}>` : '';
  const heritage = node.heritageClauses?.map((h) => norm(T(h))).join(' ') ?? '';

  if (ts.isInterfaceDeclaration(node) || ts.isClassDeclaration(node)) {
    const kind = ts.isInterfaceDeclaration(node) ? 'interface' : 'class';
    return [`${kind} ${name}${tp}${heritage ? ' ' + heritage : ''}${tags(node)}`,
            ...renderMembers(name, node).map((l) => '  ' + l)];
  }
  if (ts.isTypeAliasDeclaration(node)) return [`type ${name}${tp} = ${norm(T(node.type))}${tags(node)}`];
  if (ts.isEnumDeclaration(node)) return [`enum ${name}${tags(node)}`, ...renderMembers(name, node).map((l) => '  ' + l)];
  // Render from the EXPORTED name, not the declaration's own name, so an
  // aliased re-export (`export { thing as publicName }`) is tracked.
  if (ts.isFunctionDeclaration(node)) return [`function ${name}${norm(paramsAndReturn(node))}${tags(node)}`];

  // Variable declaration. With no type annotation (the norm for `as const`
  // objects and arrow functions) the name alone carries no contract.
  // Unwrap `as const` / `satisfies` so the object underneath is still rendered.
  let init = node.initializer;
  while (init && (ts.isAsExpression(init) || ts.isSatisfiesExpression?.(init) || ts.isParenthesizedExpression(init))) {
    init = init.expression;
  }
  if (node.type) return [`const ${name}:${norm(T(node.type))}${tags(node)}`];
  if (init && (ts.isArrowFunction(init) || ts.isFunctionExpression(init))) {
    return [`const ${name}${norm(paramsAndReturn(init))}${tags(node)}`];
  }
  if (init && ts.isObjectLiteralExpression(init)) {
    const props = init.properties
      .filter((p) => p.name)
      .map((p) => `  ${name}.${norm(p.name.getText(sf))} = ${ts.isPropertyAssignment(p) ? norm(T(p.initializer)) : '?'}`)
      .sort();
    return [`const ${name}${tags(node)}`, ...props];
  }
  if (init && ts.isArrayLiteralExpression(init)) return [`const ${name} = ${norm(T(init))}${tags(node)}`];
  if (init && (ts.isLiteralExpression(init) || init.kind === ts.SyntaxKind.TrueKeyword || init.kind === ts.SyntaxKind.FalseKeyword)) {
    return [`const ${name} = ${norm(T(init))}${tags(node)}`];
  }
  return [`const ${name}${tags(node)}`];
}

function render(name, entry) {
  const { decls, sf } = entry;
  // Overload signatures are the contract; the implementation is not callable.
  const sigs = decls.filter((d) => ts.isFunctionDeclaration(d) && !d.body);
  const chosen = sigs.length ? sigs : decls;
  return chosen.flatMap((d) => renderOne(name, d, sf));
}

function main() {
  const entries = readEntries();
  // One symbol can be reachable from several subpaths (most are also re-exported
  // from the root barrel). Record it once with the list of subpaths that expose
  // it, so the snapshot is a single file the size of the API, not the size of
  // the API times the number of entry points.
  const decls = new Map(); // decl line -> { subs:Set, members:Map<line, Set<sub>> }
  let instances = 0;

  for (const e of entries) {
    const exports = collectExports(resolve(ROOT, e.input));
    // An entry point that resolves to nothing is always a bug, and would make
    // the gate silently stop watching that subpath.
    if (exports.size === 0) fail(`entry point '${e.name}' (${e.input}) produced no exports`);
    instances += exports.size;
    const sub = e.name === '.' ? 'root' : e.name;
    let current = null;
    for (const k of Array.from(exports.keys()).sort()) {
      for (const line of render(k, exports.get(k))) {
        if (line.startsWith('  ')) {
          if (!current) continue;
          const m = current.members.get(line);
          if (m) m.add(sub);
          else current.members.set(line, new Set([sub]));
        } else {
          if (!decls.has(line)) decls.set(line, { subs: new Set(), members: new Map() });
          current = decls.get(line);
          current.subs.add(sub);
        }
      }
    }
  }

  const tag = (subs) => `   [${Array.from(subs).sort().join(', ')}]`;
  const sortKey = (l) => {
    const m = l.match(/^(?:interface|class|type|enum|function|const)\s+([\w$.]+)/);
    return `${(m ? m[1] : l).toLowerCase()}\u0000${l}`;
  };

  const out = [
    '## @uipath/uipath-typescript -- public API surface',
    '## generated by scripts/gen-api-surface.mjs -- do not edit by hand',
    `## ${entries.length} entry points, ${decls.size} declarations`,
    '## each line ends with the subpath exports that expose it',
    '##',
    '## A removed or changed line is something consumers can no longer use as',
    '## written. A newly *required* field is also breaking, but reads as an',
    '## addition. Parameter renames and members moved onto a base type are not.',
    '## Runtime behaviour (defaults, thrown errors, endpoints) is out of scope.',
    '',
  ];
  for (const line of Array.from(decls.keys()).sort((a, b) => (sortKey(a) < sortKey(b) ? -1 : 1))) {
    const d = decls.get(line);
    out.push(line + tag(d.subs));
    for (const m of Array.from(d.members.keys()).sort()) out.push(m + tag(d.members.get(m)));
  }

  if (existsSync(OUT) && statSync(OUT).isDirectory()) rmSync(OUT, { recursive: true, force: true });
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, out.join('\n') + '\n');
  console.log(`api-surface: ${entries.length} entry points, ${decls.size} declarations (${instances} symbol instances) -> ${relative(ROOT, OUT) || OUT}`);
}

main();
