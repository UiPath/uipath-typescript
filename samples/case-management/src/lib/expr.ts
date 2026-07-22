// Resolves UiPath case-app binding expressions against case instance variables.
// Templates look like:  =vars.response.customerName
//                       =string.Format("{0}{1}{2}", vars.a, vars.b, vars.c)
// and overview "details" are JSON blobs whose values are such expressions.
import type { CaseVariables } from '@/lib/sdk';

export type VarContext = Record<string, unknown>;

/**
 * Build a name->value map the binding expressions resolve against.
 * Merges process global variables AND element inputs/outputs (the `response`
 * referenced by =vars.response.* is often an element output, not a global).
 * JSON-string values are parsed so paths can walk into them.
 */
export function buildVarContext(vars: CaseVariables | null | undefined): VarContext {
  const ctx: VarContext = {};
  if (!vars) return ctx;
  // Element inputs/outputs first, globals last so globals win on name clashes.
  for (const el of vars.elements ?? []) {
    for (const bag of [el.inputs, el.outputs]) {
      if (bag && typeof bag === 'object') {
        for (const [k, v] of Object.entries(bag)) ctx[k] = coerce(v);
      }
    }
  }
  for (const g of vars.globalVariables ?? []) ctx[g.name] = coerce(g.value);
  return ctx;
}

function coerce(v: unknown): unknown {
  if (typeof v === 'string') {
    const t = v.trim();
    if ((t.startsWith('{') && t.endsWith('}')) || (t.startsWith('[') && t.endsWith(']'))) {
      try {
        return JSON.parse(t);
      } catch {
        /* keep string */
      }
    }
  }
  return v;
}

function pathParts(path: string): string[] {
  const parts = path.split('.').map((p) => p.trim()).filter(Boolean);
  if (parts[0]?.toLowerCase() === 'vars' || parts[0]?.toLowerCase() === 'var') parts.shift();
  return parts;
}

function getPath(ctx: VarContext, path: string): unknown {
  const parts = pathParts(path);
  let cur: unknown = ctx;
  for (const part of parts) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

/** True if the root variable of the path is a known binding (even if its leaf is empty). */
function rootExists(ctx: VarContext, path: string): boolean {
  const parts = pathParts(path);
  return parts.length > 0 && Object.prototype.hasOwnProperty.call(ctx, parts[0]);
}

function formatScalar(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

function stripQuotes(s: string): string {
  const t = s.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1);
  }
  return t;
}

function isQuoted(s: string): boolean {
  const t = s.trim();
  return (t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"));
}

/** Split top-level comma-separated args, respecting quotes and parentheses. */
function splitArgs(s: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let q: string | null = null;
  let buf = '';
  for (const ch of s) {
    if (q) {
      buf += ch;
      if (ch === q) q = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      q = ch;
      buf += ch;
    } else if (ch === '(' || ch === '[') {
      depth++;
      buf += ch;
    } else if (ch === ')' || ch === ']') {
      depth--;
      buf += ch;
    } else if (ch === ',' && depth === 0) {
      out.push(buf);
      buf = '';
    } else {
      buf += ch;
    }
  }
  if (buf.trim()) out.push(buf);
  return out.map((a) => a.trim());
}

/** Resolve one token: a quoted literal, or a vars path. */
function resolveToken(token: string, ctx: VarContext): { text: string; hit: boolean } {
  const t = token.trim();
  if (isQuoted(t)) return { text: stripQuotes(t), hit: true };
  if (/^-?\d+(\.\d+)?$/.test(t)) return { text: t, hit: true };
  const v = getPath(ctx, t);
  if (v === undefined || v === null || v === '') {
    // Known variable namespace but empty leaf → resolved-but-empty, not an unbound template.
    return { text: '', hit: rootExists(ctx, t) };
  }
  return { text: formatScalar(v), hit: true };
}

export interface Resolved {
  value: string;
  resolved: boolean; // true if at least one var/literal resolved (i.e. not a raw template)
  isExpression: boolean;
}

/** Resolve a possibly-expression string against the variable context. */
export function resolveExpression(raw: unknown, ctx: VarContext): Resolved {
  if (typeof raw !== 'string') return { value: formatScalar(raw), resolved: true, isExpression: false };
  const trimmed = raw.trim();
  if (!trimmed.startsWith('=')) return { value: raw, resolved: true, isExpression: false };

  const body = trimmed.slice(1).trim();

  // string.Format("{0}{1}", a, b, ...)
  const fmt = body.match(/^string\.format\(\s*([\s\S]+)\)\s*$/i);
  if (fmt) {
    const args = splitArgs(fmt[1]);
    if (args.length) {
      const fmtStr = stripQuotes(args[0]);
      const parts = args.slice(1).map((a) => resolveToken(a, ctx));
      const out = fmtStr.replace(/\{(\d+)(?::[^}]*)?\}/g, (_, i) => parts[Number(i)]?.text ?? '');
      const hit = parts.some((p) => p.hit);
      return { value: hit ? out : raw, resolved: hit, isExpression: true };
    }
  }

  // concatenation with + or &
  if (/[+&]/.test(body) && !/[()]/.test(body)) {
    const parts = body.split(/\s*[+&]\s*/).map((p) => resolveToken(p, ctx));
    const hit = parts.some((p) => p.hit);
    return { value: hit ? parts.map((p) => p.text).join('') : raw, resolved: hit, isExpression: true };
  }

  // plain path
  const tok = resolveToken(body, ctx);
  return { value: tok.hit ? tok.text : raw, resolved: tok.hit, isExpression: true };
}

/** A label/value pair extracted from an overview "details" blob. */
export interface DetailPair {
  label: string;
  value: string;
  resolved: boolean;
}

/** Parse an overview "details" string (JSON object or "Label: value" lines) and resolve values. */
export function parseDetails(details: string, ctx: VarContext): DetailPair[] | null {
  const t = (details || '').trim();
  // JSON object form: {"Name":"=vars.response.customerName", ...}
  if (t.startsWith('{')) {
    try {
      const obj = JSON.parse(t) as Record<string, unknown>;
      return Object.entries(obj).map(([label, v]) => {
        const r = resolveExpression(v, ctx);
        return { label, value: r.value || '—', resolved: r.resolved };
      });
    } catch {
      /* fall through */
    }
  }
  // "Label: value" line form
  const lines = t.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const pairs = lines.map((l) => {
    const idx = l.indexOf(':');
    if (idx > 0 && idx < 40) {
      const r = resolveExpression(l.slice(idx + 1).trim(), ctx);
      return { label: l.slice(0, idx).trim(), value: r.value || '—', resolved: r.resolved };
    }
    return null;
  });
  if (pairs.every(Boolean) && pairs.length) return pairs as DetailPair[];
  return null;
}
