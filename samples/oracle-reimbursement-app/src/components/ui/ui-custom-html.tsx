import { useLayoutEffect, useRef, useState } from 'react';
import { Guarded, baseAttrs, isHidden, useOnLoad, type UiBaseProps } from './ui-base';
import { sanitizeHtml } from './sanitize';

/** What a page hands a Custom HTML control so its script can use `App` — see `src/custom-html/bridge.ts`. */
export interface CustomHtmlBridge {
  /** The script that runs in the frame before the control's own code. */
  boot: string;
  /** This app's name, which keeps its controls' storage apart from other apps' on the same origin. */
  storageScope: string;
  has(name: string): boolean;
  get(name: string): unknown;
  set(name: string, value: unknown): void;
  subscribe(listener: () => void): () => void;
}

/** A control's own code — the files under `src/custom-html/`. */
export interface CustomHtmlCode {
  html?: string;
  css?: string;
  js?: string;
  cssExternal: string[];
  jsExternal: string[];
  bridge: CustomHtmlBridge;
}

export interface UiCustomHtmlProps extends UiBaseProps {
  text?: string;
  /** Present when the control has its own HTML, CSS and JavaScript, rather than inline `text`. */
  code?: CustomHtmlCode;
}

/**
 * Renders authored HTML.
 *
 * Inline `text` is sanitised and placed in the page — it can come from an expression, and
 * therefore from user-entered data. See `sanitize.ts`.
 *
 * A control's own HTML, CSS and JavaScript run as written, in a sandboxed frame, talking to
 * the app through `App.getVariable` / `setVariable` / `onVariableChange` / `setHeight`.
 */
function UiCustomHtmlImpl(p: UiCustomHtmlProps) {
  useOnLoad(p);
  if (isHidden(p)) return null;
  if (p.code) return <CustomHtmlFrame {...p} code={p.code} />;
  return (
    <div
      {...baseAttrs({ ...p, e2e: "forms-host-custom-html-control" })}
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(p.text ?? '') }}
    />
  );
}

/**
 * The frame's document: the control's code as data, then the boot script that builds the
 * control from it. `<` is escaped inside the JSON so no document can close the script that
 * carries it. `nonce` lets the page tell this document from one the frame navigates to.
 */
function frameDocument(code: CustomHtmlCode, disabled: boolean, nonce: string): string {
  const payload = JSON.stringify({
    html: code.html ?? '', css: code.css ?? '', js: code.js ?? '',
    cssExternal: code.cssExternal, jsExternal: code.jsExternal, disabled, nonce,
  }).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  return '<!DOCTYPE html><html><head><meta charset="utf-8">'
    + '<style>html,body{height:100%;margin:0}</style>'
    + '<script>window.__uiappCustomHtml=' + payload + ';</script>'
    + '<script>' + code.bridge.boot.replace(/<\/script/gi, '<\\/script') + '</script>'
    + '</head><body></body></html>';
}

/** Sends a message carrying `value` as-is, or its JSON form when it cannot be cloned; false if neither. */
function sendValue(port: MessagePort | null, build: (value: unknown) => object, value: unknown): boolean {
  if (!port) return false;
  try {
    port.postMessage(build(value));
    return true;
  } catch {
    try {
      port.postMessage(build(JSON.parse(JSON.stringify(value ?? null))));
      return true;
    } catch {
      return false;
    }
  }
}

const UNSENDABLE = { error: 'The value cannot be sent to the control.' };

function randomNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** A copy to compare later values against, so a value changed in place still counts as a change. */
function copyOf(value: unknown): unknown {
  try {
    return structuredClone(value);
  } catch {
    return value;
  }
}

/**
 * Deep equality, as Apps decides whether a variable changed: same primitives (NaN equal to
 * NaN), same dates, and arrays and objects with the same keys holding equal values — a key
 * holding `undefined` is not the same as a missing one. Cycles are followed once.
 */
function same(a: unknown, b: unknown, seen = new Map<object, object>()): boolean {
  if (a === b || (a !== a && b !== b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  const isDate = (v: object): v is Date => Object.prototype.toString.call(v) === '[object Date]';
  if (isDate(a) || isDate(b)) return isDate(a) && isDate(b) && a.getTime() === b.getTime();
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (seen.get(a) === b) return true;
  seen.set(a, b);
  const x = a as Record<string, unknown>;
  const y = b as Record<string, unknown>;
  const keys = Object.keys(x);
  if (keys.length !== Object.keys(y).length) return false;
  return keys.every((k) => Object.prototype.hasOwnProperty.call(y, k) && same(x[k], y[k], seen));
}

/*
 * The controls' `localStorage`, `sessionStorage` and `document.cookie`. The frame cannot
 * use this app's own storage, so the page keeps the controls' entries under a prefix of its
 * own — `uiapp-custom-html:<app>:<area>:<key>` — and shares them between every Custom HTML
 * control in this app, and no other: `local` in localStorage, `session` and `cookie`
 * together in sessionStorage. Apps on one origin share the browser's quota, so the budget
 * counts every app's entries in a browser store, well under the browser's limit so that
 * the app's own storage always has room. The frame applies the same budget.
 */
type Area = 'local' | 'session' | 'cookie';
const AREAS: readonly Area[] = ['local', 'session', 'cookie'];
const PREFIX = 'uiapp-custom-html:';
const BUDGET = 1_000_000;
const MAX_KEYS = 10_000;
const openFrames = new Set<MessagePort>();

function backing(area: Area): Storage | null {
  try {
    return area === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

/** Every prefixed entry in one browser store, by its full key. Rebuilt when another tab writes. */
const ledgers = new Map<Storage, Map<string, string>>();
if (typeof window !== 'undefined') window.addEventListener('storage', () => ledgers.clear());

function ledger(store: Storage): Map<string, string> {
  let entries = ledgers.get(store);
  if (!entries) {
    entries = new Map();
    for (let i = 0; i < store.length; i++) {
      const k = store.key(i);
      if (k?.startsWith(PREFIX)) entries.set(k, store.getItem(k) ?? '');
    }
    ledgers.set(store, entries);
  }
  return entries;
}

/** The prefix of one app's entries in one area; the app's name is encoded so it holds no `:`. */
function prefixOf(scope: string, area: Area): string {
  return PREFIX + encodeURIComponent(scope) + ':' + area + ':';
}

interface Snapshot {
  scope: string;
  local: Record<string, string>;
  session: Record<string, string>;
  cookie: Record<string, string>;
  /** What other apps' entries already use of each browser store's budget. */
  reserved: { local: { chars: number; keys: number }; session: { chars: number; keys: number } };
}

function snapshot(scope: string): Snapshot {
  // Null-prototype, so an entry named `__proto__` is kept like any other.
  const out: Snapshot = {
    scope: encodeURIComponent(scope),
    local: Object.create(null), session: Object.create(null), cookie: Object.create(null),
    reserved: { local: { chars: 0, keys: 0 }, session: { chars: 0, keys: 0 } },
  };
  const mine = PREFIX + encodeURIComponent(scope) + ':';
  for (const store of ['local', 'session'] as const) {
    const s = backing(store);
    if (!s) continue;
    ledger(s).forEach((v, k) => {
      if (!k.startsWith(mine)) {
        out.reserved[store].chars += k.length + v.length;
        out.reserved[store].keys++;
      }
    });
  }
  for (const area of AREAS) {
    const store = backing(area);
    if (!store) continue;
    const prefix = prefixOf(scope, area);
    ledger(store).forEach((v, k) => {
      if (k.startsWith(prefix)) out[area][k.slice(prefix.length)] = v;
    });
  }
  return out;
}

/** What the page holds for one key, or null. */
function stored(scope: string, area: Area, key: string): string | null {
  const store = backing(area);
  return store ? ledger(store).get(prefixOf(scope, area) + key) ?? null : null;
}

/** Keeps one change; false when it is malformed, over the budget, or the browser refuses it. */
function keep(scope: string, area: Area, key: unknown, value: unknown, clear: boolean): boolean {
  const store = backing(area);
  if (!store) return false;
  const prefix = prefixOf(scope, area);
  try {
    const entries = ledger(store);
    if (clear) {
      [...entries.keys()].filter((k) => k.startsWith(prefix)).forEach((k) => {
        store.removeItem(k);
        entries.delete(k);
      });
      return true;
    }
    if (typeof key !== 'string' || (value !== null && typeof value !== 'string')) return false;
    const full = prefix + key;
    if (value === null) {
      store.removeItem(full);
      entries.delete(full);
      return true;
    }
    let chars = full.length + value.length;
    entries.forEach((v, k) => {
      if (k !== full) chars += k.length + v.length;
    });
    if (chars > BUDGET || entries.size + (entries.has(full) ? 0 : 1) > MAX_KEYS) return false;
    store.setItem(full, value);
    entries.set(full, value);
    return true;
  } catch {
    return false;
  }
}

const LOAD_ERROR = 'Failed to load the following external resources.';

/**
 * Sandboxed without `allow-same-origin`, so the control's script cannot reach this app's
 * page, session or storage; the channel below is the only way out.
 */
function CustomHtmlFrame(p: UiCustomHtmlProps & { code: CustomHtmlCode }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const { code } = p;
  const disabled = p.disabled === true;
  // As in Apps, the frame is built once with the control's state at that moment; a later
  // change to `disabled` blocks or frees the control without rebuilding it.
  const initiallyDisabled = useRef(disabled).current;
  // A new secret only when the code itself changes, not on every render of the page.
  const source = JSON.stringify([code.html, code.css, code.js, code.cssExternal, code.jsExternal]);
  const secret = useRef<{ source: string; nonce: string } | null>(null);
  if (secret.current?.source !== source) secret.current = { source, nonce: randomNonce() };
  const nonce = secret.current.nonce;
  const doc = frameDocument(code, initiallyDisabled, nonce);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState<string[]>([]);

  // A layout effect, so the listener is in place before the frame can load and say ready.
  useLayoutEffect(() => {
    const iframe = frame.current;
    if (!iframe) return undefined;
    const bridge = code.bridge;
    let port: MessagePort | null = null;
    const watches = new Map<string, { last: unknown; stop: () => void }>();
    const invalid = { code: 'invalid-variable-name' };
    const reply = (id: unknown, ok: boolean, data: unknown) => {
      if (!sendValue(port, (d) => ({ type: 'reply', id, ok, data: d }), data)) {
        port?.postMessage({ type: 'reply', id, ok: false, data: UNSENDABLE });
      }
    };

    const onPort = (e: MessageEvent) => {
      const m = (e.data ?? {}) as {
        type?: unknown; id?: unknown; name?: unknown; value?: unknown;
        area?: unknown; key?: unknown; clear?: unknown; url?: unknown;
      };
      const name = typeof m.name === 'string' ? m.name : '';
      switch (m.type) {
        case 'get':
          if (!bridge.has(name)) reply(m.id, false, invalid);
          else reply(m.id, true, bridge.get(name));
          return;
        case 'set':
          if (!bridge.has(name)) {
            reply(m.id, false, invalid);
            return;
          }
          bridge.set(name, m.value);
          reply(m.id, true, undefined);
          return;
        case 'watch': {
          if (!bridge.has(name)) {
            port?.postMessage({ type: 'error',
              data: 'onVariableChange registration failed. "' + name + '" is not a valid app variable name' });
            return;
          }
          if (watches.has(name)) return;
          // No initial value: a script reads one with getVariable.
          const w = { last: copyOf(bridge.get(name)), stop: () => {} };
          w.stop = bridge.subscribe(() => {
            const value = bridge.get(name);
            if (same(value, w.last)) return;
            w.last = copyOf(value);
            if (!sendValue(port, (v) => ({ type: 'change', name, value: v }), value)) {
              port?.postMessage({ type: 'error', data: 'onVariableChange: the new value of "' + name + '" cannot be sent to the control' });
            }
          });
          watches.set(name, w);
          return;
        }
        case 'unwatch':
          watches.get(name)?.stop();
          watches.delete(name);
          return;
        case 'height': {
          // The frame has already checked the value; checked again because the page does not
          // trust the frame.
          const h = String(m.value ?? '');
          if (h && CSS.supports('height', h)) iframe.style.height = h;
          return;
        }
        case 'storage': {
          const area = AREAS.find((a) => a === m.area);
          const clear = m.clear === true;
          if (!area) return;
          if (!keep(bridge.storageScope, area, m.key, m.value ?? null, clear)) {
            // Not kept — the app's own storage is full, say: put the frame back as it was,
            // so it does not go on reading a value a reload would lose.
            if (!clear && typeof m.key === 'string') {
              port?.postMessage({ type: 'storage-rejected', area, key: m.key, value: stored(bridge.storageScope, area, m.key) });
            }
            return;
          }
          const change = { type: 'storage', area, key: m.key, value: m.value ?? null, clear };
          openFrames.forEach((other) => {
            if (other !== port) other.postMessage(change);
          });
          return;
        }
        case 'resource-error':
          if (typeof m.url === 'string') {
            const url = m.url;
            setFailed((list) => (list.includes(url) ? list : [...list, url]));
          }
          return;
        case 'loaded':
          setLoading(false);
          return;
        default:
      }
    };

    const disconnect = () => {
      watches.forEach((w) => w.stop());
      watches.clear();
      if (port) openFrames.delete(port);
      port?.close();
      port = null;
    };

    // Only this frame, and only the document written here — which carries `nonce`; a page the
    // frame navigates to does not. The document may reload itself, and is then connected anew.
    const onWindow = (e: MessageEvent) => {
      if (e.source !== iframe.contentWindow || e.origin !== 'null') return;
      const ready = e.data as { type?: unknown; nonce?: unknown } | null;
      if (ready?.type !== 'uiapp-custom-html-ready' || ready.nonce !== nonce) return;
      disconnect();
      setLoading(true);
      setFailed([]);
      const channel = new MessageChannel();
      port = channel.port1;
      port.onmessage = onPort;
      openFrames.add(port);
      iframe.contentWindow?.postMessage({ type: 'uiapp-custom-html-port', storage: snapshot(bridge.storageScope) }, '*', [channel.port2]);
    };
    window.addEventListener('message', onWindow);
    return () => {
      window.removeEventListener('message', onWindow);
      disconnect();
    };
  }, [doc, nonce, code.bridge]);

  const attrs = baseAttrs(p);
  const label = p.ariaLabel === undefined || p.ariaLabel === null || p.ariaLabel === '' ? p.ctl : String(p.ariaLabel);
  const error = failed.length ? LOAD_ERROR + '\n' + failed.join('\n') : '';
  return (
    <div {...attrs} style={disabled ? { ...attrs.style, pointerEvents: 'none' } : attrs.style}>
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <iframe
          ref={frame}
          title={label}
          srcDoc={doc}
          sandbox="allow-scripts allow-forms"
          referrerPolicy="no-referrer"
          tabIndex={disabled ? -1 : 0}
          style={{ display: 'block', width: '100%', height: '100%', border: 0 }}
        />
        {loading && (
          <svg
            aria-hidden="true"
            width="32"
            height="32"
            viewBox="0 0 32 32"
            style={{ position: 'absolute', top: '50%', left: '50%', margin: '-16px 0 0 -16px', pointerEvents: 'none' }}
          >
            <circle cx="16" cy="16" r="13" fill="none" stroke="#0067df" strokeWidth="3" strokeLinecap="round" strokeDasharray="61 21">
              <animateTransform attributeName="transform" type="rotate" from="0 16 16" to="360 16 16" dur="0.9s" repeatCount="indefinite" />
            </circle>
          </svg>
        )}
        {error && (
          <svg
            role="img"
            aria-label={error}
            width="20"
            height="20"
            viewBox="0 0 20 20"
            style={{ position: 'absolute', top: 8, right: 8 }}
          >
            <title>{error}</title>
            <circle cx="10" cy="10" r="9" fill="#cc3d45" />
            <rect x="9" y="4.5" width="2" height="7" rx="1" fill="#fff" />
            <circle cx="10" cy="14.5" r="1.2" fill="#fff" />
          </svg>
        )}
      </div>
    </div>
  );
}

/** The exported control: the real component inside its own error boundary. */
export function UiCustomHtml(p: UiCustomHtmlProps) {
  return <Guarded ctl={p.ctl}><UiCustomHtmlImpl {...p} /></Guarded>;
}
