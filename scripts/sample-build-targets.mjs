#!/usr/bin/env node
// Prints the sample projects (dirs under samples/ with a committed package.json)
// to build, as a JSON array for the samples-build.yml matrix.
//
//   node scripts/sample-build-targets.mjs --changed origin/main   # changed projects only
//   node scripts/sample-build-targets.mjs --all                   # every project
import { execFileSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// Changing the build setup rebuilds every sample.
export const REBUILD_ALL_FILES = ['.github/workflows/samples-build.yml', 'scripts/sample-build-targets.mjs'];

// Selects every project containing a changed file, parents included: a parent
// may compile a nested project's files (functions-app → coded-functions).
export function buildTargets(projectDirs, changedFiles) {
  if (changedFiles.some(f => REBUILD_ALL_FILES.includes(f))) return [...projectDirs].sort();
  return projectDirs.filter(dir => changedFiles.some(f => f.startsWith(`${dir}/`))).sort();
}

function git(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean);
}

function run() {
  const projectDirs = git(['ls-files', 'samples']).filter(f => f.endsWith('/package.json')).map(dirname);
  if (process.argv.includes('--all')) {
    console.log(JSON.stringify([...projectDirs].sort()));
    return;
  }
  const changedIdx = process.argv.indexOf('--changed');
  const baseRef = (changedIdx !== -1 && process.argv[changedIdx + 1]) || 'origin/main';
  console.log(JSON.stringify(buildTargets(projectDirs, git(['diff', '--name-only', `${baseRef}...HEAD`]))));
}

// Run only when executed directly, not when imported by tests.
if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run();
}
