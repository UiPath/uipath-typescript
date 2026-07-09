// PR gate: JSDoc on {Entity}ServiceModel (src/models/**/*.models.ts) must be identical
// to the JSDoc on the same-named method of the {Entity}Service class (src/services/**).
// Source parsing uses the TypeScript compiler API so helper classes, decorators,
// overloads, generics, and multiline declarations do not confuse the matcher.
// Existing drift is grandfathered in jsdoc-sync-baseline.json.
// Regenerate: node scripts/pr-checks/check-jsdoc-sync.mjs --update-baseline
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  findNodes,
  getImplementedInterfaceNames,
  getJsdoc,
  getNodeName,
  parseSourceFile,
  ts,
  walkTsFiles,
} from './ts-ast.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const BASELINE_PATH = join(dirname(fileURLToPath(import.meta.url)), 'jsdoc-sync-baseline.json');
const UPDATE = process.argv.includes('--update-baseline');

function collectDocumentedMethods(members, sourceFile, isMethodNode) {
  const methods = new Map();
  for (const member of members) {
    if (!isMethodNode(member)) continue;
    const name = getNodeName(member);
    if (!name || name === 'constructor') continue;
    const jsdoc = getJsdoc(member, sourceFile);
    if (jsdoc !== undefined) methods.set(name, jsdoc);
  }
  return methods;
}

function collectServiceModels() {
  const models = [];
  for (const file of walkTsFiles(join(ROOT, 'src', 'models'))) {
    if (!file.endsWith('.models.ts')) continue;
    const sourceFile = parseSourceFile(file);
    for (const node of findNodes(sourceFile, ts.isInterfaceDeclaration)) {
      const modelName = node.name.text;
      if (!modelName.endsWith('ServiceModel')) continue;
      const serviceClass = `${modelName.slice(0, -'ServiceModel'.length)}Service`;
      models.push({
        modelName,
        serviceClass,
        file,
        methods: collectDocumentedMethods(node.members, sourceFile, ts.isMethodSignature),
      });
    }
  }
  return models;
}

function collectServiceClasses() {
  const byModelName = new Map();
  const byClassName = new Map();

  for (const file of walkTsFiles(join(ROOT, 'src', 'services'))) {
    const sourceFile = parseSourceFile(file);
    for (const node of findNodes(sourceFile, ts.isClassDeclaration)) {
      const className = node.name?.text;
      if (!className?.endsWith('Service')) continue;
      const entry = {
        className,
        methods: collectDocumentedMethods(node.members, sourceFile, ts.isMethodDeclaration),
      };
      byClassName.set(className, entry);
      for (const modelName of getImplementedInterfaceNames(node)) {
        if (modelName.endsWith('ServiceModel')) byModelName.set(modelName, entry);
      }
    }
  }

  return { byModelName, byClassName };
}

const models = collectServiceModels();
const { byModelName, byClassName } = collectServiceClasses();
const violations = [];
let skipped = 0;

for (const model of models) {
  const entry = byModelName.get(model.modelName) ?? byClassName.get(model.serviceClass);
  if (!entry) {
    skipped++;
    continue;
  }

  for (const [method, modelDoc] of model.methods) {
    const serviceDoc = entry.methods.get(method);
    const key = `${entry.className}.${method}`;
    if (serviceDoc === undefined) {
      violations.push({ key, message: `method has JSDoc on ${model.modelName} but no JSDoc'd ${method}() on ${entry.className}` });
    } else if (serviceDoc !== modelDoc) {
      const modelLines = modelDoc.split('\n');
      const serviceLines = serviceDoc.split('\n');
      const i = modelLines.findIndex((line, idx) => line !== serviceLines[idx]);
      violations.push({
        key,
        message: `JSDoc differs between ${model.modelName} and ${entry.className} - first difference:\n      model:   ${JSON.stringify(modelLines[i] ?? '<end>')}\n      service: ${JSON.stringify(serviceLines[i] ?? '<end>')}`,
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
