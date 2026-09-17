#!/usr/bin/env node
// Generates a signature-level snapshot of the public API surface, one file per
// subpath export. The snapshot is committed; CI regenerates and fails on drift,
// so any change to a published signature shows up as a reviewable diff.
//
// Works off source (not dist) via the TypeScript AST, with no type checker and
// no module resolution, so it can also be run against an arbitrary historical
// checkout that has no node_modules.
import { readFileSync, existsSync, mkdirSync, writeFileSync, rmSync, readdirSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import ts from 'typescript';

const ROOT = process.argv[2] ? resolve(process.argv[2]) : process.cwd();
const OUT = process.argv[3] ? resolve(process.argv[3]) : resolve(ROOT, 'api-surface');

// Entry points: the root barrel plus every serviceEntries record in rollup.config.js.
function readEntries() {
  const entries = [{ name: '.', input: 'src/index.ts' }];
  const cfgPath = resolve(ROOT, 'rollup.config.js');
  if (existsSync(cfgPath)) {
    const cfg = readFileSync(cfgPath, 'utf8');
    const block = cfg.slice(cfg.indexOf('const serviceEntries'));
    const re = /name:\s*'([^']+)'[\s\S]{0,200}?input:\s*'([^']+)'/g;
    let m;
    while ((m = re.exec(block))) entries.push({ name: m[1], input: m[2] });
  }
  return entries.filter((e) => existsSync(resolve(ROOT, e.input)));
}

function parse(file) {
  return ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
}

function resolveSpec(fromFile, spec) {
  if (!spec.startsWith('.')) return null; // external dependency: not our surface
  const base = resolve(dirname(fromFile), spec);
  for (const c of [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`, base]) {
    if (existsSync(c) && !c.endsWith('/')) {
      try { if (readFileSync(c)) return c; } catch { /* directory */ }
    }
  }
  return null;
}

const isExported = (n) =>
  n.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ?? false;

function declName(n) {
  if (n.name && ts.isIdentifier(n.name)) return n.name.text;
  return null;
}

// Collect { exportedName -> declaration node } for a module, following
// `export *` and `export { x } from` chains.
function collectExports(file, seen = new Set()) {
  const out = new Map();
  if (!file || seen.has(file)) return out;
  seen.add(file);
  const sf = parse(file);
  const local = new Map();

  for (const st of sf.statements) {
    if (
      ts.isInterfaceDeclaration(st) || ts.isClassDeclaration(st) ||
      ts.isTypeAliasDeclaration(st) || ts.isEnumDeclaration(st) ||
      ts.isFunctionDeclaration(st)
    ) {
      const n = declName(st);
      if (n) { local.set(n, st); if (isExported(st)) out.set(n, { node: st, sf }); }
    } else if (ts.isVariableStatement(st)) {
      for (const d of st.declarationList.declarations) {
        const n = d.name && ts.isIdentifier(d.name) ? d.name.text : null;
        if (n) { local.set(n, d); if (isExported(st)) out.set(n, { node: d, sf, varStmt: st }); }
      }
    }
  }

  for (const st of sf.statements) {
    if (!ts.isExportDeclaration(st)) continue;
    const spec = st.moduleSpecifier?.text;
    const target = spec ? resolveSpec(file, spec) : null;
    if (!st.exportClause) {
      if (target) for (const [k, v] of collectExports(target, seen)) if (!out.has(k)) out.set(k, v);
      continue;
    }
    if (!ts.isNamedExports(st.exportClause)) continue;
    const fromMod = target ? collectExports(target, new Set(seen)) : null;
    for (const el of st.exportClause.elements) {
      const exportedAs = el.name.text;
      const original = el.propertyName ? el.propertyName.text : exportedAs;
      const found = fromMod ? fromMod.get(original) : (local.has(original) ? { node: local.get(original), sf } : null);
      if (found) out.set(exportedAs, { ...found, alias: exportedAs !== original ? original : undefined });
    }
  }
  return out;
}

// Decorators and `async` are implementation detail, not consumer contract:
// strip them so a @track label edit never shows up as a surface change.
const stripNoise = (s) => s.replace(/^\s*(@[A-Za-z_$][\w$]*\s*(\([^)]*\))?\s*)+/, '').replace(/^\s*(public\s+|async\s+|declare\s+)+/, '');
const norm = (s) => stripNoise(s).replace(/\s+/g, ' ').replace(/\s*([<>(),;:|&])\s*/g, '$1').replace(/;$/, '').trim();

function tags(node) {
  const t = [];
  for (const tag of ts.getJSDocTags(node) ?? []) {
    const n = tag.tagName.text;
    if (n === 'deprecated' || n === 'experimental' || n === 'internal' || n === 'alpha' || n === 'beta') t.push(n);
  }
  return t.length ? `  @${[...new Set(t)].sort().join(' @')}` : '';
}

// Signature text without the body. Slicing at the first `{` would clip a
// default value such as `options: EntityInsertOptions = {}`.
function sigOf(n) {
  const sf = n.getSourceFile();
  const full = n.getText(sf);
  if (!n.body) return full;
  return full.slice(0, n.body.getStart(sf) - n.getStart(sf));
}

const isPublicMember = (m) =>
  !m.modifiers?.some((x) =>
    x.kind === ts.SyntaxKind.PrivateKeyword || x.kind === ts.SyntaxKind.ProtectedKeyword) &&
  !(m.name && ts.isPrivateIdentifier(m.name));

function renderMembers(name, node) {
  const lines = [];
  for (const m of node.members ?? []) {
    if (!isPublicMember(m)) continue;
    if (ts.isSemicolonClassElement(m)) continue;
    let text;
    if (ts.isMethodSignature(m) || ts.isMethodDeclaration(m)) {
      text = sigOf(m);
    } else if (
      ts.isPropertySignature(m) || ts.isPropertyDeclaration(m) ||
      ts.isEnumMember(m) || ts.isConstructSignatureDeclaration(m) ||
      ts.isCallSignatureDeclaration(m) || ts.isIndexSignatureDeclaration(m)
    ) {
      text = m.getText(m.getSourceFile());
    } else if (ts.isConstructorDeclaration(m)) {
      text = sigOf(m);
    } else continue;
    lines.push(`${name}.${norm(text)}${tags(m)}`);
  }
  return lines.sort();
}

function render(name, { node, sf, varStmt }) {
  const lines = [];
  const T = (n) => n.getText(sf);
  if (ts.isInterfaceDeclaration(node)) {
    const heritage = node.heritageClauses?.map((h) => norm(T(h))).join(' ') ?? '';
    const tp = node.typeParameters ? `<${node.typeParameters.map((p) => norm(T(p))).join(',')}>` : '';
    lines.push(`interface ${name}${tp}${heritage ? ' ' + heritage : ''}${tags(node)}`);
    lines.push(...renderMembers(name, node).map((l) => '  ' + l));
  } else if (ts.isClassDeclaration(node)) {
    const heritage = node.heritageClauses?.map((h) => norm(T(h))).join(' ') ?? '';
    const tp = node.typeParameters ? `<${node.typeParameters.map((p) => norm(T(p))).join(',')}>` : '';
    lines.push(`class ${name}${tp}${heritage ? ' ' + heritage : ''}${tags(node)}`);
    lines.push(...renderMembers(name, node).map((l) => '  ' + l));
  } else if (ts.isTypeAliasDeclaration(node)) {
    const tp = node.typeParameters ? `<${node.typeParameters.map((p) => norm(T(p))).join(',')}>` : '';
    lines.push(`type ${name}${tp} = ${norm(T(node.type))}${tags(node)}`);
  } else if (ts.isEnumDeclaration(node)) {
    lines.push(`enum ${name}${tags(node)}`);
    lines.push(...renderMembers(name, node).map((l) => '  ' + l));
  } else if (ts.isFunctionDeclaration(node)) {
    lines.push(`function ${norm(sigOf(node))}${tags(node)}`);
  } else {
    const t = node.type ? `: ${norm(T(node.type))}` : '';
    lines.push(`const ${name}${t}${tags(varStmt ?? node)}`);
  }
  return lines;
}

function main() {
  const entries = readEntries();
  if (existsSync(OUT)) for (const f of readdirSync(OUT)) if (f.endsWith('.api.txt')) rmSync(resolve(OUT, f));
  mkdirSync(OUT, { recursive: true });
  let total = 0;
  for (const e of entries) {
    const file = resolve(ROOT, e.input);
    const exports = collectExports(file);
    const body = [...exports.keys()].sort()
      .flatMap((k) => render(k, exports.get(k)))
      .join('\n');
    const subpath = e.name === '.' ? '@uipath/uipath-typescript' : `@uipath/uipath-typescript/${e.name}`;
    const header = `## ${subpath}\n## generated by scripts/gen-api-surface.mjs -- do not edit by hand\n\n`;
    writeFileSync(resolve(OUT, `${e.name === '.' ? 'root' : e.name}.api.txt`), header + body + '\n');
    total += exports.size;
  }
  console.log(`api-surface: ${entries.length} entry points, ${total} exported symbols -> ${relative(ROOT, OUT) || OUT}`);
}

main();
