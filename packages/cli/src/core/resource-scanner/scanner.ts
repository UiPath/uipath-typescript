import {
  Project,
  Node,
  SyntaxKind,
  type SourceFile,
  type CallExpression,
  type Identifier,
  type ObjectLiteralExpression,
} from 'ts-morph';
import type { DetectedResource, ResourceMethodMetadata, ScanResult, ScanWarning } from './types.js';
import { getResourceKey } from './types.js';

function getLine(node: Node): number {
  return node.getSourceFile().getLineAndColumnAtPos(node.getStart()).line;
}

function resolveCallToSDKMethod(
  _sourceFile: SourceFile,
  call: CallExpression,
  registry: Map<string, ResourceMethodMetadata>,
): { className: string; methodName: string } | null {
  const expr = call.getExpression();
  if (expr.getKind() === SyntaxKind.PropertyAccessExpression) {
    const prop = expr.asKind(SyntaxKind.PropertyAccessExpression);
    if (!prop) return null;
    const name = prop.getName();
    const left = prop.getExpression();
    const type = left.getType();
    const symbol = type.getSymbol();
    const typeName = symbol?.getName() ?? type.getAliasSymbol()?.getName();
    if (typeName) {
      const key = `${typeName}.${name}`;
      if (registry.has(key)) return { className: typeName, methodName: name };
    }
    if (left.getKind() === SyntaxKind.Identifier) {
      const id = left as Identifier;
      const def = id.getDefinitions()[0];
      if (def?.getDeclarationNode()) {
        const decl = def.getDeclarationNode();
        if (!decl) return null;
        const typeOfNew = decl.getFirstChildByKind(SyntaxKind.NewExpression)
          ?.getTypeArguments()[0]?.getText()
          ?? (decl as any).type?.getText?.();
        if (typeOfNew) {
          const key = `${typeOfNew}.${name}`;
          if (registry.has(key)) return { className: typeOfNew, methodName: name };
        }
      }
    }
  }
  return null;
}

function extractLiteralValue(node: Node): string | number | undefined {
  const k = node.getKind();
  if (k === SyntaxKind.StringLiteral) return (node as any).getLiteralValue?.() ?? (node as any).getText().slice(1, -1);
  if (k === SyntaxKind.NumericLiteral) return Number((node as any).getLiteralValue?.() ?? (node as any).getText());
  return undefined;
}

function extractObjectProperty(obj: ObjectLiteralExpression, key: string): string | undefined {
  const prop = obj.getProperty(key);
  if (!prop || !Node.isPropertyAssignment(prop)) return undefined;
  const init = prop.getInitializer();
  if (!init) return undefined;
  const v = extractLiteralValue(init);
  return v !== undefined ? String(v) : undefined;
}

function extractResource(
  sourceFile: SourceFile,
  call: CallExpression,
  meta: ResourceMethodMetadata,
): DetectedResource | null {
  const args = call.getArguments();
  const filePath = sourceFile.getFilePath();
  const line = getLine(call);

  let name: string | undefined;
  let id: string | undefined;
  let folder: string | undefined;

  const byIndex = (param: string, index: number): string | undefined => {
    const arg = args[index];
    if (!arg) return undefined;
    if (arg.getKind() === SyntaxKind.ObjectLiteralExpression) {
      const obj = arg.asKind(SyntaxKind.ObjectLiteralExpression)!;
      return extractObjectProperty(obj, param) ?? extractObjectProperty(obj, 'key') ?? extractObjectProperty(obj, 'name');
    }
    const v = extractLiteralValue(arg);
    return v !== undefined ? String(v) : undefined;
  };

  if (meta.nameParam !== undefined && meta.nameParamIndex !== undefined) {
    name = byIndex(meta.nameParam, meta.nameParamIndex) ?? byIndex('name', meta.nameParamIndex);
  }
  if (meta.idParam !== undefined && meta.idParamIndex !== undefined) {
    id = byIndex(meta.idParam, meta.idParamIndex) ?? byIndex('id', meta.idParamIndex);
  }
  if (meta.folderParam !== undefined && meta.folderParamIndex !== undefined) {
    folder = byIndex(meta.folderParam, meta.folderParamIndex) ?? byIndex('folderPath', meta.folderParamIndex);
  }
  if (meta.folderIdParam !== undefined && meta.folderIdParamIndex !== undefined) {
    const fid = byIndex(meta.folderIdParam, meta.folderIdParamIndex);
    if (fid) folder = fid;
  }

  const resource: DetectedResource = {
    resource: meta.resource,
    sourceFile: filePath,
    line,
  };
  if (name !== undefined) resource.name = name;
  if (id !== undefined) resource.id = id;
  if (folder !== undefined) resource.folder = folder;

  if (resource.name ?? resource.id) return resource;
  return null;
}

function deduplicateResources(list: DetectedResource[]): DetectedResource[] {
  const seen = new Set<string>();
  return list.filter((r) => {
    const key = getResourceKey(r);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function scanProject(
  tsconfigPath: string,
  registry: Map<string, ResourceMethodMetadata>,
): Promise<ScanResult> {
  const project = new Project({ tsConfigFilePath: tsconfigPath });
  const resources: DetectedResource[] = [];
  const warnings: ScanWarning[] = [];

  const sourceFiles = project.getSourceFiles();
  for (const sourceFile of sourceFiles) {
    const path = sourceFile.getFilePath();
    if (path.includes('node_modules')) continue;
    sourceFile.forEachDescendant((node) => {
      if (!Node.isCallExpression(node)) return;
      const call = node as CallExpression;
      const resolved = resolveCallToSDKMethod(sourceFile, call, registry);
      if (!resolved) return;
      const meta = registry.get(`${resolved.className}.${resolved.methodName}`);
      if (!meta) return;
      const detected = extractResource(sourceFile, call, meta);
      if (detected) resources.push(detected);
    });
  }

  return {
    resources: deduplicateResources(resources),
    warnings,
  };
}
