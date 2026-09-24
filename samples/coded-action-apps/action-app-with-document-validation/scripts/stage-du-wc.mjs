#!/usr/bin/env node
// Stages the Validation Station web component into `public/du-vs-wc`, where Vite serves it
// verbatim in dev and copies it to `dist/du-vs-wc` on build. `configureValidationStationWc()`
// in src/main.tsx then loads it from `<app base>/du-vs-wc` at runtime.
//
// It is staged as a static asset rather than imported so it stays out of Vite's module graph:
// files under `public/` are passed through untouched, which is what these prebuilt Angular
// bundles need.
import { access, cp, readFile, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const manifest = require.resolve('@uipath/du-validation-station-wc/package.json');
const wcRoot = dirname(manifest);
const destination = resolve(appRoot, 'public/du-vs-wc');
// Records the staged version so a repeat `npm run dev` doesn't re-copy tens of megabytes.
const stamp = resolve(destination, '.version');

// npm packaging metadata, plus the web component's own demo page. None of it is served.
// `fonts.css` and its 40+ MB of fonts stay: nothing else on the page declares the Apollo or
// Material Icons faces, so dropping them leaves the widget's icons blank.
const NOT_DEPLOYED = new Set([
  'package.json',
  'README.md',
  'CHANGELOG.md',
  'LICENSE',
  'types.d.ts',
  'index.html',
]);

// What `configureValidationStationWc()` requests. A partial copy is otherwise invisible
// until the app 404s at runtime.
const REQUIRED = ['main.js', 'polyfills.js', 'styles.css', 'fonts.css', 'du-assets'];

const { version } = JSON.parse(await readFile(manifest, 'utf8'));

if ((await readFile(stamp, 'utf8').catch(() => null)) === version) {
  console.log(`du-vs-wc ${version} already staged in public/du-vs-wc.`);
  process.exit(0);
}

// Full replace rather than merge: a version bump renames the hashed chunks, and leaving the
// old ones behind would grow the directory on every upgrade.
await rm(destination, { recursive: true, force: true });
await cp(wcRoot, destination, {
  recursive: true,
  filter: (src) => !NOT_DEPLOYED.has(relative(wcRoot, src)),
});

const missing = [];
for (const entry of REQUIRED) {
  await access(resolve(destination, entry)).catch(() => missing.push(entry));
}
if (missing.length > 0) {
  throw new Error(
    `du-vs-wc staged incompletely - missing ${missing.join(', ')} in public/du-vs-wc.`,
  );
}

// Written last, so an interrupted copy leaves no stamp and the next run retries.
await writeFile(stamp, version);

console.log(`Staged du-vs-wc ${version} -> public/du-vs-wc.`);
