#!/usr/bin/env node
// Compares the committed api-surface/ snapshot against a freshly generated one
// and reports the difference in consumer terms, grouped by symbol rather than
// by file. A raw `git diff` of the snapshot repeats the same logical change
// once per subpath and once per class/interface that declares it, which buries
// the one line a reviewer actually needs to see.
import { readFileSync, existsSync, mkdtempSync, rmSync, appendFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const COMMITTED = join(ROOT, 'scripts/api-surface.txt');

// Default: committed snapshot vs freshly generated (the CI gate).
// With two directory arguments: compare two snapshots, used by
// api-surface-replay.sh to run the same report over a historical change.
const [argBefore, argAfter] = process.argv.slice(2);

// Parses the snapshot: one line per declaration or member, each tagged with
// the subpath exports that expose it.
function readSnapshot(file) {
  const entries = new Map();
  if (!existsSync(file)) return entries;
  let container = null;
  for (const raw of readFileSync(file, 'utf8').split('\n')) {
    if (!raw.trim() || raw.startsWith('##')) continue;
    const indented = raw.startsWith('  ');
    const tagAt = raw.lastIndexOf('   [');
    const body = (tagAt === -1 ? raw : raw.slice(0, tagAt)).trim();
    const subs = tagAt === -1 ? [] : raw.slice(tagAt + 4).replace(/]\s*$/, '').split(', ');
    if (!indented) {
      entries.set(`decl:${body}`, { line: body, kind: 'decl', subs });
      container = body;
      continue;
    }
    const m = body.match(/^([A-Za-z_$][\w$.]*?)\.([A-Za-z_$][\w$]*|\[[^\]]*\])(.*)$/);
    entries.set(`mem:${body}`, { line: body, kind: 'mem', container, symbol: m ? m[2] : body, sig: m ? m[3] : '', subs });
  }
  return entries;
}

// `class Entities extends BaseService implements EntityServiceModel` -> `Entities`
const shortName = (l) =>
  l.match(/^(?:interface|class|type|enum|function|const)\s+([\w$.]+)/)?.[1] ?? l.split(/[\s<(]/)[0];
const declName = (l) => {
  const m = l.match(/^(interface|class|type|enum|function|const)\s+([\w$.]+)/);
  return m ? `${m[1]} ${m[2]}` : l;
};

const bump = (map, key, sub) => { if (!map.has(key)) map.set(key, new Set()); map.get(key).add(sub); };

const bumpMem = (map, id, sig, sub, container) => {
  if (!map.has(id)) map.set(id, { sigs: new Set(), where: new Set(), containers: new Set() });
  const e = map.get(id);
  e.sigs.add(sig); e.where.add(sub); e.containers.add(container);
};

// Signatures that differ only by a stability tag are the same contract.
const bare = (set) => Array.from(set, (x) => x.replace(/\s\s@[\w @]+$/, '')).sort().join('|');
const where = (s) => `[${Array.from(s).sort().join(', ')}]`;
const cnames = (e) => Array.from(e.containers, shortName).sort().join(', ');

function main() {
  const compareOnly = Boolean(argBefore && argAfter);
  const tmpDir = compareOnly ? null : mkdtempSync(join(tmpdir(), 'api-surface-'));
  const tmp = tmpDir ? join(tmpDir, 'api-surface.txt') : null;
  try {
    if (!compareOnly) {
      execFileSync(process.execPath, [join(ROOT, 'scripts/gen-api-surface.mjs'), ROOT, tmp], { stdio: 'pipe' });
    }
    const before = readSnapshot(compareOnly ? resolve(argBefore) : COMMITTED);
    const after = readSnapshot(compareOnly ? resolve(argAfter) : tmp);

    const changed = new Map(), tagged = new Map(), removedDecls = new Map(), addedDecls = new Map();
    const removedMem = new Map(), addedMem = new Map();

    for (const [k, v] of before) {
      if (after.has(k)) continue;
      for (const sub of v.subs.length ? v.subs : ['?']) {
        if (v.kind === 'decl') bump(removedDecls, declName(v.line), sub);
        else bumpMem(removedMem, v.symbol, v.sig, sub, v.container);
      }
    }
    for (const [k, v] of after) {
      if (before.has(k)) continue;
      for (const sub of v.subs.length ? v.subs : ['?']) {
        if (v.kind === 'decl') bump(addedDecls, declName(v.line), sub);
        else bumpMem(addedMem, v.symbol, v.sig, sub, v.container);
      }
    }

    // A symbol on both sides with a different signature is a change, not a
    // removal plus an unrelated addition.
    for (const [id, r] of Array.from(removedMem)) {
      const a = addedMem.get(id);
      if (!a) continue;
      const entry = { was: r.sigs, now: a.sigs, where: new Set([...r.where, ...a.where]), containers: r.containers };
      // Differing only by a stability tag (e.g. newly @deprecated) still
      // compiles everywhere; it is a notice, not a breaking change.
      (bare(r.sigs) === bare(a.sigs) ? tagged : changed).set(id, entry);
      removedMem.delete(id); addedMem.delete(id);
    }

    if (!changed.size && !tagged.size && !removedDecls.size && !addedDecls.size && !removedMem.size && !addedMem.size) {
      console.log(compareOnly ? 'No public API surface difference.' : 'API surface matches the committed snapshot.');
      return;
    }

    const L = [];
    const REQUIRED = /^\.?[\w$]*[^?]:/;

    L.push(compareOnly ? 'Public API surface difference:' : 'API surface changed, but api-surface/ was not updated.', '');
    L.push(`  changed: ${changed.size}   removed: ${removedDecls.size + removedMem.size}   added: ${addedDecls.size + addedMem.size}   stability-tag only: ${tagged.size}`);

    if (changed.size) {
      L.push('', 'CHANGED — existing call sites may no longer compile');
      for (const [id, e] of Array.from(changed).sort()) {
        L.push(`  ${cnames(e)} :: ${id}   ${where(e.where)}`);
        for (const w of Array.from(e.was).sort()) L.push(`      was  ${w}`);
        for (const n of Array.from(e.now).sort()) L.push(`      now  ${n}`);
      }
    }
    if (removedDecls.size || removedMem.size) {
      L.push('', 'REMOVED — consumers can no longer reference these');
      for (const [n, subs] of Array.from(removedDecls).sort()) L.push(`  ${n}   ${where(subs)}`);
      for (const [id, e] of Array.from(removedMem).sort()) {
        L.push(`  ${cnames(e)} :: ${id}   ${where(e.where)}`);
        for (const w of Array.from(e.sigs).sort()) L.push(`      was  ${w}`);
      }
    }
    if (tagged.size) {
      L.push('', 'STABILITY TAG ONLY — still compiles, no migration needed');
      for (const [id, e] of Array.from(tagged).sort()) {
        const tag = Array.from(e.now, (x) => x.match(/@[\w @]+$/)?.[0] ?? '(tag removed)').sort().join(', ');
        L.push(`  ${cnames(e)} :: ${id}   ${tag}   ${where(e.where)}`);
      }
    }
    if (addedDecls.size || addedMem.size) {
      // A new *required* member is backward-incompatible even though it reads
      // as an addition, so it gets its own heading instead of looking safe.
      const newDecls = new Set(Array.from(addedDecls.keys(), (d) => d.split(' ')[1]));
      const risky = Array.from(addedMem).filter(
        ([, e]) => Array.from(e.sigs).some((s) => REQUIRED.test(s)) && Array.from(e.containers).every((c) => !newDecls.has(shortName(c)))
      );
      const riskySet = new Set(risky.map(([id]) => id));
      if (risky.length) {
        L.push('', 'ADDED BUT REQUIRED — breaks callers that omit them');
        for (const [id, e] of risky.sort()) L.push(`  ${cnames(e)} :: ${id}${Array.from(e.sigs)[0]}   ${where(e.where)}`);
      }
      L.push('', 'ADDED — backward compatible');
      for (const [n, subs] of Array.from(addedDecls).sort()) L.push(`  ${n}   ${where(subs)}`);
      for (const [id, e] of Array.from(addedMem).sort()) {
        if (riskySet.has(id)) continue;
        L.push(`  ${cnames(e)} :: ${id}${Array.from(e.sigs)[0]}   ${where(e.where)}`);
      }
    }
    if (!compareOnly) L.push('', 'If these changes are intended:', '  npm run api-surface:gen\n  git add scripts/api-surface.txt && git commit && git push');
    L.push('', 'A removal or a signature change needs a release note and the matching version',
      'bump. Parameter renames and members moved onto a base type are not breaking.');

    const report = L.join('\n');
    console.log(report);
    if (process.env.GITHUB_STEP_SUMMARY) {
      appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## API surface changed\n\n\`\`\`\n${report}\n\`\`\`\n`);
    }
    if (!compareOnly) {
      console.log('\n::error::API surface changed but api-surface/ was not updated. See the report above.');
      process.exitCode = 1;
    }
  } finally {
    if (tmpDir) rmSync(tmpDir, { recursive: true, force: true });
  }
}

main();
