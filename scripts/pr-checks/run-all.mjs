import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = dirname(fileURLToPath(import.meta.url));
const CHECK_SCRIPTS = ['check-samples.mjs', 'check-jsdoc-consistency.mjs', 'check-oauth-scopes.mjs', 'check-hygiene.mjs'];
const extraArgs = process.argv.slice(2);

let failed = false;
for (const script of CHECK_SCRIPTS) {
  console.log(`\n--- ${script} ---`);
  const result = spawnSync(process.execPath, [join(DIR, script), ...extraArgs], { stdio: 'inherit' });
  if (result.status !== 0) failed = true;
}
process.exit(failed ? 1 : 0);
