// PR gate: grep-level hygiene rules from recurring review feedback, enforced as a
// per-file ratchet — existing counts are grandfathered in hygiene-baseline.json,
// any file exceeding its baselined count (or a new file with violations) fails.
// Regenerate after fixes: node scripts/pr-checks/check-hygiene.mjs --update-baseline
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const BASELINE_PATH = join(dirname(fileURLToPath(import.meta.url)), 'hygiene-baseline.json');
const UPDATE = process.argv.includes('--update-baseline');

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (entry === 'node_modules' || entry === 'dist') continue;
    let stat;
    try { stat = statSync(p); } catch { continue; } // broken symlink
    if (stat.isDirectory()) walk(p, out);
    else if (p.endsWith('.ts')) out.push(p);
  }
  return out;
}

const srcFiles = walk(join(ROOT, 'src'));
const testFiles = walk(join(ROOT, 'tests'));
const integrationFiles = testFiles.filter(f => relative(ROOT, f).startsWith(join('tests', 'integration')));

function countMatches(content, re) {
  return [...content.matchAll(re)].length;
}

// skip without a PAT/OAuth justification within the 3 preceding lines or on the same line
function countUnjustifiedSkips(content) {
  const lines = content.split('\n');
  let count = 0;
  lines.forEach((line, i) => {
    if (!/\b(describe|it|test)\.skip\b/.test(line)) return;
    const context = lines.slice(Math.max(0, i - 3), i + 1).join('\n');
    if (!/PAT|OAuth/i.test(context)) count++;
  });
  return count;
}

const RULES = [
  {
    id: 'as-any-in-tests',
    describe: 'no `as any` in tests (agent_docs conventions)',
    files: testFiles,
    count: c => countMatches(c, /\bas any\b/g),
  },
  {
    id: 'as-unknown-as-in-tests',
    describe: 'no `as unknown as` double casts in tests',
    files: testFiles,
    count: c => countMatches(c, /\bas unknown as\b/g),
  },
  {
    id: 'console-warn-in-integration',
    describe: 'no console.warn in integration tests — throw instead of silently skipping',
    files: integrationFiles,
    count: c => countMatches(c, /console\.warn/g),
  },
  {
    id: 'unjustified-skip-in-integration',
    describe: 'describe/it.skip in integration tests requires a PAT/OAuth justification comment',
    files: integrationFiles,
    count: countUnjustifiedSkips,
  },
  {
    id: 'try-catch-in-integration',
    describe: 'no try/catch around integration test calls — let errors propagate',
    files: integrationFiles,
    count: c => countMatches(c, /\btry\s*\{/g),
  },
  {
    id: 'double-blank-lines',
    describe: 'no consecutive blank lines',
    files: [...srcFiles, ...testFiles],
    count: c => countMatches(c, /\n[ \t]*\n[ \t]*\n/g),
  },
  {
    id: 'internal-types-barrel-export',
    describe: 'internal-types must not be re-exported from barrel files',
    files: srcFiles.filter(f => f.endsWith('index.ts')),
    count: c => countMatches(c, /export\s+(?:type\s+)?\*?\s*(?:\{[^}]*\})?\s*from\s+['"][^'"]*internal-types['"]/g),
  },
];

// measure: { "ruleId>relPath": count }
const current = {};
for (const rule of RULES) {
  for (const file of rule.files) {
    const n = rule.count(readFileSync(file, 'utf8'));
    if (n > 0) current[`${rule.id}>${relative(ROOT, file)}`] = n;
  }
}

if (UPDATE) {
  const sorted = Object.fromEntries(Object.entries(current).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(BASELINE_PATH, JSON.stringify(sorted, null, 2) + '\n');
  console.log(`hygiene baseline updated: ${Object.keys(sorted).length} file/rule entries grandfathered`);
  process.exit(0);
}

const baseline = existsSync(BASELINE_PATH) ? JSON.parse(readFileSync(BASELINE_PATH, 'utf8')) : {};
const failures = [];
for (const [key, count] of Object.entries(current)) {
  const allowed = baseline[key] ?? 0;
  if (count > allowed) {
    const rule = RULES.find(r => key.startsWith(`${r.id}>`));
    failures.push(`  ${key}: ${count} occurrence(s), baseline allows ${allowed} — ${rule.describe}`);
  }
}

if (failures.length) {
  console.error(`check-hygiene: ${failures.length} rule/file(s) exceed baseline:`);
  for (const f of failures) console.error(f);
  console.error('\nFix the new occurrences. If you reduced counts elsewhere, refresh with: node scripts/pr-checks/check-hygiene.mjs --update-baseline');
  process.exit(1);
}
console.log(`check-hygiene: OK (${RULES.length} rules, ${Object.keys(baseline).length} grandfathered file/rule entries)`);
