// PR gate: JSDoc on {Entity}ServiceModel (src/models/**/*.models.ts) must be identical
// to the JSDoc on the same-named method of the {Entity}Service class (src/services/**).
// Convention source: agent_docs/rules.md ("Keep JSDoc on service class methods in sync with ServiceModel").
// Existing drift is grandfathered in jsdoc-sync-baseline.json.
// Regenerate: node scripts/pr-checks/check-jsdoc-sync.mjs --update-baseline
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const BASELINE_PATH = join(dirname(fileURLToPath(import.meta.url)), 'jsdoc-sync-baseline.json');
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

function normalizeJsdoc(raw) {
  return raw
    .split('\n')
    .map(line => line.replace(/^\s*\*?\s?/, '').replace(/\s+$/, ''))
    .join('\n')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

// Extract [{ name, jsdoc }] pairs from a code block. Tolerates decorators and
// modifiers (async/public/etc.) between the JSDoc block and the method name.
function extractMethods(block) {
  const methods = new Map();
  const re = /\/\*\*([\s\S]*?)\*\/\s*\n(?:\s*@[\w.]+\((?:[^()]|\([^()]*\))*\)\s*\n)*\s*(?:(?:public|protected|private|readonly|async|static)\s+)*([A-Za-z_$][\w$]*)\s*[<(]/g;
  for (const m of block.matchAll(re)) {
    if (['if', 'for', 'while', 'switch', 'catch', 'return', 'constructor'].includes(m[2])) continue;
    methods.set(m[2], normalizeJsdoc(m[1]));
  }
  return methods;
}

// 1. Collect ServiceModel interfaces from models files
const models = []; // { modelName, file, methods }
for (const file of walk(join(ROOT, 'src', 'models'))) {
  if (!file.endsWith('.models.ts')) continue;
  const content = readFileSync(file, 'utf8');
  const re = /export interface (\w+)ServiceModel\b[^\n]*\{/g;
  for (const m of content.matchAll(re)) {
    // interface body runs until the first line that is exactly "}"
    const end = content.indexOf('\n}', m.index);
    const block = content.slice(m.index, end === -1 ? content.length : end);
    models.push({ modelName: `${m[1]}ServiceModel`, serviceClass: `${m[1]}Service`, file, methods: extractMethods(block) });
  }
}

// 2. Index service classes — primarily by their `implements XServiceModel` clause,
// falling back to the {X}Service naming convention.
const byModelName = new Map(); // 'XServiceModel' -> { className, methods }
const byClassName = new Map(); // 'XService' -> { className, methods }
for (const file of walk(join(ROOT, 'src', 'services'))) {
  const content = readFileSync(file, 'utf8');
  const m = content.match(/class (\w+)[^{]*?\{/);
  if (!m || !m[1].endsWith('Service')) continue;
  const entry = { className: m[1], methods: extractMethods(content.slice(m.index)) };
  byClassName.set(m[1], entry);
  const impl = content.slice(m.index, m.index + m[0].length).match(/implements\s+([^{]+)/);
  for (const name of impl ? impl[1].split(',').map(s => s.trim()) : []) {
    if (name.endsWith('ServiceModel')) byModelName.set(name, entry);
  }
}

// 3. Compare. ServiceModels with no implementing class (doc-only scoped models
// like AgentConversationServiceModel) are skipped.
const violations = []; // { key, message }
let skipped = 0;
for (const model of models) {
  const entry = byModelName.get(model.modelName) ?? byClassName.get(model.serviceClass);
  if (!entry) {
    skipped++;
    continue;
  }
  model.serviceClass = entry.className;
  const service = entry.methods;
  for (const [method, modelDoc] of model.methods) {
    const serviceDoc = service.get(method);
    const key = `${model.serviceClass}.${method}`;
    if (serviceDoc === undefined) {
      violations.push({ key, message: `method has JSDoc on ${model.modelName} but no JSDoc'd ${method}() on ${model.serviceClass}` });
    } else if (serviceDoc !== modelDoc) {
      const modelLines = modelDoc.split('\n');
      const serviceLines = serviceDoc.split('\n');
      const i = modelLines.findIndex((line, idx) => line !== serviceLines[idx]);
      violations.push({
        key,
        message: `JSDoc differs between ${model.modelName} and ${model.serviceClass} — first difference:\n      model:   ${JSON.stringify(modelLines[i] ?? '<end>')}\n      service: ${JSON.stringify(serviceLines[i] ?? '<end>')}`,
      });
    }
  }
}

const baseline = existsSync(BASELINE_PATH) ? new Set(JSON.parse(readFileSync(BASELINE_PATH, 'utf8'))) : new Set();

if (UPDATE) {
  writeFileSync(BASELINE_PATH, JSON.stringify([...new Set(violations.map(v => v.key))].sort(), null, 2) + '\n');
  console.log(`jsdoc-sync baseline updated: ${violations.length} grandfathered violation(s)`);
  process.exit(0);
}

const fresh = violations.filter(v => !baseline.has(v.key));
if (fresh.length) {
  console.error(`check-jsdoc-sync: ${fresh.length} new violation(s):`);
  for (const v of fresh) console.error(`  ${v.key}: ${v.message}`);
  console.error('\nKeep ServiceModel and service class JSDoc identical (agent_docs/rules.md).');
  console.error('If intentional, run: node scripts/pr-checks/check-jsdoc-sync.mjs --update-baseline');
  process.exit(1);
}
console.log(`check-jsdoc-sync: OK (${models.length} ServiceModels, ${skipped} doc-only skipped, ${violations.length} grandfathered)`);
