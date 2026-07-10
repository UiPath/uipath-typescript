#!/usr/bin/env node
// PR gate for sample apps under samples/. Discovers every tracked app
// (any directory with a committed package.json) and runs the rules below.
// Rules are pure functions of an app context so they can be unit-tested
// without git/fs — run `node scripts/check-samples.mjs --selftest`.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'node-html-parser';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// Grep/presence checks (not parsers): does the text contain a media ref / this string?
const MEDIA = /!\[[^\]]*\]\([^)]+\)|<img\b|<video\b|\bhttps?:\/\/[^\s)]+\.(?:gif|mp4|webm|png|jpe?g)\b|\.(?:gif|mp4|webm)\b/i;
const VITE_BASE = /base\s*:\s*["']\.\/["']/;
const CODED_APPS_DEV = /@uipath\/coded-apps-dev/;

// ctx: { name, viteConfig, has(file)->bool, read(file)->string }
const RULES = [
  {
    id: 'example-config',
    desc: 'must have a uipath.json.example',
    check: c => (c.has('uipath.json.example') ? [] : ['missing uipath.json.example']),
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
    desc: 'index.html must reference a favicon file that exists',
    applies: c => c.has('index.html'),
    check: c => faviconViolations(c.read('index.html'), c.exists),
  },
  {
    id: 'coded-apps-dev',
    desc: 'a coded-apps harness dependency (@uipath/coded-apps-dev, or @uipath/coded-action-app for action apps)',
    applies: c => c.has('index.html'),
    check: c => {
      const deps = allDeps(c);
      if (deps['@uipath/coded-apps-dev'] || deps['@uipath/coded-action-app']) return [];
      return ['no coded-apps harness: add @uipath/coded-apps-dev (or @uipath/coded-action-app for action apps)'];
    },
  },
  {
    id: 'vite-config',
    desc: "vite.config must set base: './' (and import @uipath/coded-apps-dev, except action apps)",
    applies: c => c.viteConfig !== undefined,
    // grep, not semantic validation — loading the vite config would need npm ci per app.
    check: c => {
      const src = c.read(c.viteConfig);
      const out = [];
      if (!VITE_BASE.test(src)) out.push(`${c.viteConfig} missing base: './'`);
      // Action apps inject base/config at runtime via @uipath/coded-action-app,
      // so they don't import the coded-apps-dev vite plugin.
      if (!isActionApp(c) && !CODED_APPS_DEV.test(src)) out.push(`${c.viteConfig} does not import from @uipath/coded-apps-dev`);
      return out;
    },
  },
];

const allDeps = c => { const p = JSON.parse(c.read('package.json')); return { ...p.dependencies, ...p.devDependencies }; };
// Action apps depend on the coded-action-app harness, which supplies base/config
// at runtime — so @uipath/coded-apps-dev and its vite import are not required.
const isActionApp = c => '@uipath/coded-action-app' in allDeps(c);

// Validate that the favicon <link> points at a file that actually exists,
// not just that the tag is present. Parse the HTML (rel~=icon matches any
// space-separated token, e.g. "shortcut icon"). `exists` resolves paths
// relative to the app root. Absolute `/x` refs are tried under public/ and
// root (Vite's conventions); data:/http refs are inline/external and assumed present.
function faviconViolations(html, exists) {
  const link = parse(html).querySelector('link[rel~=icon]');
  if (!link) return ['index.html has no favicon <link rel="icon">'];
  const href = link.getAttribute('href')?.split(/[?#]/)[0];
  if (!href) return ['favicon <link rel="icon"> has no href'];
  if (/^(data:|https?:)/i.test(href)) return [];
  const candidates = href.startsWith('/') ? [`public${href}`, href.slice(1)] : [href.replace(/^\.\//, '')];
  return candidates.some(exists) ? [] : [`favicon "${href}" referenced but the file does not exist`];
}

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
      exists: file => existsSync(join(ROOT, dir, file)),
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
  return { name: 'fake', viteConfig, has: f => f in files, read: f => files[f] ?? '', exists: f => f in files };
}

function selftest() {
  const clean = {
    'package.json': '{"devDependencies":{"@uipath/coded-apps-dev":"^1"}}',
    'uipath.json.example': '{}',
    '.gitignore': 'node_modules\n.uipath\n',
    'README.md': '# App\n## Preview\n![demo](./demo.gif)\n',
    'index.html': '<link rel="icon" href="./favicon.png">',
    'favicon.png': '<binary>',
    'vite.config.ts': "import { uipathCodedApps } from '@uipath/coded-apps-dev/vite';\nexport default { base: './' }",
  };
  assert(checkApp(fake(clean, 'vite.config.ts')).length === 0, 'clean app passes');
  assert(checkApp(fake({ ...clean, 'README.md': '# App\nno preview here' })).some(v => v.rule === 'readme-preview'), 'catches missing preview heading');
  assert(checkApp(fake({ ...clean, 'README.md': '# App\n## Preview\njust text' })).some(v => v.rule === 'readme-preview'), 'catches preview without media');
  assert(checkApp(fake({ ...clean, 'index.html': '<title>x</title>' })).some(v => v.rule === 'favicon'), 'catches missing favicon link');
  { const f = { ...clean }; delete f['favicon.png']; assert(checkApp(fake(f, 'vite.config.ts')).some(v => v.rule === 'favicon'), 'catches favicon link pointing at a missing file'); }
  assert(checkApp(fake({ ...clean, '.gitignore': 'node_modules' })).some(v => v.rule === 'gitignore'), 'catches .gitignore without .uipath');
  assert(checkApp(fake({ ...clean, 'vite.config.ts': "export default { base: '/' }" }, 'vite.config.ts')).filter(v => v.rule === 'vite-config').length === 2, 'catches vite base + import');
  const noHtml = { ...clean, 'package.json': '{}' };
  delete noHtml['index.html'];
  assert(!checkApp(fake(noHtml)).some(v => v.rule === 'favicon' || v.rule === 'coded-apps-dev'), 'html-only rules skipped without index.html');
  // Action apps use the coded-action-app harness: coded-apps-dev and the vite import are not required.
  const actionApp = {
    ...clean,
    'package.json': '{"dependencies":{"@uipath/coded-action-app":"^1"}}',
    'vite.config.ts': "export default { base: './' }",
  };
  assert(checkApp(fake(actionApp, 'vite.config.ts')).length === 0, 'action app passes with coded-action-app and no coded-apps-dev import');
  console.log('selftest: OK');
}

if (process.argv.includes('--selftest')) selftest();
else run();
