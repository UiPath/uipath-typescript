#!/usr/bin/env node
// Picks the integration suites a PR needs from its changed files: a change under
// src/services/<name>, src/models/<name> or tests/integration/shared/<name> runs
// tests/integration/shared/<name>; docs/samples/packages/unit tests run nothing;
// anything else runs everything. Usage: --base <ref> | --files <list> | --all.
import { execFileSync } from 'node:child_process';
import { appendFileSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SHARED = 'tests/integration/shared';

/** Run whenever any suite runs. */
export const ALWAYS_ON = Object.freeze([
  `${SHARED}/smoke.integration.test.ts`,
  `${SHARED}/http`,
  'tests/integration/auth-errors.integration.test.ts',
]);

/** PR label that forces the full run. */
export const FULL_RUN_LABEL = 'ci:full-integration';

const IGNORED_PATTERNS = [
  /^(docs|samples|packages|plugins|agent_docs|\.claude|\.agents|tests\/unit|tests\/utils\/mocks)\//,
  /\.md$/,
  /^(mkdocs\.yml|typedoc\.json|typedoc\.validation\.json|\.oxlintrc\.json|\.prettierrc\.docs|commitlint\.config\.js|release-metadata\.json|sonar-project\.properties|LICENSE|\.gitignore|\.npmrc|vitest\.config\.ts|rollup\.config\.js|tests\/\.env\.integration\.example)$/,
];
const DOMAIN_PATH = /^(?:src\/services|src\/models|tests\/integration\/shared)\/([^/]+)\//;

/** Suite folders, minus the always-on ones. */
export function suites() {
  return readdirSync(join(ROOT, SHARED), { withFileTypes: true })
    .filter(entry => entry.isDirectory() && !ALWAYS_ON.includes(`${SHARED}/${entry.name}`))
    .map(entry => entry.name)
    .sort();
}

/** One path → { kind: 'ignore' | 'always-on' | 'domain' | 'all' }. */
export function classify(file, domains) {
  if (IGNORED_PATTERNS.some(pattern => pattern.test(file))) return { kind: 'ignore' };
  const domain = file.match(DOMAIN_PATH)?.[1];
  if (domain && domains.includes(domain)) return { kind: 'domain', domain };
  if (domain && ALWAYS_ON.includes(`${SHARED}/${domain}`)) return { kind: 'always-on' };
  return { kind: 'all', reason: `${file} is outside the per-domain folders` };
}

/** Changed files → { run, all, domains, paths (vitest filters; empty = all), reasons }. */
export function resolveScope(changedFiles, domains = suites()) {
  const selected = new Set();
  const reasons = [];
  let alwaysOn = false;

  for (const file of changedFiles) {
    const result = classify(file, domains);
    if (result.kind === 'all') reasons.push(result.reason);
    else if (result.kind === 'domain') selected.add(result.domain);
    else if (result.kind === 'always-on') alwaysOn = true;
  }
  if (reasons.length > 0) return { run: true, all: true, domains: [], paths: [], reasons };

  const run = alwaysOn || selected.size > 0;
  const sorted = [...selected].sort();
  return { run, all: false, domains: sorted, paths: run ? [...ALWAYS_ON, ...sorted.map(d => `${SHARED}/${d}`)] : [], reasons };
}

export const fullScope = reason => ({ run: true, all: true, domains: [], paths: [], reasons: [reason] });

/** GITHUB_OUTPUT lines for a resolved scope. */
export function toOutputs(scope) {
  const label = scope.all ? 'all' : scope.run ? scope.domains.join(',') || 'always-on' : 'none';
  return [`run_integration=${scope.run}`, `test_paths=${scope.paths.join(' ')}`, `scope=${label}`];
}

// ---- CLI ----

function changedFiles(argv) {
  const at = flag => (argv.includes(flag) ? argv[argv.indexOf(flag) + 1] : undefined);
  if (argv.includes('--all')) return { scope: fullScope('full run requested') };
  const list = at('--files');
  if (list) return { files: readFileSync(list, 'utf8').split('\n').map(l => l.trim()).filter(Boolean) };
  const base = at('--base');
  if (!base) {
    console.error('usage: integration-scope.mjs (--base <ref> | --files <list> | --all)');
    process.exit(2);
  }
  try {
    // --no-renames: both sides of a move count as changed.
    const diff = execFileSync('git', ['diff', '--name-only', '--no-renames', `${base}...HEAD`], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return { files: diff.split('\n').filter(Boolean) };
  } catch (error) {
    // A diff problem must never skip the run.
    return { scope: fullScope(`could not diff against ${base}: ${error.message.split('\n')[0]}`) };
  }
}

function run() {
  const { files, scope: forced } = changedFiles(process.argv.slice(2));
  const scope = forced ?? resolveScope(files);
  const outputs = toOutputs(scope);

  if (files) console.log(`integration-scope: ${files.length} changed file(s)`);
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
