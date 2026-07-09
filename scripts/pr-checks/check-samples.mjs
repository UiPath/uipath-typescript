import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { relativeTo, relativeToRoot, repoPath, ROOT } from './workspace.mjs';

const SAMPLES = repoPath('samples');
const CONFIG_KEYS = ['clientId', 'scope', 'orgName', 'tenantName', 'baseUrl', 'redirectUri'];
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MEDIA_REFERENCE = /!\[[^\]]*\]\(|<img\b|<video\b|\.(gif|mp4|webm)\b/i;
const README_PATH_REFERENCE = /`((?:\.\/)?(?:src|public)\/[\w./-]+\.\w+)`/g;
const KEBAB_CASE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const GITIGNORE_REQUIRED = ['node_modules', 'dist', '.env', '.uipath'];

const tracked = new Set(
  execFileSync('git', ['ls-files', '-z', 'samples'], { cwd: ROOT }).toString().split('\0').filter(Boolean)
);

function findApps(dir) {
  if (!existsSync(dir)) return [];

  const apps = [];
  for (const entry of readdirSync(dir)) {
    const appPath = join(dir, entry);
    let stat;
    try {
      stat = statSync(appPath);
    } catch {
      continue;
    }
    if (!stat.isDirectory() || entry === 'node_modules') continue;
    if (existsSync(join(appPath, 'package.json'))) {
      apps.push(appPath);
    } else {
      apps.push(...findApps(appPath));
    }
  }
  return apps;
}

const violations = [];
function violate(app, check, message) {
  violations.push({ key: `${relativeTo(SAMPLES, app)}:${check}`, message });
}

function readJsonFile(path, app, check, displayName) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    violate(app, check, `${displayName} is not valid JSON`);
    return undefined;
  }
}

const apps = findApps(SAMPLES);
const packageNames = new Map();

for (const app of apps) {
  const name = relativeTo(SAMPLES, app);

  for (const segment of name.split('/')) {
    if (!KEBAB_CASE.test(segment)) {
      violate(app, 'dir-not-kebab', `directory segment "${segment}" is not kebab-case`);
    }
  }

  const readmePath = join(app, 'README.md');
  if (!existsSync(readmePath)) {
    violate(app, 'readme-missing', 'README.md is missing');
  } else {
    const readme = readFileSync(readmePath, 'utf8');
    if (!MEDIA_REFERENCE.test(readme)) {
      violate(app, 'readme-no-media', 'README.md has no screenshot/GIF/video reference');
    }
    for (const match of readme.matchAll(README_PATH_REFERENCE)) {
      if (!existsSync(join(app, match[1]))) {
        violate(app, 'readme-broken-path', `README references "${match[1]}" which does not exist`);
      }
    }
  }

  const hasExample = existsSync(join(app, 'uipath.json.example'));
  const trackedUipathJson = tracked.has(relativeToRoot(join(app, 'uipath.json')));
  if (!hasExample && !trackedUipathJson) {
    const wrongName = ['uipath.example.json', '.env.example'].find(file => existsSync(join(app, file)));
    violate(app, 'example-config-missing',
      wrongName
        ? `example config is named "${wrongName}" - canonical name is uipath.json.example`
        : 'no uipath.json.example (or tracked placeholder uipath.json) found');
  }

  for (const file of ['uipath.json', 'uipath.json.example', 'uipath.example.json']) {
    const configPath = join(app, file);
    if (!existsSync(configPath) || (file === 'uipath.json' && !tracked.has(relativeToRoot(configPath)))) continue;

    const config = readJsonFile(configPath, app, 'config-invalid-json', file);
    if (!config) continue;

    const extra = Object.keys(config).filter(key => !CONFIG_KEYS.includes(key));
    if (extra.length) {
      violate(app, 'config-invalid-keys', `${file} has unsupported keys: ${extra.join(', ')} (allowed: ${CONFIG_KEYS.join(', ')})`);
    }
    if (typeof config.clientId === 'string' && GUID.test(config.clientId)) {
      violate(app, 'config-real-client-id', `${file} contains a real clientId GUID - use "" or a <placeholder>`);
    }
  }

  if (tracked.has(relativeToRoot(join(app, '.env')))) {
    violate(app, 'env-tracked', '.env is committed - remove it and gitignore it');
  }

  const gitignorePath = join(app, '.gitignore');
  if (!existsSync(gitignorePath)) {
    violate(app, 'gitignore-missing', '.gitignore is missing');
  } else {
    const gitignore = readFileSync(gitignorePath, 'utf8');
    const required = [...GITIGNORE_REQUIRED, ...(hasExample ? ['uipath.json'] : [])];
    const missing = required.filter(entry => !gitignore.includes(entry));
    if (missing.length) {
      violate(app, 'gitignore-incomplete', `.gitignore missing entries: ${missing.join(', ')}`);
    }
  }

  const packagePath = join(app, 'package.json');
  const pkg = readJsonFile(packagePath, app, 'package-invalid-json', 'package.json');
  if (!pkg) continue;

  if (!pkg.scripts?.lint) {
    violate(app, 'lint-script-missing', 'package.json has no "lint" script');
  }
  if (packageNames.has(pkg.name)) {
    violate(app, 'name-duplicate', `package name "${pkg.name}" is also used by ${packageNames.get(pkg.name)}`);
  }
  packageNames.set(pkg.name, name);

  const lockPath = join(app, 'package-lock.json');
  if (!existsSync(lockPath)) continue;

  const lock = readJsonFile(lockPath, app, 'lockfile-drift', 'package-lock.json');
  const lockRoot = lock?.packages?.[''];
  if (!lockRoot) continue;

  for (const field of ['dependencies', 'devDependencies']) {
    for (const [dep, range] of Object.entries(pkg[field] ?? {})) {
      const lockRange = lockRoot[field]?.[dep];
      if (lockRange !== range) {
        violate(app, 'lockfile-drift', `${field}.${dep} is "${range}" in package.json but "${lockRange ?? 'absent'}" in package-lock.json - run npm install`);
      }
    }
  }
}

if (violations.length) {
  console.error(`check-samples: ${violations.length} violation(s):`);
  for (const violation of violations) {
    console.error(`  ${violation.key}: ${violation.message}`);
  }
  process.exit(1);
}

console.log(`check-samples: OK (${apps.length} apps)`);
