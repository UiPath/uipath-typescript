import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';

export function walkTsFiles(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (entry === 'node_modules' || entry === 'dist') continue;
    let stat;
    try {
      stat = statSync(p);
    } catch {
      continue;
    }
    if (stat.isDirectory()) walkTsFiles(p, out);
    else if (p.endsWith('.ts')) out.push(p);
  }
  return out;
}

export function parseSourceFile(file) {
  const content = readFileSync(file, 'utf8');
  return ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
}

export function findNodes(sourceFile, predicate) {
  const nodes = [];
  const visit = node => {
    if (predicate(node)) nodes.push(node);
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return nodes;
}

export function getNodeName(node) {
  if (!node.name) return undefined;
  if (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name) || ts.isNumericLiteral(node.name)) {
    return node.name.text;
  }
  return undefined;
}

export function normalizeJsdoc(raw) {
  return raw
    .replace(/^\s*\/\*\*\s?/, '')
    .replace(/\s*\*\/\s*$/, '')
    .split('\n')
    .map(line => line.replace(/^\s*\*?\s?/, '').replace(/\s+$/, ''))
    .join('\n')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

export function getJsdoc(node, sourceFile) {
  const docs = node.jsDoc;
  if (!docs?.length) return undefined;
  const nearest = docs[docs.length - 1];
  return normalizeJsdoc(sourceFile.text.slice(nearest.pos, nearest.end));
}

export function hasJsdocTag(node, tagNames) {
  const wanted = new Set(tagNames);
  return ts.getJSDocTags(node).some(tag => wanted.has(tag.tagName.text));
}

export function getStringDecoratorArgument(node, decoratorName) {
  const decorators = ts.canHaveDecorators(node) ? ts.getDecorators(node) ?? [] : [];
  for (const decorator of decorators) {
    const expression = decorator.expression;
    if (!ts.isCallExpression(expression)) continue;
    if (!ts.isIdentifier(expression.expression) || expression.expression.text !== decoratorName) continue;
    const [firstArg] = expression.arguments;
    if (firstArg && ts.isStringLiteralLike(firstArg)) return firstArg.text;
  }
  return undefined;
}

export function getImplementedInterfaceNames(classNode) {
  const names = [];
  for (const clause of classNode.heritageClauses ?? []) {
    if (clause.token !== ts.SyntaxKind.ImplementsKeyword) continue;
    for (const type of clause.types) {
      const expression = type.expression;
      if (ts.isIdentifier(expression)) names.push(expression.text);
    }
  }
  return names;
}

export { ts };
