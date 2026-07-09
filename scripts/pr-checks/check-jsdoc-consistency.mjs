import { finishViolationBaseline } from './baseline.mjs';
import {
  findDescendants,
  getDeclarationName,
  getImplementedInterfaces,
  getJsdocText,
  parseTypeScriptFile,
  ts,
  walkTsFiles,
} from './typescript-source.mjs';
import { checkPath, repoPath } from './workspace.mjs';

const BASELINE_PATH = checkPath('jsdoc-consistency-baseline.json');
const SERVICE_MODEL_SUFFIX = 'ServiceModel';

function collectDocumentedMethods(members, sourceFile, isMethodNode) {
  const methods = new Map();
  for (const member of members) {
    if (!isMethodNode(member)) continue;
    const name = getDeclarationName(member);
    if (!name || name === 'constructor') continue;
    const jsdoc = getJsdocText(member, sourceFile);
    if (jsdoc !== undefined) methods.set(name, jsdoc);
  }
  return methods;
}

function collectServiceModels() {
  const models = [];
  for (const file of walkTsFiles(repoPath('src', 'models'))) {
    if (!file.endsWith('.models.ts')) continue;
    const sourceFile = parseTypeScriptFile(file);
    for (const node of findDescendants(sourceFile, ts.isInterfaceDeclaration)) {
      const modelName = node.name.text;
      if (!modelName.endsWith(SERVICE_MODEL_SUFFIX)) continue;
      const serviceClass = `${modelName.slice(0, -SERVICE_MODEL_SUFFIX.length)}Service`;
      models.push({
        modelName,
        serviceClass,
        methods: collectDocumentedMethods(node.members, sourceFile, ts.isMethodSignature),
      });
    }
  }
  return models;
}

function collectServiceClasses() {
  const byModelName = new Map();
  const byClassName = new Map();

  for (const file of walkTsFiles(repoPath('src', 'services'))) {
    const sourceFile = parseTypeScriptFile(file);
    for (const node of findDescendants(sourceFile, ts.isClassDeclaration)) {
      const className = node.name?.text;
      if (!className?.endsWith('Service')) continue;
      const entry = {
        className,
        methods: collectDocumentedMethods(node.members, sourceFile, ts.isMethodDeclaration),
      };
      byClassName.set(className, entry);
      for (const modelName of getImplementedInterfaces(node)) {
        if (modelName.endsWith(SERVICE_MODEL_SUFFIX)) byModelName.set(modelName, entry);
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

finishViolationBaseline({
  checkName: 'check-jsdoc-consistency',
  baselinePath: BASELINE_PATH,
  violations,
  updateSummary: count => `jsdoc-consistency baseline updated: ${count} known existing violation(s)`,
  failureHint: 'Keep ServiceModel and service class JSDoc identical. If intentional, run: node scripts/pr-checks/check-jsdoc-consistency.mjs --update-baseline',
  successSummary: ({ violationCount }) => `${models.length} ServiceModels, ${skipped} doc-only skipped, ${violationCount} known existing`,
});
