// PR gate: docs/oauth-scopes.md must stay consistent with @track-decorated methods.
//   1. Every non-@internal @track method name appears as a documented row.
//   2. Scope cells contain only backticked scope identifiers — no prose.
// No prefix->section mapping is maintained anywhere — not a table, not doc
// markers. The check uses only data that already exists for its own reasons:
// the method rows already in the doc and the @track methods already in code.
// Trade-off: it verifies a method is documented *somewhere*, not under the
// right heading. A brand-new service exposing only common names (getAll/getById)
// could pass on another service's rows; distinctively-named methods — which is
// what new work almost always adds — are caught. Section placement, and stale
// rows for documented-but-not-tracked aliases/bound methods, stay a human/AI
// review concern.
// Existing gaps are grandfathered in docs-consistency-baseline.json.
// Regenerate: node scripts/pr-checks/check-docs-consistency.mjs --update-baseline
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const BASELINE_PATH = join(dirname(fileURLToPath(import.meta.url)), 'docs-consistency-baseline.json');
const UPDATE = process.argv.includes('--update-baseline');

function walk(dir, out = []) {
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

// 1. Collect tracked methods: { label, prefix, method, internal }.
// The governing JSDoc is the nearest /** */ block before @track, provided only
// whitespace or overload signatures (no braces) separate them — overloaded
// methods place their signature lines between the JSDoc and the decorator.
const tracked = [];
const trackRe = /@track\('([^']+)'\)\s*\n\s*(?:(?:public|protected|private|async|static)\s+)*([A-Za-z_$][\w$]*)\s*[<(]/g;
for (const file of walk(join(ROOT, 'src'))) {
  const content = readFileSync(file, 'utf8');
  for (const m of content.matchAll(trackRe)) {
    const label = m[1];
    const before = content.slice(0, m.index);
    const close = before.lastIndexOf('*/');
    let internal = false;
    if (close !== -1 && !/[{}]/.test(before.slice(close + 2))) {
      const open = before.lastIndexOf('/**', close);
      internal = /@internal\b|@ignore\b/.test(before.slice(open, close));
    }
    tracked.push({
      label,
      prefix: label.split('.').slice(0, -1).join('.'),
      method: m[2],
      internal,
    });
  }
}

// 2. Collect the set of method names documented in oauth-scopes.md. A method row
// is `| \`name()\` | ... |`; one cell may list aliases, e.g. `getRecord()` / `getRecordById()`.
const doc = readFileSync(join(ROOT, 'docs', 'oauth-scopes.md'), 'utf8');
const documented = new Set();
for (const line of doc.split('\n')) {
  const cell = line.match(/^\|([^|]+)\|/);
  if (!cell) continue;
  for (const m of cell[1].matchAll(/`([A-Za-z_$][\w$]*)\(/g)) documented.add(m[1]);
}

const violations = [];

// 3. Every public tracked method must be documented somewhere in the doc.
for (const t of tracked) {
  if (t.internal) continue;
  if (!documented.has(t.method)) {
    violations.push({ key: `${t.label}:no-scope-row`, message: `${t.method}() (${t.label}) is not documented in docs/oauth-scopes.md — add its OAuth scope row` });
  }
}

// 4. Scope cell format: backticked scope identifiers only (space-separated scopes
// inside one backtick group are fine), joined by "," / "or" / spaces — no prose.
const SCOPE_CELL = /^(`[A-Za-z0-9._ ]+`)(\s*(,|or)?\s*`[A-Za-z0-9._ ]+`)*$/;
for (const [i, line] of doc.split('\n').entries()) {
  const m = line.match(/^\|\s*`[^`]+\(\)`\s*\|(.+)\|\s*$/);
  if (!m) continue;
  const cell = m[1].trim();
  if (!SCOPE_CELL.test(cell)) {
    violations.push({ key: `scope-cell:${i + 1}`, message: `oauth-scopes.md:${i + 1} scope cell contains prose — keep only scope identifiers, move notes to method JSDoc: ${cell}` });
  }
}

// dedup by key (an unmapped prefix produces one violation per method)
const unique = [...new Map(violations.map(v => [v.key, v])).values()];
const baseline = existsSync(BASELINE_PATH) ? new Set(JSON.parse(readFileSync(BASELINE_PATH, 'utf8'))) : new Set();

if (UPDATE) {
  writeFileSync(BASELINE_PATH, JSON.stringify(unique.map(v => v.key).sort(), null, 2) + '\n');
  console.log(`docs-consistency baseline updated: ${unique.length} grandfathered violation(s)`);
  process.exit(0);
}

const fresh = unique.filter(v => !baseline.has(v.key));
if (fresh.length) {
  console.error(`check-docs-consistency: ${fresh.length} new violation(s):`);
  for (const v of fresh) console.error(`  ${v.key}: ${v.message}`);
  console.error('\nIf intentional, run: node scripts/pr-checks/check-docs-consistency.mjs --update-baseline');
  process.exit(1);
}
console.log(`check-docs-consistency: OK (${tracked.length} tracked methods, ${unique.length} grandfathered)`);
