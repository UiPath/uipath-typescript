import { describe, it, expect } from 'vitest';
// The sample-app gate rules. Imported directly (the script only runs its CLI
// when executed as main), so we exercise the pure rule engine here.
import { checkApp } from '../../../scripts/check-samples.mjs';

type Files = Record<string, string>;
const fake = (files: Files, viteConfig?: string) => ({
  name: 'fake',
  viteConfig,
  has: (f: string) => f in files,
  read: (f: string) => files[f] ?? '',
});
const rules = (files: Files, viteConfig?: string): string[] =>
  checkApp(fake(files, viteConfig)).map((v: { rule: string }) => v.rule);

const clean: Files = {
  'package.json': '{"devDependencies":{"@uipath/coded-apps-dev":"^1"}}',
  'uipath.json.example': '{}',
  '.gitignore': 'node_modules\n.uipath\n',
  'README.md': '# App\n## Preview\n![demo](./demo.gif)\n',
  'index.html': '<link rel="icon" href="./favicon.png">',
  'favicon.png': '<binary>',
  'vite.config.ts': "import { uipathCodedApps } from '@uipath/coded-apps-dev/vite';\nexport default { base: './' }",
};

describe('check-samples rules', () => {
  it('passes a fully compliant app', () => {
    expect(rules(clean, 'vite.config.ts')).toEqual([]);
  });

  it('flags a README with no Preview heading', () => {
    expect(rules({ ...clean, 'README.md': '# App\nno preview here' })).toContain('readme-preview');
  });

  it('flags a Preview heading with no media', () => {
    expect(rules({ ...clean, 'README.md': '# App\n## Preview\njust text' })).toContain('readme-preview');
  });

  it('flags a missing favicon link', () => {
    expect(rules({ ...clean, 'index.html': '<title>x</title>' })).toContain('favicon');
  });

  it('flags a favicon link whose file is not tracked', () => {
    const { 'favicon.png': _omitted, ...noFavicon } = clean;
    expect(rules(noFavicon, 'vite.config.ts')).toContain('favicon');
  });

  it('flags a .gitignore that does not ignore .uipath', () => {
    expect(rules({ ...clean, '.gitignore': 'node_modules' })).toContain('gitignore');
  });

  it('flags a vite.config missing both base and the coded-apps-dev import', () => {
    const violations = checkApp(fake({ ...clean, 'vite.config.ts': "export default { base: '/' }" }, 'vite.config.ts'))
      .filter((v: { rule: string }) => v.rule === 'vite-config');
    expect(violations).toHaveLength(2);
  });

  it('skips index.html-only rules when there is no index.html', () => {
    const { 'index.html': _omitted, ...noHtml } = { ...clean, 'package.json': '{}' };
    expect(rules(noHtml)).not.toContain('favicon');
    expect(rules(noHtml)).not.toContain('coded-apps-dev');
  });

  it('accepts an action app using the coded-action-app harness', () => {
    const actionApp: Files = {
      ...clean,
      'package.json': '{"dependencies":{"@uipath/coded-action-app":"^1"}}',
      'vite.config.ts': "export default { base: './' }",
    };
    expect(rules(actionApp, 'vite.config.ts')).toEqual([]);
  });

  it('flags a missing uipath.json.example', () => {
    const { 'uipath.json.example': _omitted, ...noExample } = clean;
    expect(rules(noExample, 'vite.config.ts')).toContain('example-config');
  });

  it('flags a coded web app missing the coded-apps harness', () => {
    expect(rules({ ...clean, 'package.json': '{}' }, 'vite.config.ts')).toContain('coded-apps-dev');
  });
});
