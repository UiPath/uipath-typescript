// Runs every PR check and reports all failures (doesn't stop at the first).
// Usage: node scripts/pr-checks/run-all.mjs [--update-baseline]
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = dirname(fileURLToPath(import.meta.url));
const SCRIPTS = ['validate-samples.mjs', 'check-jsdoc-sync.mjs', 'check-docs-consistency.mjs', 'check-hygiene.mjs'];
const extraArgs = process.argv.slice(2);

let failed = false;
for (const script of SCRIPTS) {
  console.log(`\n--- ${script} ---`);
  const result = spawnSync(process.execPath, [join(DIR, script), ...extraArgs], { stdio: 'inherit' });
  if (result.status !== 0) failed = true;
}
process.exit(failed ? 1 : 0);
