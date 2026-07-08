// PR gate: structural checks for samples/ derived from recurring review feedback.
// Violations listed in samples-baseline.json are grandfathered (reported as warnings).
// Regenerate the baseline after intentional fixes: node scripts/pr-checks/validate-samples.mjs --update-baseline
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SAMPLES = join(ROOT, 'samples');
const BASELINE_PATH = join(dirname(fileURLToPath(import.meta.url)), 'samples-baseline.json');
const UPDATE = process.argv.includes('--update-baseline');

const CONFIG_KEYS = ['clientId', 'scope', 'orgName', 'tenantName', 'baseUrl', 'redirectUri'];
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MEDIA = /!\[[^\]]*\]\(|<img\b|<video\b|\.(gif|mp4|webm)\b/i;
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const GITIGNORE_REQUIRED = ['node_modules', 'dist', '.env', '.uipath'];

const tracked = new Set(
  execFileSync('git', ['ls-files', '-z', 'samples'], { cwd: ROOT }).toString().split('\0').filter(Boolean)
);

function findApps(dir) {
  const apps = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (!statSync(p).isDirectory() || entry === 'node_modules') continue;
    if (existsSync(join(p, 'package.json'))) apps.push(p);
    else apps.push(...findApps(p));
  }
  return apps;
}

const violations = []; // { key: 'app:check', message }
function violate(app, check, message) {
  violations.push({ key: `${relative(SAMPLES, app)}:${check}`, message });
}

const apps = findApps(SAMPLES);
const packageNames = new Map();

for (const app of apps) {
  const name = relative(SAMPLES, app);

  // dir naming
  for (const seg of name.split('/')) {
    if (!KEBAB.test(seg)) violate(app, 'dir-not-kebab', `directory segment "${seg}" is not kebab-case`);
  }

  // README
  const readmePath = join(app, 'README.md');
  if (!existsSync(readmePath)) {
    violate(app, 'readme-missing', 'README.md is missing');
  } else {
    const readme = readFileSync(readmePath, 'utf8');
    if (!MEDIA.test(readme)) {
      violate(app, 'readme-no-media', 'README.md has no screenshot/GIF/video reference');
    }
    // every backticked src/ path mentioned in the README must exist
    for (const m of readme.matchAll(/`((?:\.\/)?(?:src|public)\/[\w./-]+\.\w+)`/g)) {
      if (!existsSync(join(app, m[1]))) {
        violate(app, 'readme-broken-path', `README references "${m[1]}" which does not exist`);
      }
    }
  }

  // example config: canonical name is uipath.json.example; a tracked uipath.json
  // with a placeholder clientId (action-app templates) also satisfies this
  const hasExample = existsSync(join(app, 'uipath.json.example'));
  const trackedUipathJson = tracked.has(`${relative(ROOT, join(app, 'uipath.json'))}`);
  if (!hasExample && !trackedUipathJson) {
    const wrongName = ['uipath.example.json', '.env.example'].find(f => existsSync(join(app, f)));
    violate(app, 'example-config-missing',
      wrongName
        ? `example config is named "${wrongName}" — canonical name is uipath.json.example`
        : 'no uipath.json.example (or tracked placeholder uipath.json) found');
  }

  // config content: allowed keys only, no real clientId committed
  for (const f of ['uipath.json', 'uipath.json.example', 'uipath.example.json']) {
    const p = join(app, f);
    if (!existsSync(p) || (f === 'uipath.json' && !tracked.has(relative(ROOT, p)))) continue;
    let config;
    try {
      config = JSON.parse(readFileSync(p, 'utf8'));
    } catch {
      violate(app, 'config-invalid-json', `${f} is not valid JSON`);
      continue;
    }
    const extra = Object.keys(config).filter(k => !CONFIG_KEYS.includes(k));
    if (extra.length) violate(app, 'config-invalid-keys', `${f} has unsupported keys: ${extra.join(', ')} (allowed: ${CONFIG_KEYS.join(', ')})`);
    if (typeof config.clientId === 'string' && GUID.test(config.clientId)) {
      violate(app, 'config-real-client-id', `${f} contains a real clientId GUID — use "" or a <placeholder>`);
    }
  }

  // no tracked .env
  if (tracked.has(relative(ROOT, join(app, '.env')))) {
    violate(app, 'env-tracked', '.env is committed — remove it and gitignore it');
  }

  // .gitignore
  const gitignorePath = join(app, '.gitignore');
  if (!existsSync(gitignorePath)) {
    violate(app, 'gitignore-missing', '.gitignore is missing');
  } else {
    const gitignore = readFileSync(gitignorePath, 'utf8');
    const required = [...GITIGNORE_REQUIRED, ...(hasExample ? ['uipath.json'] : [])];
    const missing = required.filter(e => !gitignore.includes(e));
    if (missing.length) violate(app, 'gitignore-incomplete', `.gitignore missing entries: ${missing.join(', ')}`);
  }

  // package.json: lint script + unique name
  const pkg = JSON.parse(readFileSync(join(app, 'package.json'), 'utf8'));
  if (!pkg.scripts?.lint) violate(app, 'lint-script-missing', 'package.json has no "lint" script');
  if (packageNames.has(pkg.name)) {
    violate(app, 'name-duplicate', `package name "${pkg.name}" is also used by ${packageNames.get(pkg.name)}`);
  }
  packageNames.set(pkg.name, name);

  // package-lock.json in sync with package.json (dep ranges match)
  const lockPath = join(app, 'package-lock.json');
  if (existsSync(lockPath)) {
    let lock;
    try {
      lock = JSON.parse(readFileSync(lockPath, 'utf8'));
    } catch {
      violate(app, 'lockfile-drift', 'package-lock.json is not valid JSON');
      lock = null;
    }
    const lockRoot = lock?.packages?.[''];
    if (lockRoot) {
      for (const field of ['dependencies', 'devDependencies']) {
        for (const [dep, range] of Object.entries(pkg[field] ?? {})) {
          const lockRange = lockRoot[field]?.[dep];
          if (lockRange !== range) {
            violate(app, 'lockfile-drift', `${field}.${dep} is "${range}" in package.json but "${lockRange ?? 'absent'}" in package-lock.json — run npm install`);
          }
        }
      }
    }
  }
}

// report against baseline
const baseline = existsSync(BASELINE_PATH) ? new Set(JSON.parse(readFileSync(BASELINE_PATH, 'utf8'))) : new Set();

if (UPDATE) {
  writeFileSync(BASELINE_PATH, JSON.stringify([...new Set(violations.map(v => v.key))].sort(), null, 2) + '\n');
  console.log(`samples baseline updated: ${violations.length} grandfathered violation(s)`);
  process.exit(0);
}

const fresh = violations.filter(v => !baseline.has(v.key));
const grandfathered = violations.filter(v => baseline.has(v.key));

for (const v of grandfathered) console.log(`  (baseline) ${v.key}: ${v.message}`);
if (fresh.length) {
  console.error(`\nvalidate-samples: ${fresh.length} new violation(s):`);
  for (const v of fresh) console.error(`  ${v.key}: ${v.message}`);
  console.error('\nFix these, or if intentional run: node scripts/pr-checks/validate-samples.mjs --update-baseline');
  process.exit(1);
}
console.log(`validate-samples: OK (${apps.length} apps, ${grandfathered.length} grandfathered)`);
