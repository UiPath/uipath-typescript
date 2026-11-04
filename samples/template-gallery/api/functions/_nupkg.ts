// Builds a coded app .nupkg in memory from a template's built files, the way `uip codedapp pack`
// does through @uipath/packager-tool-webapp + packager-core's NugetPackager: OPC wrapper
// ([Content_Types].xml, _rels/.rels, core-properties), the .nuspec, and content/ holding the
// bundle plus the metadata files the platform expects (operate.json, entry-points.json,
// bindings*.json, package-descriptor.json, uipath.json).

import { zipSync } from 'fflate';

export interface NupkgInput {
  packageName: string; // nuspec id, lowercase slug
  version: string; // semver
  title: string;
  description?: string;
  /** Built files, paths relative to the bundle root (index.html, assets/...). */
  bundle: Map<string, Uint8Array>;
  /** The template's uipath.json (scope, template lineage), copied into content/. */
  uipathJson?: Uint8Array;
}

const enc = new TextEncoder();
const xmlEscape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const hex = (n: number) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => b.toString(16).padStart(2, '0')).join('');

export function buildNupkg(input: NupkgInput): Uint8Array {
  const { packageName, version, title } = input;
  const description = input.description ?? 'Created by UiPath';
  const files: Record<string, Uint8Array> = {};

  // content/: the bundle as is
  for (const [path, bytes] of input.bundle) files[`content/${path}`] = bytes;

  const mainFile = input.bundle.has('index.html') ? 'index.html' : [...input.bundle.keys()].find((p) => p.endsWith('.html')) ?? 'index.html';

  files['content/operate.json'] = enc.encode(
    JSON.stringify(
      {
        projectId: crypto.randomUUID(),
        main: mainFile,
        contentType: 'WebApp',
        targetFramework: 'Portable',
        targetRuntime: 'Coded',
        runtimeOptions: { requiresUserInteraction: false, isAttended: false },
      },
      null,
      2,
    ),
  );
  files['content/bindings.json'] = enc.encode(JSON.stringify({ version: '1.0', resources: [] }, null, 2));
  files['content/bindings_v2.json'] = enc.encode(JSON.stringify({ version: '2.0', resources: [] }, null, 2));
  files['content/entry-points.json'] = enc.encode(
    JSON.stringify(
      {
        $schema: 'https://cloud.uipath.com/draft/2024-12/entry-point',
        $id: 'entry-points-doc-001',
        entryPoints: [
          {
            filePath: mainFile,
            uniqueId: hex(16),
            type: 'api',
            input: { amount: { type: 'integer' }, id: { type: 'string' } },
            output: { status: { type: 'string' } },
          },
        ],
      },
      null,
      2,
    ),
  );
  files['content/package-descriptor.json'] = enc.encode(
    JSON.stringify(
      {
        $schema: 'https://cloud.uipath.com/draft/2024-12/package-descriptor',
        files: {
          'operate.json': 'content/operate.json',
          'entry-points.json': 'content/entry-points.json',
          'bindings.json': 'content/bindings_v2.json',
        },
      },
      null,
      2,
    ),
  );
  files['content/webAppManifest.json'] = enc.encode(
    JSON.stringify({ type: 'Coded', solutionResourceSubType: 'Coded', config: { isCompiled: true, isActionApp: false } }, null, 2),
  );
  if (input.uipathJson) files['content/uipath.json'] = input.uipathJson;

  // OPC wrapper + nuspec, same shape as packager-core
  const nuspecName = `${packageName}.nuspec`;
  const psmdcpPath = `package/services/metadata/core-properties/${hex(16)}.psmdcp`;
  files['[Content_Types].xml'] = enc.encode(
    `<?xml version="1.0" encoding="utf-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml" />
  <Default Extension="psmdcp" ContentType="application/vnd.openxmlformats-package.core-properties+xml" />
  <Default Extension="json" ContentType="application/octet" />
  <Default Extension="nuspec" ContentType="application/octet" />
</Types>`,
  );
  files['_rels/.rels'] = enc.encode(
    `<?xml version="1.0" encoding="utf-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Type="http://schemas.microsoft.com/packaging/2010/07/manifest" Target="/${nuspecName}" Id="R${hex(8)}" />
  <Relationship Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="/${psmdcpPath}" Id="R${hex(8)}" />
</Relationships>`,
  );
  files[psmdcpPath] = enc.encode(
    `<?xml version="1.0" encoding="utf-8"?>
<coreProperties xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://schemas.openxmlformats.org/package/2006/metadata/core-properties">
  <dc:creator>UiPath</dc:creator>
  <dc:description>${xmlEscape(description)}</dc:description>
  <dc:identifier>${xmlEscape(packageName)}</dc:identifier>
  <version>${xmlEscape(version)}</version>
  <keywords></keywords>
  <lastModifiedBy>NuGet.Packaging, Version=6.12.1.1, Culture=neutral, PublicKeyToken=31bf3856ad364e35;.NET 5.0</lastModifiedBy>
</coreProperties>`,
  );
  files[nuspecName] = enc.encode(
    `﻿<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://schemas.microsoft.com/packaging/2010/07/nuspec.xsd">
  <metadata>
    <id>${xmlEscape(packageName)}</id>
    <version>${xmlEscape(version)}</version>
    <title>${xmlEscape(title)}</title>
    <authors>UiPath</authors>
    <requireLicenseAcceptance>false</requireLicenseAcceptance>
    <description>${xmlEscape(description)}</description>
    <releaseNotes></releaseNotes>
    <tags>uipath automation WebApp</tags>
  </metadata>
</package>
`,
  );

  return zipSync(files);
}

/** Same rule as the CLI's sanitizeAppName: lowercase, spaces and underscores to hyphens, nothing else. */
export function sanitizePackageName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}
