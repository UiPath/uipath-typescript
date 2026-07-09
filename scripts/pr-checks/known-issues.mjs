import { existsSync, readFileSync, writeFileSync } from 'node:fs';

export const UPDATE_KNOWN_ISSUES = process.argv.includes('--update-known-issues');

function readJson(path, fallback) {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, 'utf8'));
}

function writeJson(path, value) {
  writeFileSync(path, JSON.stringify(value, null, 2) + '\n');
}

function uniqueViolations(violations) {
  return [...new Map(violations.map(violation => [violation.key, violation])).values()];
}

export function finishViolationCheck({
  checkName,
  knownIssuesPath,
  violations,
  updateSummary,
  formatViolation = violation => `${violation.key}: ${violation.message}`,
  failureHint,
  successSummary,
  logKnown = false,
}) {
  const unique = uniqueViolations(violations);
  const knownIssues = new Set(readJson(knownIssuesPath, []));

  if (UPDATE_KNOWN_ISSUES) {
    writeJson(knownIssuesPath, unique.map(violation => violation.key).sort());
    console.log(updateSummary(unique.length));
    process.exit(0);
  }

  const fresh = unique.filter(violation => !knownIssues.has(violation.key));
  const known = unique.filter(violation => knownIssues.has(violation.key));

  if (logKnown) {
    for (const violation of known) {
      console.log(`  (known) ${formatViolation(violation)}`);
    }
  }

  if (fresh.length) {
    console.error(`${checkName}: ${fresh.length} new violation(s):`);
    for (const violation of fresh) {
      console.error(`  ${formatViolation(violation)}`);
    }
    if (failureHint) console.error(`\n${failureHint}`);
    process.exit(1);
  }

  console.log(`${checkName}: OK (${successSummary({
    knownIssueCount: knownIssues.size,
    knownCount: known.length,
    violationCount: unique.length,
  })})`);
}

export function finishCountCheck({
  checkName,
  knownIssuesPath,
  current,
  updateSummary,
  formatFailure,
  failureHint,
  successSummary,
}) {
  const sorted = Object.fromEntries(Object.entries(current).sort(([a], [b]) => a.localeCompare(b)));

  if (UPDATE_KNOWN_ISSUES) {
    writeJson(knownIssuesPath, sorted);
    console.log(updateSummary(Object.keys(sorted).length));
    process.exit(0);
  }

  const knownIssues = readJson(knownIssuesPath, {});
  const failures = [];

  for (const [key, count] of Object.entries(sorted)) {
    const allowed = knownIssues[key] ?? 0;
    if (count > allowed) {
      failures.push({ key, count, allowed });
    }
  }

  if (failures.length) {
    console.error(`${checkName}: ${failures.length} rule/file(s) exceed known existing issue count:`);
    for (const failure of failures) {
      console.error(`  ${formatFailure(failure)}`);
    }
    if (failureHint) console.error(`\n${failureHint}`);
    process.exit(1);
  }

  console.log(`${checkName}: OK (${successSummary({
    knownIssueCount: Object.keys(knownIssues).length,
    currentCount: Object.keys(sorted).length,
  })})`);
}
