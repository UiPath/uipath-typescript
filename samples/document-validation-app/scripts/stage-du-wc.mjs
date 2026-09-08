#!/usr/bin/env node
// Stages the Validation Station web component into `public/du-vs-wc`, where Vite serves it
// verbatim in dev and copies it to `dist/du-vs-wc` on build. `configureValidationStationWc()`
// in src/main.tsx then loads it from `<app base>/du-vs-wc` at runtime.
//
// It is staged as a static asset rather than imported so it stays out of Vite's module graph:
// files under `public/` are passed through untouched, which is what these prebuilt Angular
// bundles need.
import { cp, readFile, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const manifest = require.resolve('@uipath/du-validation-station-wc/package.json');
const wcRoot = dirname(manifest);
const destination = resolve(appRoot, 'public/du-vs-wc');
// Records the staged version so a repeat `npm run dev` doesn't re-copy tens of megabytes.
const stamp = resolve(destination, '.version');

const { version } = JSON.parse(await readFile(manifest, 'utf8'));

if ((await readFile(stamp, 'utf8').catch(() => null)) === version) {
  console.log(`du-vs-wc ${version} already staged in public/du-vs-wc.`);
  process.exit(0);
}

// Full replace rather than merge: a version bump renames the hashed chunks, and leaving the
// old ones behind would grow the directory on every upgrade.
await rm(destination, { recursive: true, force: true });
// The whole package, `fonts.css` and its 40+ MB of fonts included: nothing else on the page
// declares the Apollo or Material Icons faces, so dropping them leaves the widget's icons
// blank.
await cp(wcRoot, destination, { recursive: true });
await writeFile(stamp, version);

console.log(`Staged du-vs-wc ${version} -> public/du-vs-wc.`);
