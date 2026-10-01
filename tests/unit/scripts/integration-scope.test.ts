import { describe, it, expect } from 'vitest';
// The PR integration-test scoping rules. Imported directly (the script only runs
// its CLI when executed as main), so the pure resolver is exercised here.
import { ALWAYS_ON, FULL_RUN_LABEL, classify, resolveArgs, resolveScope, services, suites, toOutputs } from '../../../scripts/integration-scope.mjs';

const SHARED = 'tests/integration/shared';
const DOMAINS = ['action-center', 'data-fabric', 'maestro', 'orchestrator'];
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
      'tests/.env.integration.example',
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

  it('scopes service, model and suite changes to the same-named suite plus the always-on suites', () => {
    const scope = resolveScope([
      'src/services/data-fabric/entities.ts',
      'src/models/maestro/cases.types.ts',
      `${SHARED}/orchestrator/jobs.integration.test.ts`,
      'docs/data-fabric.md',
    ], DOMAINS, SERVICES);
    expect(scope).toMatchObject({ run: true, all: false, domains: ['data-fabric', 'maestro', 'orchestrator'] });
    expect(scope.paths).toEqual([...ALWAYS_ON, `${SHARED}/data-fabric`, `${SHARED}/maestro`, `${SHARED}/orchestrator`]);
    expect(toOutputs(scope)).toEqual([
      'run_integration=true',
      `test_paths=${scope.paths.join(' ')}`,
      'scope=data-fabric,maestro,orchestrator',
    ]);
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
    'src/utils/constants/endpoints/orchestrator.ts',
    'src/services/base.ts',
    'src/models/common/types.ts', // shared models, not a service
    'src/models/document-understanding/du.types.ts', // models-only folder with no service: shared code
    `${SHARED}/brand-new-domain/x.integration.test.ts`, // not a service either
    'src/index.ts',
    'tests/integration/config/unified-setup.ts',
    'tests/integration/utils/helpers.ts',
    'tests/utils/constants/agents.ts', // imported by the agents suites
    `${SHARED}/loose.integration.test.ts`, // a loose file that is not always-on
    'vitest.integration.config.ts',
    'package.json',
    '.github/workflows/coverage.yml',
    'scripts/integration-scope.mjs',
    'new-top-level-dir/thing.ts',
  ])('runs everything for anything outside the per-domain folders: %s', (file) => {
    const scope = resolveScope(['docs/index.md', file], DOMAINS, SERVICES);
    expect(scope).toMatchObject({ run: true, all: true, paths: [] });
    expect(scope.reasons).toHaveLength(1);
    expect(toOutputs(scope)).toEqual(['run_integration=true', 'test_paths=', 'scope=all']);
  });

  it('runs everything for a version-bump PR', () => {
    const scope = resolveScope(['package.json', 'package-lock.json', 'release-metadata.json'], DOMAINS, SERVICES);
    expect(scope).toMatchObject({ run: true, all: true });
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
