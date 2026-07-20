#!/usr/bin/env node
// PR gate for sample apps under samples/. Discovers every tracked app
// (any directory with a committed package.json) and runs the rules below.
// Rules are pure functions of an app context so they can be unit-tested
// without git/fs — see tests/unit/scripts/check-samples.test.ts.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
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
    check: c => faviconViolations(c.read('index.html'), c.has),
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

// Validate that the favicon <link> points at a git-tracked file, not just
// that the tag is present. Parse the HTML (rel~=icon matches any space-separated
// token, e.g. "shortcut icon"). `has` checks the tracked set (same source as
// every other rule) so results match CI's clean checkout — a file on disk but
// not committed does not count. Absolute `/x` refs are tried under public/ and
// root (Vite's conventions); data:/http refs are inline/external and assumed present.
function faviconViolations(html, has) {
  const link = parse(html).querySelector('link[rel~=icon]');
  if (!link) return ['index.html has no favicon <link rel="icon">'];
  const href = link.getAttribute('href')?.split(/[?#]/)[0];
  if (!href) return ['favicon <link rel="icon"> has no href'];
  if (/^(data:|https?:)/i.test(href)) return [];
  const candidates = href.startsWith('/') ? [`public${href}`, href.slice(1)] : [href.replace(/^\.\//, '')];
  return candidates.some(has) ? [] : [`favicon "${href}" referenced but the file is not tracked`];
}

// Extract the markdown section for the first heading matching /preview/i,
// up to the next heading of the same or higher level (or EOF). The heading
// line itself is included so media placed on the heading line
// (`## Preview ![](x.png)`) still counts.
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
  return lines.slice(start, end).join('\n');
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

// Only execute when run directly (node scripts/check-samples.mjs), not when
// imported — so `import { checkApp }` in a test never triggers run()/git.
if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run();
}
