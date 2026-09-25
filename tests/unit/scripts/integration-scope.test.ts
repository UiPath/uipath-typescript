import { describe, it, expect } from 'vitest';
// The PR integration-test scoping rules. Imported directly (the script only runs
// its CLI when executed as main), so the pure resolver is exercised here.
import { ALWAYS_ON, classify, resolveScope, suites, toOutputs } from '../../../scripts/integration-scope.mjs';

const SHARED = 'tests/integration/shared';
const DOMAINS = ['action-center', 'data-fabric', 'maestro', 'orchestrator'];

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
    ], DOMAINS);
    expect(scope).toMatchObject({ run: false, all: false, domains: [], paths: [] });
    expect(toOutputs(scope)).toEqual(['run_integration=false', 'test_paths=', 'scope=none']);
  });

  it('runs nothing for an empty change set', () => {
    expect(resolveScope([], DOMAINS).run).toBe(false);
  });

  it('scopes service, model and suite changes to the same-named suite plus the always-on suites', () => {
    const scope = resolveScope([
      'src/services/data-fabric/entities.ts',
      'src/models/maestro/cases.types.ts',
      `${SHARED}/orchestrator/jobs.integration.test.ts`,
      'docs/data-fabric.md',
    ], DOMAINS);
    expect(scope).toMatchObject({ run: true, all: false, domains: ['data-fabric', 'maestro', 'orchestrator'] });
    expect(scope.paths).toEqual([...ALWAYS_ON, `${SHARED}/data-fabric`, `${SHARED}/maestro`, `${SHARED}/orchestrator`]);
    expect(toOutputs(scope)).toEqual([
      'run_integration=true',
      `test_paths=${scope.paths.join(' ')}`,
      'scope=data-fabric,maestro,orchestrator',
    ]);
  });

  it('runs only the always-on suites when they are what changed', () => {
    const scope = resolveScope([`${SHARED}/http/http-request.integration.test.ts`], DOMAINS);
    expect(scope).toMatchObject({ run: true, all: false, domains: [], paths: [...ALWAYS_ON] });
    expect(toOutputs(scope)[2]).toBe('scope=always-on');
  });

  it.each([
    'src/core/http/api-client.ts',
    'src/utils/constants/endpoints/orchestrator.ts',
    'src/services/base.ts',
    'src/models/common/types.ts',
    'src/models/document-understanding/du.types.ts', // no suite of that name
    'src/services/integration-service/connections/connections.ts', // no suite of that name
    'src/index.ts',
    'tests/integration/config/unified-setup.ts',
    'tests/integration/utils/helpers.ts',
    'tests/utils/constants/agents.ts', // imported by the agents suites
    `${SHARED}/smoke.integration.test.ts`,
    `${SHARED}/brand-new-domain/x.integration.test.ts`,
    'vitest.integration.config.ts',
    'package.json',
    '.github/workflows/coverage.yml',
    'scripts/integration-scope.mjs',
    'new-top-level-dir/thing.ts',
  ])('runs everything for anything outside the per-domain folders: %s', (file) => {
    const scope = resolveScope(['docs/index.md', file], DOMAINS);
    expect(scope).toMatchObject({ run: true, all: true, paths: [] });
    expect(scope.reasons).toHaveLength(1);
    expect(toOutputs(scope)).toEqual(['run_integration=true', 'test_paths=', 'scope=all']);
  });

  it('lets a single shared file override any number of scoped ones', () => {
    const scope = resolveScope(['src/services/data-fabric/entities.ts', 'src/core/config.ts'], DOMAINS);
    expect(scope).toMatchObject({ all: true, domains: [] });
  });

  it('classifies against the given domain list only', () => {
    expect(classify('src/services/maestro/cases.ts', DOMAINS)).toEqual({ kind: 'domain', domain: 'maestro' });
    expect(classify('src/services/maestro/cases.ts', ['data-fabric']).kind).toBe('all');
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
});
