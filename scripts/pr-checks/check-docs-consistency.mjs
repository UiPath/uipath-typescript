// PR gate: docs/oauth-scopes.md must stay consistent with @track-decorated methods.
//   1. Every non-@internal @track method has a row in its service's section.
//   2. Services whose methods are ALL @internal must NOT be documented.
//   3. Scope cells contain only backticked scope identifiers — no prose.
// The @track-prefix -> section mapping is NOT hardcoded here: it is read from
// `<!-- track: Prefix, ... -->` markers placed under each heading in the doc
// itself (single source of truth, maintained where the docs are). Internal-only
// services are derived from the code's @internal tags, not a list.
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

// 2. Read the prefix -> section-body map from the doc's <!-- track: ... --> markers.
// A marker binds all following text (until the next heading) to one or more
// prefixes; a heading may carry a comma-separated list (shared sections).
const doc = readFileSync(join(ROOT, 'docs', 'oauth-scopes.md'), 'utf8');
const sectionByPrefix = new Map(); // prefix -> { heading, body }
const headingRe = /^#{2,3} (.+)$/gm;
const headings = [...doc.matchAll(headingRe)];
headings.forEach((h, i) => {
  const body = doc.slice(h.index, headings[i + 1]?.index ?? doc.length);
  for (const marker of body.matchAll(/<!--\s*track:\s*([^>]+?)\s*-->/g)) {
    for (const prefix of marker[1].split(',').map(s => s.trim()).filter(Boolean)) {
      sectionByPrefix.set(prefix, { heading: h[1].trim(), body });
    }
  }
});

// 3. Derive which prefixes are internal-only (every tracked method is @internal).
const prefixes = new Map(); // prefix -> { total, internal }
for (const t of tracked) {
  const p = prefixes.get(t.prefix) ?? { total: 0, internal: 0 };
  p.total++;
  if (t.internal) p.internal++;
  prefixes.set(t.prefix, p);
}
const internalOnly = new Set(
  [...prefixes].filter(([, c]) => c.internal === c.total).map(([p]) => p)
);

const violations = [];

// 4. Method coverage
for (const t of tracked) {
  if (t.internal || internalOnly.has(t.prefix)) continue; // internal methods aren't documented
  const section = sectionByPrefix.get(t.prefix);
  if (!section) {
    violations.push({ key: `unmapped:${t.prefix}`, message: `no oauth-scopes.md section declares "<!-- track: ${t.prefix} -->" — add a section with that marker, or mark all "${t.prefix}" methods @internal` });
    continue;
  }
  if (!section.body.includes(`\`${t.method}(`)) {
    violations.push({ key: `${t.label}:no-scope-row`, message: `${t.method}() (${t.label}) has no row in the "${section.heading}" section of docs/oauth-scopes.md` });
  }
}

// 5. Internal-only services must not be documented (no marker should claim them).
for (const prefix of internalOnly) {
  if (sectionByPrefix.has(prefix)) {
    violations.push({ key: `internal-documented:${prefix}`, message: `"${prefix}" is internal-only (all methods @internal) but a "<!-- track: ${prefix} -->" marker documents it — remove the section/marker` });
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
