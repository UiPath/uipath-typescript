import { describe, it, expect } from 'vitest';
import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
// The PR integration-test scoping rules. Imported directly (the script only runs
// its CLI when executed as main), so the pure resolver is exercised here.
import { ALWAYS_ON, FULL_RUN_LABEL, classify, isAlwaysOn, parseNumstat, resolveArgs, resolveScope, services, suites, toOutputs } from '../../../scripts/integration-scope.mjs';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const SHARED = 'tests/integration/shared';
const ENDPOINTS = 'src/utils/constants/endpoints';
const CONSTANTS = 'tests/utils/constants';
const REGISTRY = 'tests/integration/config/unified-setup.ts';
const DOMAINS = ['action-center', 'data-fabric', 'maestro', 'orchestrator', 'platform'];
// Service folders: the suite domains plus one nothing tests.
const SERVICES = [...DOMAINS, 'integration-service'];

describe('integration-scope resolveScope', () => {
  it('runs nothing when only ignorable files change', () => {
    const scope = resolveScope([
      'docs/faq.md',
      'samples/process-app/src/App.tsx',
      'packages/coded-action-app/src/types.ts',
      'tests/unit/services/data-fabric/entities.test.ts',
      'tests/utils/mocks/entities.ts',
      'README.md',
      'rollup.config.js',
      'package.json', // exports, scripts, version; a dependency change also edits the lock file, which runs everything
      'scripts/check-samples.mjs', // CI tooling, not part of the integration run
      'scripts/integration-scope.mjs', // the resolver itself: covered by this file, fail-closed in the workflow
      'tests/.env.integration.example',
      `${ENDPOINTS}/index.ts`, // the barrel only re-exports
      `${ENDPOINTS}/base.ts`, // every new service adds a base path; its own folder covers it
    ], DOMAINS, SERVICES);
    expect(scope).toMatchObject({ run: false, all: false, domains: [], paths: [] });
    expect(toOutputs(scope)).toEqual(['run_integration=false', 'test_paths=', 'scope=none']);
  });

  it('runs nothing for an empty change set', () => {
    expect(resolveScope([], DOMAINS, SERVICES).run).toBe(false);
  });

  it('runs nothing for a service with no suite folder, since there is nothing to run', () => {
    const scope = resolveScope([
      'src/services/integration-service/connections/connections.ts',
      'src/models/integration-service/connections.types.ts',
    ], DOMAINS, SERVICES);
    expect(scope).toMatchObject({ run: false, all: false, domains: [], paths: [] });
    expect(scope.notes).toHaveLength(2);
    expect(toOutputs(scope)[2]).toBe('scope=none');
  });

  it('still runs the other changed domains next to a suite-less one', () => {
    const scope = resolveScope(['src/services/integration-service/connections/connections.ts', 'src/services/maestro/cases.ts'], DOMAINS, SERVICES);
    expect(scope).toMatchObject({ run: true, all: false, domains: ['maestro'] });
  });

  it('scopes service, model, endpoint and suite changes to the same-named suite plus the always-on suites', () => {
    const scope = resolveScope([
      'src/services/data-fabric/entities.ts',
      'src/models/maestro/cases.types.ts',
      `${ENDPOINTS}/action-center/tasks.ts`,
      `${SHARED}/orchestrator/jobs.integration.test.ts`,
      'docs/data-fabric.md',
    ], DOMAINS, SERVICES);
    expect(scope).toMatchObject({ run: true, all: false, domains: ['action-center', 'data-fabric', 'maestro', 'orchestrator'] });
    expect(scope.paths).toEqual([...ALWAYS_ON, `${SHARED}/action-center`, `${SHARED}/data-fabric`, `${SHARED}/maestro`, `${SHARED}/orchestrator`]);
    expect(toOutputs(scope)).toEqual([
      'run_integration=true',
      `test_paths=${scope.paths.join(' ')}`,
      'scope=action-center,data-fabric,maestro,orchestrator',
    ]);
  });

  it('treats a shared test-constants file like its domain, by file name', () => {
    expect(classify(`${CONSTANTS}/platform.ts`, DOMAINS, SERVICES)).toEqual({ kind: 'domain', domain: 'platform' });
    expect(classify(`${CONSTANTS}/integration-service.ts`, DOMAINS, SERVICES).kind).toBe('no-suite');
    expect(classify(`${CONSTANTS}/common.ts`, DOMAINS, SERVICES).kind).toBe('all');
  });

  it('runs only the always-on suites for an additions-only change to the service registry', () => {
    const scope = resolveScope([REGISTRY], DOMAINS, SERVICES, new Set([REGISTRY]));
    expect(scope).toMatchObject({ run: true, all: false, domains: [], paths: [...ALWAYS_ON] });
    expect(toOutputs(scope)[2]).toBe('scope=always-on');
    expect(scope.notes[0]).toContain('only adds lines');
  });

  it("adds the registered service's suite when its folders change alongside the registry", () => {
    const scope = resolveScope([REGISTRY, 'src/services/platform/groups/groups.ts'], DOMAINS, SERVICES, new Set([REGISTRY]));
    expect(scope).toMatchObject({ run: true, all: false, domains: ['platform'] });
  });

  it('runs everything for a registry change that removes or edits lines', () => {
    const { files, additive } = parseNumstat(`5\t2\t${REGISTRY}\n`);
    expect(resolveScope(files, DOMAINS, SERVICES, additive).all).toBe(true);
  });

  it('treats an endpoint-constants folder like its service folder', () => {
    expect(classify(`${ENDPOINTS}/platform/identity.ts`, DOMAINS, SERVICES)).toEqual({ kind: 'domain', domain: 'platform' });
    expect(classify(`${ENDPOINTS}/integration-service/integration-service.ts`, DOMAINS, SERVICES).kind).toBe('no-suite');
  });

  it.each([
    `${SHARED}/smoke.integration.test.ts`,
    `${SHARED}/http/http-request.integration.test.ts`,
    'tests/integration/auth-errors.integration.test.ts',
  ])('runs only the always-on suites when one of them changes: %s', (file) => {
    const scope = resolveScope([file], DOMAINS, SERVICES);
    expect(scope).toMatchObject({ run: true, all: false, domains: [], paths: [...ALWAYS_ON] });
    expect(toOutputs(scope)[2]).toBe('scope=always-on');
  });

  it.each([
    'src/core/http/api-client.ts',
    'src/utils/constants/common.ts',
    'src/services/base.ts',
    'src/models/common/types.ts', // shared models, not a service
    'src/models/document-understanding/du.types.ts', // models-only folder with no service: shared code
    `${SHARED}/brand-new-domain/x.integration.test.ts`, // not a service either
    'src/index.ts',
    REGISTRY, // without additions-only information (the --files path) the registry runs everything
    'tests/integration/utils/helpers.ts',
    `${CONSTANTS}/common.ts`, // shared test constants, not a domain's
    `${CONSTANTS}/index.ts`,
    `${SHARED}/loose.integration.test.ts`, // a loose file that is not always-on
    'vitest.integration.config.ts',
    'package-lock.json', // a dependency change
    '.github/workflows/coverage.yml',
    'new-top-level-dir/thing.ts',
  ])('runs everything for anything outside the per-domain folders: %s', (file) => {
    const scope = resolveScope(['docs/index.md', file], DOMAINS, SERVICES);
    expect(scope).toMatchObject({ run: true, all: true, paths: [] });
    expect(scope.reasons).toHaveLength(1);
    expect(toOutputs(scope)).toEqual(['run_integration=true', 'test_paths=', 'scope=all']);
  });

  it('runs everything for a version bump or dependency change, through the lock file', () => {
    const scope = resolveScope(['package.json', 'package-lock.json', 'release-metadata.json'], DOMAINS, SERVICES);
    expect(scope).toMatchObject({ run: true, all: true });
    expect(scope.reasons).toEqual(['package-lock.json is outside the per-domain folders']);
  });

  it('lets a single shared file override any number of scoped ones', () => {
    const scope = resolveScope(['src/services/data-fabric/entities.ts', 'src/core/config.ts'], DOMAINS, SERVICES);
    expect(scope).toMatchObject({ all: true, domains: [] });
  });

  it('classifies against the given suite and service lists only', () => {
    expect(classify('src/services/maestro/cases.ts', DOMAINS, SERVICES)).toEqual({ kind: 'domain', domain: 'maestro' });
    expect(classify('src/services/maestro/cases.ts', ['data-fabric'], SERVICES).kind).toBe('no-suite');
    expect(classify('src/services/maestro/cases.ts', ['data-fabric'], ['data-fabric']).kind).toBe('all');
    expect(classify(`${SHARED}/http-extras/x.integration.test.ts`, DOMAINS, SERVICES).kind).toBe('all'); // a prefix of an always-on folder is not it
  });

  it('notes the missing suite folder for a suite-less service, and explains a full run otherwise', () => {
    expect(classify('src/services/integration-service/connections/connections.ts', DOMAINS, SERVICES)).toEqual({
      kind: 'no-suite',
      domain: 'integration-service',
      note: `src/services/integration-service/connections/connections.ts: no suite folder ${SHARED}/integration-service, nothing to run`,
    });
    expect(classify('src/core/http/api-client.ts', DOMAINS, SERVICES)).toEqual({
      kind: 'all',
      reason: 'src/core/http/api-client.ts is outside the per-domain folders',
    });
  });
});

describe('integration-scope resolveArgs', () => {
  it('forces the full run for --all', () => {
    expect(resolveArgs(['--all'])).toMatchObject({ scope: { run: true, all: true, paths: [] } });
  });

  it(`forces the full run when the PR carries the ${FULL_RUN_LABEL} label, without diffing`, () => {
    const { scope } = resolveArgs(['--base', 'origin/main', '--labels', `bug, ${FULL_RUN_LABEL}`]);
    expect(scope).toMatchObject({ run: true, all: true, paths: [] });
    expect(scope.reasons[0]).toContain(FULL_RUN_LABEL);
  });

  it('reads the changed files from git for --base', () => {
    // HEAD...HEAD is an empty diff, so this exercises the git call without depending on history.
    expect(resolveArgs(['--base', 'HEAD'])).toEqual({ files: [], additive: new Set() });
  });

  // "A diff problem must never skip the run": a ref git does not know makes it exit non-zero.
  it('falls back to the full run when git cannot diff against the base', () => {
    const { scope } = resolveArgs(['--base', 'no-such-ref']);
    expect(scope).toMatchObject({ run: true, all: true, paths: [] });
    expect(scope.reasons[0]).toContain('could not diff against no-such-ref');
    expect(toOutputs(scope)).toEqual(['run_integration=true', 'test_paths=', 'scope=all']);
  });

  it('reads a file list for --files, dropping blanks and surrounding whitespace', () => {
    const list = join(mkdtempSync(join(tmpdir(), 'integration-scope-')), 'files.txt');
    writeFileSync(list, ' docs/a.md \n\nsrc/services/maestro/cases.ts\n');
    expect(resolveArgs(['--files', list])).toEqual({ files: ['docs/a.md', 'src/services/maestro/cases.ts'], additive: new Set() });
  });

  it('parses git numstat into the file list and its additions-only subset', () => {
    const { files, additive } = parseNumstat(`3\t0\t${REGISTRY}\n5\t2\tsrc/core/config.ts\n-\t-\tdocs/img.png\n0\t4\tREADME.md\n0\t0\tscripts/mode-only.sh\n`);
    expect(files).toEqual([REGISTRY, 'src/core/config.ts', 'docs/img.png', 'README.md', 'scripts/mode-only.sh']);
    expect([...additive]).toEqual([REGISTRY]);
  });
});

describe('integration-scope suites', () => {
  it('derives the domain list from the suite folders, without the always-on ones', () => {
    const found = suites();
    expect(found).toContain('data-fabric');
    expect(found).toContain('maestro');
    expect(found).not.toContain('http');
    expect(found).toEqual([...found].sort());
  });

  it('derives the service list from the src/services folders', () => {
    const found = services();
    expect(found).toContain('integration-service');
    expect(found).toContain('maestro');
    expect(found).not.toContain('base.ts');
  });

  // A suite the script cannot find by name would otherwise never run on a PR.
  it('names every suite folder after a src/services folder', () => {
    const known = services();
    for (const name of suites()) {
      expect(known, `${SHARED}/${name} has no src/services/${name}`).toContain(name);
    }
  });
});

// Identifier-level usage scan, for the guards that keep a domain's files to that domain.
type Source = { path: string; text: string };
function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
    if (entry.isDirectory()) yield* walk(`${dir}/${entry.name}`);
    else if (entry.name.endsWith('.ts')) yield `${dir}/${entry.name}`;
  }
}
const readSources = (dir: string): Source[] => [...walk(dir)].map(path => ({ path, text: readFileSync(join(ROOT, path), 'utf8') }));
const exportsOf = (file: string) => [...readFileSync(join(ROOT, file), 'utf8').matchAll(/^export\s+(?:const|function|enum)\s+(\w+)/gm)].map(match => match[1]);
const usersOf = (file: string, sources: Source[]) => {
  const names = exportsOf(file);
  const used = new RegExp(`\\b(?:${names.join('|')})\\b`);
  return names.length === 0 ? [] : sources.filter(source => source.path !== file && used.test(source.text)).map(source => source.path);
};

describe('integration-scope shared test constants', () => {
  // Suites, plus the constants folder itself so a constants file importing another domain's is caught.
  const sources = [...readSources('tests/integration'), ...readSources(CONSTANTS)];

  // A domain-named constants file scopes to that suite, so no other suite may use it.
  it("keeps a domain-named constants file's exports to that domain's suite", () => {
    const known = suites();
    for (const entry of readdirSync(join(ROOT, CONSTANTS))) {
      const name = entry.replace(/\.ts$/, '');
      if (!known.includes(name)) continue;
      for (const user of usersOf(`${CONSTANTS}/${entry}`, sources)) {
        expect(user.startsWith(`${SHARED}/${name}/`) || isAlwaysOn(user), `${CONSTANTS}/${entry} is used by ${user}, outside the ${name} suite`).toBe(true);
      }
    }
  });
});

describe('integration-scope endpoint constants', () => {
  const entries = readdirSync(join(ROOT, ENDPOINTS), { withFileTypes: true });
  const folders = entries.filter(entry => entry.isDirectory()).map(entry => entry.name);
  const sources = readSources('src');

  // A folder the script cannot match to a service would scope to nothing useful.
  it('names every endpoint folder after a src/services folder', () => {
    const known = services();
    for (const name of folders) {
      expect(known, `${ENDPOINTS}/${name} has no src/services/${name}`).toContain(name);
    }
  });

  // The scoping trusts the folder name, so a constant in the wrong folder would
  // skip the suite that actually exercises it. Use from src/core is accepted
  // (platform/identity.ts serves the OAuth flow): core's own changes run everything.
  it("keeps each folder's exports to that domain's code", () => {
    for (const name of folders) {
      const allowed = [`src/services/${name}/`, `src/models/${name}/`, `${ENDPOINTS}/${name}/`, 'src/core/'];
      for (const entry of readdirSync(join(ROOT, ENDPOINTS, name))) {
        const file = `${ENDPOINTS}/${name}/${entry}`;
        for (const user of usersOf(file, sources)) {
          expect(allowed.some(prefix => user.startsWith(prefix)), `${file} is used by ${user}, outside ${name}`).toBe(true);
        }
      }
    }
  });

  // Loose files beside the folders run everything, so only shared code belongs there.
  it('keeps the loose files for code outside the service folders', () => {
    for (const entry of entries.filter(entry => entry.isFile() && entry.name !== 'index.ts')) {
      const file = `${ENDPOINTS}/${entry.name}`;
      for (const user of usersOf(file, sources)) {
        expect(user.startsWith('src/services/') || user.startsWith('src/models/'), `${file} is used by ${user}; move it into that service's folder`).toBe(false);
      }
    }
  });
});
