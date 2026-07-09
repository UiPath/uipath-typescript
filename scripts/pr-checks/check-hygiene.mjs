import { readFileSync } from 'node:fs';
import { finishCountBaseline } from './baseline.mjs';
import { checkPath, relativeToRoot, repoPath, walkTsFiles } from './workspace.mjs';

const BASELINE_PATH = checkPath('hygiene-baseline.json');
const AS_ANY = /\bas any\b/g;
const AS_UNKNOWN_AS = /\bas unknown as\b/g;
const CONSOLE_WARN = /console\.warn/g;
const DOUBLE_BLANK_LINES = /\n[ \t]*\n[ \t]*\n/g;
const INTERNAL_TYPES_BARREL_EXPORT = /export\s+(?:type\s+)?\*?\s*(?:\{[^}]*\})?\s*from\s+['"][^'"]*internal-types['"]/g;
const SKIPPED_TEST = /\b(describe|it|test)\.skip\b/;
const PAT = /\bPAT\b/;
const OAUTH = /oauth/i;
const TRY_BLOCK = /\btry\s*\{/g;

const srcFiles = walkTsFiles(repoPath('src'));
const testFiles = walkTsFiles(repoPath('tests'));
const integrationTestFiles = testFiles.filter(file => relativeToRoot(file).startsWith('tests/integration/') && file.endsWith('.integration.test.ts'));

function countMatches(content, re) {
  return [...content.matchAll(re)].length;
}

function countUnjustifiedSkips(content) {
  const lines = content.split('\n');
  let count = 0;
  lines.forEach((line, i) => {
    if (!SKIPPED_TEST.test(line)) return;
    const context = lines.slice(Math.max(0, i - 3), i + 1).join('\n');
    if (!PAT.test(context) && !OAUTH.test(context)) count++;
  });
  return count;
}

const RULES = [
  {
    id: 'as-any-in-tests',
    describe: 'no `as any` in tests (agent_docs conventions)',
    files: testFiles,
    count: content => countMatches(content, AS_ANY),
  },
  {
    id: 'as-unknown-as-in-tests',
    describe: 'no `as unknown as` double casts in tests',
    files: testFiles,
    count: content => countMatches(content, AS_UNKNOWN_AS),
  },
  {
    id: 'console-warn-in-integration',
    describe: 'no console.warn in integration tests - throw instead of silently skipping',
    files: integrationTestFiles,
    count: content => countMatches(content, CONSOLE_WARN),
  },
  {
    id: 'unjustified-skip-in-integration',
    describe: 'describe/it.skip in integration tests requires a PAT/OAuth justification comment',
    files: integrationTestFiles,
    count: countUnjustifiedSkips,
  },
  {
    id: 'try-catch-in-integration',
    describe: 'no try/catch around integration test calls - let errors propagate',
    files: integrationTestFiles,
    count: content => countMatches(content, TRY_BLOCK),
  },
  {
    id: 'double-blank-lines',
    describe: 'no consecutive blank lines',
    files: [...srcFiles, ...testFiles],
    count: content => countMatches(content, DOUBLE_BLANK_LINES),
  },
  {
    id: 'internal-types-barrel-export',
    describe: 'internal-types must not be re-exported from barrel files',
    files: srcFiles.filter(f => f.endsWith('index.ts')),
    count: content => countMatches(content, INTERNAL_TYPES_BARREL_EXPORT),
  },
];

const current = {};
for (const rule of RULES) {
  for (const file of rule.files) {
    const n = rule.count(readFileSync(file, 'utf8'));
    if (n > 0) current[`${rule.id}>${relativeToRoot(file)}`] = n;
  }
}

finishCountBaseline({
  checkName: 'check-hygiene',
  baselinePath: BASELINE_PATH,
  current,
  updateSummary: count => `hygiene baseline updated: ${count} file/rule entries grandfathered`,
  formatFailure: ({ key, count, allowed }) => {
    const rule = RULES.find(item => key.startsWith(`${item.id}>`));
    return `${key}: ${count} occurrence(s), baseline allows ${allowed} - ${rule?.describe ?? 'unknown rule'}`;
  },
  failureHint: 'Fix the new occurrences. If you reduced counts elsewhere, refresh with: node scripts/pr-checks/check-hygiene.mjs --update-baseline',
  successSummary: ({ baselineCount }) => `${RULES.length} rules, ${baselineCount} grandfathered file/rule entries`,
});
