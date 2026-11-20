import { describe, it, expect } from 'vitest';
import { buildTargets, REBUILD_ALL_FILES } from '../../../scripts/sample-build-targets.mjs';

const PROJECTS = [
  'samples/coded-action-apps/action-app-with-image',
  'samples/functions-app',
  'samples/functions-app/coded-functions',
  'samples/process-app-v0',
  'samples/process-app-v0-extras',
];

describe('sample-build-targets', () => {
  it('selects only the project containing a changed file', () => {
    expect(buildTargets(PROJECTS, ['samples/coded-action-apps/action-app-with-image/src/App.tsx'])).toEqual([
      'samples/coded-action-apps/action-app-with-image',
    ]);
  });

  it('selects a lockfile-only change', () => {
    expect(buildTargets(PROJECTS, ['samples/process-app-v0/package-lock.json'])).toEqual(['samples/process-app-v0']);
  });

  it('selects both the nested project and its parent for a change inside the nested project', () => {
    expect(buildTargets(PROJECTS, ['samples/functions-app/coded-functions/lib/contract.ts'])).toEqual([
      'samples/functions-app',
      'samples/functions-app/coded-functions',
    ]);
  });

  it('does not select the nested project for a change only in its parent', () => {
    expect(buildTargets(PROJECTS, ['samples/functions-app/src/App.tsx'])).toEqual(['samples/functions-app']);
  });

  it('does not treat a name prefix as containment', () => {
    expect(buildTargets(PROJECTS, ['samples/process-app-v0-extras/src/main.ts'])).toEqual([
      'samples/process-app-v0-extras',
    ]);
  });

  it('selects nothing for changes outside any sample project', () => {
    expect(buildTargets(PROJECTS, ['src/index.ts', 'samples/coded-action-apps/README.md', 'docs/samples/index.md'])).toEqual([]);
  });

  it.each(REBUILD_ALL_FILES)('selects every project when %s changes', file => {
    expect(buildTargets(PROJECTS, [file])).toEqual([...PROJECTS].sort());
  });
});
