#!/usr/bin/env node
// Picks the integration suites a PR needs from its changed files: a change under
// src/services/<name>, src/models/<name>, src/utils/constants/endpoints/<name> or
// tests/integration/shared/<name> runs tests/integration/shared/<name>, as does the
// shared test-constants file tests/utils/constants/<name>.ts, or nothing when no such
// suite folder exists; an additions-only change to the service registry
// (tests/integration/config/unified-setup.ts) runs just the always-on suites;
// docs/samples/packages/unit tests and package.json run nothing; anything else runs everything.
// Usage: --base <ref> [--labels <a,b,...>] | --files <list> | --all.
import { execFileSync } from 'node:child_process';
import { appendFileSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SHARED = 'tests/integration/shared';
const SERVICES = 'src/services';

/** Run whenever any suite runs; a change to one of them runs just these. */
export const ALWAYS_ON = Object.freeze([
  `${SHARED}/smoke.integration.test.ts`,
  `${SHARED}/http`,
  'tests/integration/auth-errors.integration.test.ts',
]);

/** PR label that forces the full run; the workflow hands the PR's labels over via --labels. */
export const FULL_RUN_LABEL = 'ci:full-integration';

const IGNORED_PATTERNS = [
  /^(docs|samples|packages|plugins|agent_docs|\.claude|\.agents|tests\/unit|tests\/utils\/mocks)\//,
  /\.md$/,
  /^(mkdocs\.yml|typedoc\.json|typedoc\.validation\.json|\.oxlintrc\.json|\.prettierrc\.docs|commitlint\.config\.js|release-metadata\.json|sonar-project\.properties|LICENSE|\.gitignore|\.npmrc|vitest\.config\.ts|rollup\.config\.js|package\.json|tests\/\.env\.integration\.example|src\/utils\/constants\/endpoints\/(?:index|base)\.ts)$/,
];
// The endpoint-constants folders are named after their service folder. base.ts and
// the barrel beside them are ignored: every new service adds a line to each, and its
// own folder and suite trigger its run.
const DOMAIN_PATH = /^(?:src\/services|src\/models|src\/utils\/constants\/endpoints|tests\/integration\/shared)\/([^/]+)\//;
// Shared test constants are per domain by file name, like the suite folders.
const CONSTANTS_FILE = /^tests\/utils\/constants\/([^/]+)\.ts$/;
/** New services are registered here; a change that only adds lines is loaded by the always-on suites. */
const REGISTRY = 'tests/integration/config/unified-setup.ts';

export const isAlwaysOn = file => ALWAYS_ON.some(entry => file === entry || file.startsWith(`${entry}/`));

const folders = dir => readdirSync(join(ROOT, dir), { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => entry.name).sort();

/** Suite folders, minus the always-on ones. */
export function suites() {
  return folders(SHARED).filter(name => !ALWAYS_ON.includes(`${SHARED}/${name}`));
}

/** Service folders: the domains a suite folder can be named after. */
export function services() {
  return folders(SERVICES);
}

/**
 * One path → { kind: 'ignore' | 'always-on' | 'domain' | 'no-suite' | 'all' }.
 * `additive` holds the changed files that only gained lines (from `git diff --numstat`).
 */
export function classify(file, domains, serviceDomains, additive = new Set()) {
  if (IGNORED_PATTERNS.some(pattern => pattern.test(file))) return { kind: 'ignore' };
  if (isAlwaysOn(file)) return { kind: 'always-on' };
  if (file === REGISTRY && additive.has(file)) return { kind: 'always-on', note: `${file} only adds lines (a service registration); the always-on suites load it` };
  const domain = file.match(DOMAIN_PATH)?.[1] ?? file.match(CONSTANTS_FILE)?.[1];
  if (domain && domains.includes(domain)) return { kind: 'domain', domain };
  // A service nothing tests (e.g. integration-service): nothing to run for it. Other
  // folders at this level (src/models/common) are shared code and run everything.
  if (domain && serviceDomains.includes(domain)) return { kind: 'no-suite', domain, note: `${file}: no suite folder ${SHARED}/${domain}, nothing to run` };
  return { kind: 'all', reason: `${file} is outside the per-domain folders` };
}

/** Changed files → { run, all, domains, paths (vitest filters; empty = all), reasons, notes }. */
export function resolveScope(changedFiles, domains = suites(), serviceDomains = services(), additive = new Set()) {
  const selected = new Set();
  const reasons = [];
  const notes = [];
  let alwaysOn = false;

  for (const file of changedFiles) {
    const result = classify(file, domains, serviceDomains, additive);
    if (result.kind === 'all') reasons.push(result.reason);
    else if (result.kind === 'domain') selected.add(result.domain);
    else if (result.kind === 'no-suite') notes.push(result.note);
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

/** GITHUB_OUTPUT lines for a resolved scope. */
export function toOutputs(scope) {
  const label = scope.all ? 'all' : scope.run ? scope.domains.join(',') || 'always-on' : 'none';
  return [`run_integration=${scope.run}`, `test_paths=${scope.paths.join(' ')}`, `scope=${label}`];
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
