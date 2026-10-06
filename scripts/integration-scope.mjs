#!/usr/bin/env node
// Picks the integration suites a PR needs from its changed files: a change under
// src/services/<name>, src/models/<name>, src/utils/constants/endpoints/<name> or
// tests/integration/shared/<name> runs tests/integration/shared/<name>, or nothing
// when no such suite folder exists; a file beside the service folders (base.ts,
// folder-scoped.ts) runs the suites of the domains that import it, or everything when
// src/core or src/utils does; docs/samples/packages/scripts/tests/unit/tests/utils,
// tests/integration/config, package.json and coverage.yml run nothing;
// anything else runs everything.
// Usage: --base <ref> [--labels <a,b,...>] | --files <list> | --all.
import { execFileSync } from 'node:child_process';
import { appendFileSync, existsSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SHARED = 'tests/integration/shared';
const SERVICES = 'src/services';
const SRC = 'src';
/** The vitest projects in vitest.integration.config.ts; the second one is the Data Fabric schema DDL suite. */
export const PROJECTS = Object.freeze({ all: ['integration', 'integration-ddl'], noDdl: ['integration'] });
const DDL_DOMAIN = 'data-fabric';

/** Run whenever any suite runs; a change to one of them runs just these. */
export const ALWAYS_ON = Object.freeze([
  `${SHARED}/smoke.integration.test.ts`,
  `${SHARED}/http`,
  'tests/integration/auth-errors.integration.test.ts',
]);

/** PR label that forces the full run; the workflow hands the PR's labels over via --labels. */
export const FULL_RUN_LABEL = 'ci:full-integration';

const IGNORED_PATTERNS = [
  // scripts/ is CI and release tooling; tests/unit and tests/utils are unit-test code and
  // fixtures (a few fixture values are read by suites; a fixture-only edit is knowingly uncovered).
  /^(docs|samples|packages|plugins|scripts|agent_docs|\.claude|\.agents|tests\/unit|tests\/utils|tests\/integration\/config)\//,
  /\.md$/,
  /^(mkdocs\.yml|typedoc\.json|typedoc\.validation\.json|\.oxlintrc\.json|\.prettierrc\.docs|commitlint\.config\.js|release-metadata\.json|sonar-project\.properties|LICENSE|\.gitignore|\.npmrc|vitest\.config\.ts|rollup\.config\.js|package\.json|\.github\/workflows\/coverage\.yml|tests\/\.env\.integration\.example|src\/utils\/constants\/endpoints\/(?:index|base)\.ts)$/,
];
// The endpoint-constants folders are named after their service folder. base.ts and
// the barrel beside them are ignored: every new service adds a line to each, and its
// own folder and suite trigger its run.
const DOMAIN_PATH = /^(?:src\/services|src\/models|src\/utils\/constants\/endpoints|tests\/integration\/shared)\/([^/]+)\//;
/** A file beside the service folders: shared by whichever domains import it. */
const LOOSE_SERVICE = /^src\/services\/[^/]+\.ts$/;
const IMPORT_SPEC = /\bfrom\s+['"]([^'"]+)['"]/g;
/** New services are registered here; a change that only adds lines is loaded by the always-on suites. */
const REGISTRY = 'tests/integration/config/unified-setup.ts';

const isAlwaysOn = file => ALWAYS_ON.some(entry => file === entry || file.startsWith(`${entry}/`));

const folders = dir => readdirSync(join(ROOT, dir), { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => entry.name).sort();

function* walk(dir) {
  for (const entry of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
    if (entry.isDirectory()) yield* walk(`${dir}/${entry.name}`);
    else if (entry.name.endsWith('.ts')) yield `${dir}/${entry.name}`;
  }
}

/** `from '<spec>'` in `importer` → the imported module as a repo-relative path without extension. */
function resolveImport(importer, spec) {
  if (spec.startsWith('@/')) return `${SRC}/${spec.slice(2)}`.replace(/\.(ts|js)$/, '');
  if (!spec.startsWith('.')) return null;
  const path = relative(ROOT, resolve(ROOT, dirname(importer), spec)).split(sep).join('/').replace(/\.(ts|js)$/, '');
  // A folder import lands on its index.
  return !existsSync(join(ROOT, `${path}.ts`)) && existsSync(join(ROOT, path, 'index.ts')) ? `${path}/index` : path;
}

let sourceCache;
/** Every src/ file with the modules it imports, read once per process. */
function sources() {
  sourceCache ??= [...walk(SRC)].map(path => {
    const text = readFileSync(join(ROOT, path), 'utf8');
    const imports = [...text.matchAll(IMPORT_SPEC)].map(match => resolveImport(path, match[1])).filter(Boolean);
    return { path, imports };
  });
  return sourceCache;
}

/**
 * The src/ files that import `file`, following imports through other loose service
 * files (the barrel re-exports base.ts, core imports the barrel). Sorted.
 */
export function dependents(file, all = sources()) {
  const found = new Set();
  const queue = [file];
  while (queue.length > 0) {
    const target = queue.pop().replace(/\.ts$/, '');
    for (const { path, imports } of all) {
      if (path === `${target}.ts` || found.has(path) || !imports.includes(target)) continue;
      found.add(path);
      if (LOOSE_SERVICE.test(path)) queue.push(path);
    }
  }
  return [...found].sort();
}

/** Suite folders, minus the always-on ones. */
export function suites() {
  return folders(SHARED).filter(name => !ALWAYS_ON.includes(`${SHARED}/${name}`));
}

/** Service folders: the domains a suite folder can be named after. */
export function services() {
  return folders(SERVICES);
}

/**
 * One path → { kind: 'ignore' | 'always-on' | 'domain' | 'domains' | 'no-suite' | 'all' }.
 * `additive` holds the changed files that only gained lines (from `git diff --numstat`);
 * `importers` answers which src/ files import a loose service file.
 */
export function classify(file, domains, serviceDomains, additive = new Set(), importers = dependents) {
  if (IGNORED_PATTERNS.some(pattern => pattern.test(file))) return { kind: 'ignore' };
  if (isAlwaysOn(file)) return { kind: 'always-on' };
  if (file === REGISTRY && additive.has(file)) return { kind: 'always-on', note: `${file} only adds lines (a service registration); the always-on suites load it` };
  if (LOOSE_SERVICE.test(file)) return classifyShared(file, domains, serviceDomains, importers(file));
  const domain = file.match(DOMAIN_PATH)?.[1];
  if (domain && domains.includes(domain)) return { kind: 'domain', domain };
  // A service nothing tests (e.g. integration-service): nothing to run for it. Other
  // folders at this level (src/models/common) are shared code and run everything.
  if (domain && serviceDomains.includes(domain)) return { kind: 'no-suite', domain, note: `${file}: no suite folder ${SHARED}/${domain}, nothing to run` };
  return { kind: 'all', reason: `${file} is outside the per-domain folders` };
}

/**
 * A loose service file takes the union of its importers' classifications: a domain
 * importer adds that domain's suite, an importer outside the domain folders (core,
 * utils) makes it shared code that runs everything. Nothing importing it is treated
 * the same way, since the file is then new and nothing is known about its reach.
 */
function classifyShared(file, domains, serviceDomains, importers) {
  const selected = new Set();
  const notes = [];
  const users = importers.filter(user => !LOOSE_SERVICE.test(user));
  if (users.length === 0) return { kind: 'all', reason: `${file} is outside the per-domain folders and nothing under src/ imports it` };
  for (const user of users) {
    const result = classify(user, domains, serviceDomains);
    if (result.kind === 'all') return { kind: 'all', reason: `${file} is imported by ${user}, outside the per-domain folders` };
    if (result.kind === 'domain') selected.add(result.domain);
    else if (result.kind === 'no-suite') notes.push(result.note);
  }
  const sorted = [...selected].sort();
  return { kind: 'domains', domains: sorted, note: `${file} is imported by ${sorted.join(', ') || 'no tested domain'}; running those suites`, notes };
}

/** Changed files → { run, all, domains, paths (vitest filters; empty = all), reasons, notes }. */
export function resolveScope(changedFiles, domains = suites(), serviceDomains = services(), additive = new Set(), importers = dependents) {
  const selected = new Set();
  const reasons = [];
  const notes = [];
  let alwaysOn = false;

  for (const file of changedFiles) {
    const result = classify(file, domains, serviceDomains, additive, importers);
    if (result.kind === 'all') reasons.push(result.reason);
    else if (result.kind === 'domain') selected.add(result.domain);
    else if (result.kind === 'domains') {
      for (const domain of result.domains) selected.add(domain);
      notes.push(result.note, ...result.notes);
    } else if (result.kind === 'no-suite') notes.push(result.note);
    else if (result.kind === 'always-on') {
      alwaysOn = true;
      if (result.note) notes.push(result.note);
    }
  }
  if (reasons.length > 0) return { run: true, all: true, domains: [], paths: [], reasons, notes };

  const run = alwaysOn || selected.size > 0;
  const sorted = [...selected].sort();
  return { run, all: false, domains: sorted, paths: run ? [...ALWAYS_ON, ...sorted.map(d => `${SHARED}/${d}`)] : [], reasons, notes };
}

export const fullScope = reason => ({ run: true, all: true, domains: [], paths: [], reasons: [reason], notes: [] });

/** The vitest projects a scope needs: the schema DDL project only when Data Fabric is in scope. */
export const projectsFor = scope => (scope.all || scope.domains.includes(DDL_DOMAIN) ? PROJECTS.all : PROJECTS.noDdl);

/** GITHUB_OUTPUT lines for a resolved scope. `projects` is JSON for the workflow's matrix. */
export function toOutputs(scope) {
  const label = scope.all ? 'all' : scope.run ? scope.domains.join(',') || 'always-on' : 'none';
  return [`run_integration=${scope.run}`, `test_paths=${scope.paths.join(' ')}`, `scope=${label}`, `projects=${JSON.stringify(projectsFor(scope))}`];
}

/** `git diff --numstat` text → { files, additive: the files with added lines and no deleted ones }. */
export function parseNumstat(text) {
  const files = [];
  const additive = new Set();
  for (const line of text.split('\n').filter(Boolean)) {
    const [added, deleted, path] = line.split('\t');
    files.push(path);
    if (deleted === '0' && added !== '0') additive.add(path);
  }
  return { files, additive };
}

// ---- CLI ----

/** argv → { scope } when the answer is fixed up front, else { files, additive } to classify. */
export function resolveArgs(argv) {
  const at = flag => (argv.includes(flag) ? argv[argv.indexOf(flag) + 1] : undefined);
  if (argv.includes('--all')) return { scope: fullScope('full run requested') };
  const labels = (at('--labels') ?? '').split(',').map(l => l.trim()).filter(Boolean);
  if (labels.includes(FULL_RUN_LABEL)) return { scope: fullScope(`the PR carries the ${FULL_RUN_LABEL} label`) };
  const list = at('--files');
  if (list) return { files: readFileSync(list, 'utf8').split('\n').map(l => l.trim()).filter(Boolean), additive: new Set() };
  const base = at('--base');
  if (!base) {
    console.error('usage: integration-scope.mjs (--base <ref> [--labels <a,b,...>] | --files <list> | --all)');
    process.exit(2);
  }
  try {
    // --no-renames: both sides of a move count as changed.
    const diff = execFileSync('git', ['diff', '--numstat', '--no-renames', `${base}...HEAD`], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return parseNumstat(diff);
  } catch (error) {
    // A diff problem must never skip the run.
    return { scope: fullScope(`could not diff against ${base}: ${error.message.split('\n')[0]}`) };
  }
}

function run() {
  const { files, additive, scope: forced } = resolveArgs(process.argv.slice(2));
  const scope = forced ?? resolveScope(files, suites(), services(), additive);
  const outputs = toOutputs(scope);

  if (files) console.log(`integration-scope: ${files.length} changed file(s)`);
  for (const note of scope.notes) console.log(`integration-scope: ${note}`);
  for (const reason of scope.reasons) console.log(`integration-scope: full run — ${reason}`);
  if (!scope.all) {
    console.log(scope.run ? `integration-scope: running ${scope.domains.join(', ') || 'always-on suites only'}` : 'integration-scope: no integration test is affected');
  }
  for (const line of outputs) console.log(`  ${line}`);
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${outputs.join('\n')}\n`);
}

// CLI only when run directly, not when imported by tests.
if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run();
}
