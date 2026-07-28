export interface InvocationResult {
  ok: boolean;
  data?: unknown;
  error?: string;
  durationMs: number;
}

/** Names of bound entity methods present on a response object (e.g. task.assign). */
function collectBoundMethods(value: unknown): string[] {
  const names = new Set<string>();
  const visit = (v: unknown) => {
    if (v === null || typeof v !== 'object') return;
    if (Array.isArray(v)) {
      v.slice(0, 5).forEach(visit);
      return;
    }
    for (const [key, prop] of Object.entries(v)) {
      if (typeof prop === 'function') names.add(key);
    }
  };
  visit(value);
  if (value && typeof value === 'object' && 'items' in value) {
    visit((value as { items: unknown }).items);
  }
  return [...names];
}

function serialize(value: unknown): string {
  if (value === undefined) return 'undefined (no response body)';
  try {
    const seen = new WeakSet<object>();
    return JSON.stringify(
      value,
      (_key, v: unknown) => {
        if (typeof v === 'function') return `ƒ ${(v as { name?: string }).name || 'boundMethod'}()`;
        if (typeof v === 'object' && v !== null) {
          if (seen.has(v)) return '[circular]';
          seen.add(v);
        }
        return v;
      },
      2
    );
  } catch {
    return String(value);
  }
}

export function ResponseViewer({ result }: { result: InvocationResult | null }) {
  if (!result) return null;

  const boundMethods = result.ok ? collectBoundMethods(result.data) : [];

  return (
    <section className={`response ${result.ok ? 'ok' : 'failed'}`}>
      <div className="response-meta">
        <span className={`status-pill ${result.ok ? 'status-connected' : 'status-error'}`}>{result.ok ? 'Success' : 'Failed'}</span>
        <span className="duration">{result.durationMs} ms</span>
        {boundMethods.length > 0 && (
          <span className="bound-methods" title="Callable methods attached to this response by the SDK">
            bound: {boundMethods.map((m) => `${m}()`).join(' ')}
          </span>
        )}
      </div>
      <pre className="response-body">{result.ok ? serialize(result.data) : result.error}</pre>
    </section>
  );
}
