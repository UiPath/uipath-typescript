import { existsSync, readFileSync, writeFileSync } from 'node:fs';

export const UPDATE_BASELINE = process.argv.includes('--update-baseline');

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

export function finishViolationBaseline({
  checkName,
  baselinePath,
  violations,
  updateSummary,
  formatViolation = violation => `${violation.key}: ${violation.message}`,
  failureHint,
  successSummary,
  logGrandfathered = false,
}) {
  const unique = uniqueViolations(violations);
  const baseline = new Set(readJson(baselinePath, []));

  if (UPDATE_BASELINE) {
    writeJson(baselinePath, unique.map(violation => violation.key).sort());
    console.log(updateSummary(unique.length));
    process.exit(0);
  }

  const fresh = unique.filter(violation => !baseline.has(violation.key));
  const grandfathered = unique.filter(violation => baseline.has(violation.key));

  if (logGrandfathered) {
    for (const violation of grandfathered) {
      console.log(`  (baseline) ${formatViolation(violation)}`);
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
    baselineCount: baseline.size,
    grandfatheredCount: grandfathered.length,
    violationCount: unique.length,
  })})`);
}

export function finishCountBaseline({
  checkName,
  baselinePath,
  current,
  updateSummary,
  formatFailure,
  failureHint,
  successSummary,
}) {
  const sorted = Object.fromEntries(Object.entries(current).sort(([a], [b]) => a.localeCompare(b)));

  if (UPDATE_BASELINE) {
    writeJson(baselinePath, sorted);
    console.log(updateSummary(Object.keys(sorted).length));
    process.exit(0);
  }

  const baseline = readJson(baselinePath, {});
  const failures = [];

  for (const [key, count] of Object.entries(sorted)) {
    const allowed = baseline[key] ?? 0;
    if (count > allowed) {
      failures.push({ key, count, allowed });
    }
  }

  if (failures.length) {
    console.error(`${checkName}: ${failures.length} rule/file(s) exceed baseline:`);
    for (const failure of failures) {
      console.error(`  ${formatFailure(failure)}`);
    }
    if (failureHint) console.error(`\n${failureHint}`);
    process.exit(1);
  }

  console.log(`${checkName}: OK (${successSummary({
    baselineCount: Object.keys(baseline).length,
    currentCount: Object.keys(sorted).length,
  })})`);
}
