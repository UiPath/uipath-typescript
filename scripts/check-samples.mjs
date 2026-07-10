#!/usr/bin/env node
// PR gate for sample apps under samples/. Discovers every tracked app
// (any directory with a committed package.json) and runs the rules below.
// Rules are pure functions of an app context so they can be unit-tested
// without git/fs — run `node scripts/check-samples.mjs --selftest`.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const MEDIA = /!\[[^\]]*\]\([^)]+\)|<img\b|<video\b|\bhttps?:\/\/[^\s)]+\.(?:gif|mp4|webm|png|jpe?g)\b|\.(?:gif|mp4|webm)\b/i;
const FAVICON = /rel=["'][^"']*icon/i;
const VITE_BASE = /base\s*:\s*["']\.\/["']/;
const CODED_APPS_DEV = /@uipath\/coded-apps-dev/;

// Extract the markdown section under the first heading matching /preview/i,
// up to the next heading of the same or higher level (or EOF).
function previewSection(readme) {
  const lines = readme.split('\n');
  const start = lines.findIndex(l => /^#{1,6}\s+.*preview/i.test(l));
  if (start === -1) return undefined;
  const level = lines[start].match(/^#+/)[0].length;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    const m = lines[i].match(/^(#{1,6})\s+/);
    if (m && m[1].length <= level) { end = i; break; }
  }
  return lines.slice(start + 1, end).join('\n');
}

// ctx: { name, has(file)->bool, read(file)->string|undefined }
const RULES = [
  {
    id: 'example-config',
    desc: 'must have a uipath.json.example',
    check: c => (c.has('uipath.json.example') ? [] : ['missing uipath.json.example']),
  },
  {
    id: 'no-committed-uipath-json',
    desc: 'must not commit uipath.json (only the .example)',
    check: c => (c.has('uipath.json') ? ['uipath.json is committed — remove it and gitignore it'] : []),
  },
  {
    id: 'gitignore',
    desc: 'must have a .gitignore that ignores .uipath',
    check: c => {
      if (!c.has('.gitignore')) return ['missing .gitignore'];
      return c.read('.gitignore').includes('.uipath') ? [] : ['.gitignore does not ignore .uipath'];
    },
  },
  {
    id: 'readme-preview',
    desc: 'README must have a Preview heading with a screenshot/gif/video',
    check: c => {
      if (!c.has('README.md')) return ['missing README.md'];
      const section = previewSection(c.read('README.md'));
      if (section === undefined) return ['README has no "Preview" heading'];
      return MEDIA.test(section) ? [] : ['README Preview section has no image/gif/video'];
    },
  },
  {
    id: 'favicon',
    desc: 'index.html must reference a favicon',
    applies: c => c.has('index.html'),
    check: c => (FAVICON.test(c.read('index.html')) ? [] : ['index.html has no favicon <link rel="icon">']),
  },
  {
    id: 'coded-apps-dev',
    desc: '@uipath/coded-apps-dev must be a devDependency',
    applies: c => c.has('index.html'),
    check: c => {
      const pkg = JSON.parse(c.read('package.json'));
      return pkg.devDependencies?.['@uipath/coded-apps-dev'] ? [] : ['@uipath/coded-apps-dev missing from devDependencies'];
    },
  },
  {
    id: 'vite-config',
    desc: "vite.config must set base: './' and import @uipath/coded-apps-dev",
    applies: c => c.viteConfig !== undefined,
    check: c => {
      const src = c.read(c.viteConfig);
      const out = [];
      if (!VITE_BASE.test(src)) out.push(`${c.viteConfig} missing base: './'`);
      if (!CODED_APPS_DEV.test(src)) out.push(`${c.viteConfig} does not import from @uipath/coded-apps-dev`);
      return out;
    },
  },
];

export function checkApp(ctx) {
  return RULES.flatMap(r => (r.applies && !r.applies(ctx) ? [] : r.check(ctx).map(m => ({ rule: r.id, message: m }))));
}

function changedAppDirs(baseRef, appDirs) {
  const changed = execFileSync('git', ['diff', '--name-only', `${baseRef}...HEAD`, '--', 'samples'], { cwd: ROOT, encoding: 'utf8' })
    .split('\n').filter(Boolean);
  return appDirs.filter(dir => changed.some(f => f.startsWith(`${dir}/`)));
}

function discoverApps() {
  const tracked = new Set(
    execFileSync('git', ['ls-files', 'samples'], { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean),
  );
  let appDirs = [...new Set([...tracked].filter(f => f.endsWith('/package.json')).map(dirname))];
  const changedIdx = process.argv.indexOf('--changed');
  if (changedIdx !== -1) appDirs = changedAppDirs(process.argv[changedIdx + 1] || 'origin/main', appDirs);
  return appDirs.map(dir => {
    const viteConfig = ['vite.config.ts', 'vite.config.js', 'vite.config.mjs'].find(v => tracked.has(`${dir}/${v}`));
    return {
      name: dir.replace(/^samples\//, ''),
      viteConfig,
      has: file => tracked.has(`${dir}/${file}`),
      read: file => (existsSync(join(ROOT, dir, file)) ? readFileSync(join(ROOT, dir, file), 'utf8') : ''),
    };
  });
}

function run() {
  const apps = discoverApps();
  const failures = apps.flatMap(app => checkApp(app).map(v => ({ app: app.name, ...v })));
  if (failures.length) {
    console.error(`check-samples: ${failures.length} violation(s) across ${apps.length} apps:\n`);
    for (const f of failures) console.error(`  ${f.app} › ${f.rule}: ${f.message}`);
    process.exit(1);
  }
  console.log(`check-samples: OK (${apps.length} apps)`);
}

function assert(cond, msg) {
  if (!cond) throw new Error('selftest failed: ' + msg);
}
function fake(files, viteConfig) {
  return { name: 'fake', viteConfig, has: f => f in files, read: f => files[f] ?? '' };
}

function selftest() {
  const clean = {
    'package.json': '{"devDependencies":{"@uipath/coded-apps-dev":"^1"}}',
    'uipath.json.example': '{}',
    '.gitignore': 'node_modules\n.uipath\n',
    'README.md': '# App\n## Preview\n![demo](./demo.gif)\n',
    'index.html': '<link rel="icon" href="/favicon.png">',
    'vite.config.ts': "import { uipathCodedApps } from '@uipath/coded-apps-dev/vite';\nexport default { base: './' }",
  };
  assert(checkApp(fake(clean, 'vite.config.ts')).length === 0, 'clean app passes');
  assert(checkApp(fake({ ...clean, 'uipath.json': '{}' })).some(v => v.rule === 'no-committed-uipath-json'), 'catches committed uipath.json');
  assert(checkApp(fake({ ...clean, 'README.md': '# App\nno preview here' })).some(v => v.rule === 'readme-preview'), 'catches missing preview heading');
  assert(checkApp(fake({ ...clean, 'README.md': '# App\n## Preview\njust text' })).some(v => v.rule === 'readme-preview'), 'catches preview without media');
  assert(checkApp(fake({ ...clean, 'index.html': '<title>x</title>' })).some(v => v.rule === 'favicon'), 'catches missing favicon');
  assert(checkApp(fake({ ...clean, '.gitignore': 'node_modules' })).some(v => v.rule === 'gitignore'), 'catches .gitignore without .uipath');
  assert(checkApp(fake({ ...clean, 'vite.config.ts': "export default { base: '/' }" }, 'vite.config.ts')).filter(v => v.rule === 'vite-config').length === 2, 'catches vite base + import');
  // favicon/coded-apps-dev only apply when index.html exists
  const noHtml = { ...clean }; delete noHtml['index.html']; delete noHtml['package.json'];
  noHtml['package.json'] = '{}';
  assert(!checkApp(fake(noHtml)).some(v => v.rule === 'favicon' || v.rule === 'coded-apps-dev'), 'html-only rules skipped without index.html');
  console.log('selftest: OK');
}

if (process.argv.includes('--selftest')) selftest();
else run();
