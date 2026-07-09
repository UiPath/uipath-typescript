import { readFileSync } from 'node:fs';
import {
  findDescendants,
  getDeclarationName,
  getDecoratorStringArgument,
  hasJsdocTag,
  parseTypeScriptFile,
  ts,
  walkTsFiles,
} from './typescript-source.mjs';
import { repoPath } from './workspace.mjs';

const SCOPE_CELL = /^(`[A-Za-z0-9._ ]+`)(\s*(,|or)?\s*`[A-Za-z0-9._ ]+`)*$/;
const HEADING = /^(#{2,6})\s+(.+?)\s*#*\s*$/;
const TABLE_SEPARATOR = /^-+$/;
const METHOD_CALL = /`([A-Za-z_$][\w$]*)\(/g;
const SERVICE_SECTION_ALIASES = new Map([
  ['caseinstances', ['maestrocaseinstances']],
  ['cases', ['maestrocases']],
  ['conversationalagent', ['conversationalagentagents']],
  ['processinstances', ['maestroprocessinstances']],
]);

function normalizeKey(value) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function collectTrackedMethods() {
  const tracked = [];
  for (const file of walkTsFiles(repoPath('src'))) {
    const sourceFile = parseTypeScriptFile(file);
    for (const node of findDescendants(sourceFile, ts.isMethodDeclaration)) {
      const label = getDecoratorStringArgument(node, 'track');
      if (!label) continue;
      const method = getDeclarationName(node);
      if (!method) continue;
      tracked.push({
        label,
        prefix: label.split('.').slice(0, -1).join('.'),
        method,
        internal: hasJsdocTag(node, ['internal', 'ignore']),
      });
    }
  }
  return tracked;
}

function parseTableRow(line) {
  if (!line.startsWith('|')) return undefined;
  const rawCells = line.replace(/^\|/, '').replace(/\|\s*$/, '').split('|');
  if (rawCells.length < 2) return undefined;
  const [methodCell, scopeCell] = rawCells.map(cell => cell.trim());
  if (!methodCell || methodCell === 'Method' || TABLE_SEPARATOR.test(methodCell)) return undefined;
  const methods = [...methodCell.matchAll(METHOD_CALL)].map(match => match[1]);
  if (!methods.length) return undefined;
  return { methods, scopeCell };
}

function collectDocumentedSections() {
  const doc = readFileSync(repoPath('docs', 'oauth-scopes.md'), 'utf8');
  const sections = [];
  const headings = [];
  const scopeViolations = [];

  for (const [index, line] of doc.split('\n').entries()) {
    const heading = line.match(HEADING);
    if (heading) {
      const level = heading[1].length;
      while (headings.length && headings[headings.length - 1].level >= level) headings.pop();
      headings.push({ level, title: heading[2].trim() });
      continue;
    }

    const row = parseTableRow(line);
    if (!row) continue;

    const title = headings[headings.length - 1]?.title ?? '<root>';
    const path = headings.map(item => item.title);
    const pathKey = path.map(normalizeKey).join('');
    const titleKey = normalizeKey(title);
    let section = sections.find(item => item.pathKey === pathKey);
    if (!section) {
      section = { title, path, pathKey, titleKey, methods: new Set() };
      sections.push(section);
    }
    for (const method of row.methods) section.methods.add(method);

    if (!SCOPE_CELL.test(row.scopeCell)) {
      scopeViolations.push({
        key: `scope-cell:${index + 1}`,
        message: `oauth-scopes.md:${index + 1} scope cell contains prose - keep only scope identifiers, move notes to method JSDoc: ${row.scopeCell}`,
      });
    }
  }

  return { sections, scopeViolations };
}

function findSection(prefix, sections) {
  const prefixKey = normalizeKey(prefix);
  const prefixPathKey = prefix.split('.').map(normalizeKey).join('');
  const aliasKeys = SERVICE_SECTION_ALIASES.get(prefixKey) ?? [];
  const candidateKeys = [prefixPathKey, ...aliasKeys];

  for (const key of candidateKeys) {
    const exactPath = sections.filter(section => section.pathKey === key);
    if (exactPath.length === 1) return exactPath[0];
  }

  for (const key of candidateKeys) {
    const exactTitle = sections.filter(section => section.titleKey === key);
    if (exactTitle.length === 1) return exactTitle[0];
  }

  for (const key of candidateKeys) {
    const suffix = sections.filter(section => section.pathKey.endsWith(key) || section.titleKey.endsWith(key));
    if (suffix.length === 1) return suffix[0];
  }

  return undefined;
}

const tracked = collectTrackedMethods();
const { sections, scopeViolations } = collectDocumentedSections();
const violations = [...scopeViolations];

for (const method of tracked) {
  if (method.internal) continue;
  const section = findSection(method.prefix, sections);
  if (!section) {
    violations.push({
      key: `${method.label}:no-scope-section`,
      message: `${method.label} has no matching section in docs/oauth-scopes.md`,
    });
  } else if (!section.methods.has(method.method)) {
    violations.push({
      key: `${method.label}:no-scope-row`,
      message: `${method.method}() (${method.label}) is not documented under ${section.path.join(' > ')} in docs/oauth-scopes.md`,
    });
  }
}

if (violations.length) {
  console.error(`check-oauth-scopes: ${violations.length} violation(s):`);
  for (const violation of violations) {
    console.error(`  ${violation.key}: ${violation.message}`);
  }
  process.exit(1);
}

console.log(`check-oauth-scopes: OK (${tracked.length} tracked methods, ${sections.length} docs sections)`);
