/**
 * Completeness gate for release-metadata.json.
 *
 * Enforces that release-metadata.json stays in sync with the public API surface:
 * every public service class exported from a public subpath MUST have an entry.
 * Run in CI on a FRESH build (never a stale local dist) — see .github/workflows/ci.yml.
 *
 *   node scripts/check-release-metadata.mjs
 *
 * v1 scope: service-class + subpath + snapshotVersion. Method-level and non-class
 * exports (e.g. the document-understanding DuFramework namespace) are follow-ups.
 *
 * Contract (see release-metadata.md):
 *   - keys are PUBLIC export names (e.g. `Agents`, not `AgentService`)
 *   - `since` value = version introduced; `null` = baseline (pre-tracking, not backfilled)
 *   - method / enum-member value = bare version string; unlisted methods inherit the service `since`
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');

const fail = [];
const warn = [];

// ── load inputs ───────────────────────────────────────────────────────────────
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
const metaPath = join(ROOT, 'release-metadata.json');
if (!existsSync(metaPath)) {
  console.error('FAIL: release-metadata.json not found at repo root.');
  process.exit(1);
}
const meta = JSON.parse(readFileSync(metaPath, 'utf8'));
const listed = new Set(Object.keys(meta.services ?? {}));

if (!existsSync(DIST)) {
  console.error('FAIL: dist/ not found. Run `npm run build` before the check (CI builds first).');
  process.exit(1);
}

// ── enumerate the public service surface from built subpath barrels ─────────────
// Public subpaths come from package.json `exports` (authoritative), minus root + core.
const PKG_NAME = pkg.name; // @uipath/uipath-typescript
const subpaths = Object.keys(pkg.exports ?? {})
  .filter((k) => k !== '.' && k !== './core')
  .map((k) => k.replace(/^\.\//, '')); // "./agents" -> "agents"

const surface = new Map(); // publicName -> subpath ("@uipath/uipath-typescript/agents")
for (const sub of subpaths) {
  const dts = join(DIST, sub, 'index.d.ts');
  if (!existsSync(dts)) {
    warn.push(`subpath "${sub}" in package.json exports has no dist/${sub}/index.d.ts (build gap?)`);
    continue;
  }
  const src = readFileSync(dts, 'utf8');
  // Public service classes are re-exported as `SomethingService as PublicName`.
  const re = /([A-Za-z0-9_]+Service)\s+as\s+([A-Za-z0-9_]+)/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    surface.set(m[2], `${PKG_NAME}/${sub}`);
  }
}

// ── 1. every public service must be listed ──────────────────────────────────────
for (const [name, subpath] of surface) {
  if (!listed.has(name)) {
    fail.push(
      `MISSING: public service "${name}" (${subpath}) is not in release-metadata.json.\n` +
        `         Add it — new service → { "subpath": "${subpath}", "since": "${pkg.version}" }; ` +
        `pre-existing → "since": null.`
    );
  }
}

// ── 2. orphan entries (in metadata, not in the public surface) ──────────────────
// Removals "never happen" — flag for human review, never auto-drop a `since` fact.
for (const name of listed) {
  if (!surface.has(name)) {
    warn.push(
      `ORPHAN: "${name}" is in release-metadata.json but not found as a public *Service export. ` +
        `Confirm it was intentionally removed (rare) before deleting the entry.`
    );
  }
}

// ── 3. snapshotVersion must match the package version ───────────────────────────
if (meta.snapshotVersion !== pkg.version) {
  fail.push(
    `SNAPSHOT: snapshotVersion "${meta.snapshotVersion}" != package.json version "${pkg.version}". ` +
      `Update snapshotVersion (and stamp any new capabilities with "${pkg.version}").`
  );
}

// ── report ──────────────────────────────────────────────────────────────────────
console.log(
  `release-metadata check — ${surface.size} public services on surface, ` +
    `${listed.size} listed, snapshot ${meta.snapshotVersion} (pkg ${pkg.version})`
);
for (const w of warn) console.warn('WARN  ' + w);
if (fail.length) {
  for (const f of fail) console.error('FAIL  ' + f);
  console.error(`\n${fail.length} error(s). release-metadata.json is out of sync with the public API.`);
  process.exit(1);
}
console.log('OK — release-metadata.json covers every public service.');
