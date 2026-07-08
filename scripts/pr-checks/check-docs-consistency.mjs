// PR gate: docs/oauth-scopes.md must stay consistent with @track-decorated methods.
//   1. Every non-@internal @track method has a row in its service's section.
//   2. Services whose methods are all @internal must NOT have a docs section.
//   3. Scope cells contain only backticked scope identifiers — no prose.
// Existing gaps are grandfathered in docs-consistency-baseline.json.
// Regenerate: node scripts/pr-checks/check-docs-consistency.mjs --update-baseline
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const BASELINE_PATH = join(dirname(fileURLToPath(import.meta.url)), 'docs-consistency-baseline.json');
const UPDATE = process.argv.includes('--update-baseline');

// @track label prefix -> oauth-scopes.md section heading.
// null = internal-only service, must not be documented.
// A new service must add its entry here AND its section in docs/oauth-scopes.md.
const SECTION_MAP = {
  Assets: 'Assets',
  Jobs: 'Jobs',
  Attachments: 'Attachments',
  Buckets: 'Buckets',
  Entities: 'Entities',
  Choicesets: 'ChoiceSets',
  MaestroProcesses: 'Maestro Processes',
  ProcessInstances: 'Maestro Process Instances',
  ProcessIncidents: 'Maestro Process Instances',
  Cases: 'Maestro Cases',
  CaseInstances: 'Maestro Case Instances',
  ConversationalAgent: 'Agents',
  'ConversationalAgent.Conversations': 'Conversations',
  'ConversationalAgent.Exchanges': 'Exchanges',
  'ConversationalAgent.Messages': 'Messages',
  'ConversationalAgent.UserSettings': 'User Settings',
  Feedback: 'Feedback',
  AgentMemory: 'Agent Memory',
  Traces: 'Traces',
  Governance: 'Governance',
  Processes: 'Processes',
  Queues: 'Queues',
  Tasks: 'Tasks',
  Agents: 'Agents',
  AgentTraces: 'Agent Traces',
  Notifications: null,
  DataFabricDirectory: null,
  OrchestratorDuModule: null,
};

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

// 2. Parse oauth-scopes.md into sections: normalized heading -> [bodies]
const doc = readFileSync(join(ROOT, 'docs', 'oauth-scopes.md'), 'utf8');
const sections = new Map();
const headingRe = /^#{2,3} (.+)$/gm;
const headings = [...doc.matchAll(headingRe)];
headings.forEach((h, i) => {
  const title = h[1].trim().toLowerCase().replace(/\s+/g, ' ');
  const body = doc.slice(h.index, headings[i + 1]?.index ?? doc.length);
  if (!sections.has(title)) sections.set(title, []);
  sections.get(title).push(body);
});

const violations = [];

// 3. Method coverage + internal-service checks
for (const t of tracked) {
  const mapped = SECTION_MAP[t.prefix];
  if (mapped === undefined) {
    if (!t.internal) violations.push({ key: `unmapped:${t.prefix}`, message: `@track prefix "${t.prefix}" has no SECTION_MAP entry — add it (and a docs section) or mark all its methods @internal` });
    continue;
  }
  if (mapped === null) {
    if (!t.internal) violations.push({ key: `${t.label}:not-internal`, message: `"${t.prefix}" is an internal-only service but ${t.method}() is not tagged @internal — tag it or add a docs section` });
    continue;
  }
  if (t.internal) continue; // internal methods of public services: just must not be required in docs
  const bodies = sections.get(mapped.toLowerCase()) ?? [];
  const hasRow = bodies.some(b => b.includes(`\`${t.method}(`));
  if (!hasRow) {
    violations.push({ key: `${t.label}:no-scope-row`, message: `${t.method}() (${t.label}) has no row in the "${mapped}" section of docs/oauth-scopes.md` });
  }
}

// internal-only services must not have a section
for (const [prefix, mapped] of Object.entries(SECTION_MAP)) {
  if (mapped !== null) continue;
  const guess = prefix.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
  if (sections.has(guess)) {
    violations.push({ key: `internal-documented:${prefix}`, message: `internal service "${prefix}" appears to have a docs section ("${guess}") in oauth-scopes.md — remove it` });
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

const baseline = existsSync(BASELINE_PATH) ? new Set(JSON.parse(readFileSync(BASELINE_PATH, 'utf8'))) : new Set();

if (UPDATE) {
  writeFileSync(BASELINE_PATH, JSON.stringify([...new Set(violations.map(v => v.key))].sort(), null, 2) + '\n');
  console.log(`docs-consistency baseline updated: ${violations.length} grandfathered violation(s)`);
  process.exit(0);
}

const fresh = violations.filter(v => !baseline.has(v.key));
if (fresh.length) {
  console.error(`check-docs-consistency: ${fresh.length} new violation(s):`);
  for (const v of fresh) console.error(`  ${v.key}: ${v.message}`);
  console.error('\nIf intentional, run: node scripts/pr-checks/check-docs-consistency.mjs --update-baseline');
  process.exit(1);
}
console.log(`check-docs-consistency: OK (${tracked.length} tracked methods, ${violations.length} grandfathered)`);
