import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { walkTsFiles } from './workspace.mjs';

const JSDOC_START = /^\s*\/\*\*\s?/;
const JSDOC_END = /\s*\*\/\s*$/;
const JSDOC_LINE_PREFIX = /^\s*\*?\s?/;
const TRAILING_WHITESPACE = /\s+$/;
const REPEATED_BLANK_LINES = /\n{2,}/g;

export function parseTypeScriptFile(file) {
  const content = readFileSync(file, 'utf8');
  return ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
}

export function findDescendants(sourceFile, predicate) {
  const nodes = [];
  const visit = node => {
    if (predicate(node)) nodes.push(node);
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return nodes;
}

export function getDeclarationName(node) {
  if (!node.name) return undefined;
  if (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name) || ts.isNumericLiteral(node.name)) {
    return node.name.text;
  }
  return undefined;
}

export function normalizeJsdocText(raw) {
  return raw
    .replace(JSDOC_START, '')
    .replace(JSDOC_END, '')
    .split('\n')
    .map(line => line.replace(JSDOC_LINE_PREFIX, '').replace(TRAILING_WHITESPACE, ''))
    .join('\n')
    .replace(REPEATED_BLANK_LINES, '\n')
    .trim();
}

export function getJsdocText(node, sourceFile) {
  const docs = node.jsDoc;
  if (!docs?.length) return undefined;
  const nearest = docs[docs.length - 1];
  return normalizeJsdocText(sourceFile.text.slice(nearest.pos, nearest.end));
}

export function hasJsdocTag(node, tagNames) {
  const wanted = new Set(tagNames);
  return ts.getJSDocTags(node).some(tag => wanted.has(tag.tagName.text));
}

export function getDecoratorStringArgument(node, decoratorName) {
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

export function getImplementedInterfaces(classNode) {
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

export { walkTsFiles };
export { ts };
