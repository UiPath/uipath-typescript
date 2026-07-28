import { useCallback, useEffect, useRef, useState } from 'react';
import { SDK_VERSIONS, VERSION_LIST } from './sdk/registry.gen';
import {
  clearOAuthConnection,
  createClient,
  createService,
  disposeClient,
  invokeMethod,
  loadOAuthConnection,
  resumeClient,
  saveOAuthConnection,
  type ConnectionConfig,
  type PlaygroundClient,
} from './sdk/client';
import type { MethodManifest, ServiceManifest, VersionManifest } from './types/manifest';
import { ConnectionPanel, type ConnectionStatus } from './components/ConnectionPanel';
import { ServiceTree } from './components/ServiceTree';
import { MethodPanel } from './components/MethodPanel';
import type { InvocationResult } from './components/ResponseViewer';

interface Selection {
  service: ServiceManifest;
  method: MethodManifest;
}

export function App() {
  const [version, setVersion] = useState<string>(VERSION_LIST[0] ?? '');
  const [manifest, setManifest] = useState<VersionManifest | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);

  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [statusDetail, setStatusDetail] = useState<string>();
  const clientRef = useRef<PlaygroundClient | null>(null);
  const configRef = useRef<ConnectionConfig | null>(null);

  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<InvocationResult | null>(null);

  // Load the manifest whenever the version changes; keep the selection if the
  // same service+method still exists in the newly selected version.
  useEffect(() => {
    let cancelled = false;
    setManifest(null);
    SDK_VERSIONS[version]
      ?.manifest()
      .then((m) => {
        if (cancelled) return;
        setManifest(m);
        setSelection((prev) => {
          if (!prev) return null;
          const service = m.services.find((s) => s.name === prev.service.name);
          const method = service?.methods.find((mm) => mm.name === prev.method.name);
          return service && method ? { service, method } : null;
        });
        setResult(null);
      })
      .catch(() => {
        if (!cancelled) setManifest(null);
      });
    return () => {
      cancelled = true;
    };
  }, [version]);

  // The SDK client is version-specific: switching versions or credentials
  // always tears down the old instance so no token or socket carries over.
  const teardown = useCallback(() => {
    disposeClient(clientRef.current);
    clientRef.current = null;
    setStatus('disconnected');
  }, []);

  const connect = useCallback(
    async (config: ConnectionConfig) => {
      teardown();
      setStatus('connecting');
      setStatusDetail(undefined);
      try {
        if (config.mode === 'oauth') {
          // initialize() navigates to the identity server — persist the public
          // config (never the PAT) so the connection resumes after redirect
          saveOAuthConnection(version, config);
        } else {
          clearOAuthConnection();
        }
        const client = await createClient(version, config);
        clientRef.current = client;
        configRef.current = config;
        setStatus('connected');
      } catch (err) {
        configRef.current = null;
        if (config.mode === 'oauth') clearOAuthConnection();
        setStatus('error');
        setStatusDetail(err instanceof Error ? err.message : String(err));
      }
    },
    [version, teardown]
  );

  // Resume an OAuth connection after the identity-server redirect (or reuse a
  // cached token on reload) — never starts a new sign-in. Ref-guarded: React
  // StrictMode double-invokes effects in dev, and the OAuth callback code is
  // single-use — completing it twice fails the second exchange.
  const didResumeOAuth = useRef(false);
  useEffect(() => {
    if (didResumeOAuth.current) return;
    didResumeOAuth.current = true;
    const stored = loadOAuthConnection();
    if (!stored) return;
    setVersion(stored.version);
    setStatus('connecting');
    resumeClient(stored.version, stored.config)
      .then((client) => {
        if (client) {
          clientRef.current = client;
          configRef.current = stored.config;
          setStatus('connected');
        } else {
          // sign-in required — leave it to an explicit click on Connect
          setStatus('disconnected');
        }
      })
      .catch((err) => {
        clearOAuthConnection();
        setStatus('error');
        setStatusDetail(err instanceof Error ? err.message : String(err));
      });
  }, []);

  // Version switch with an active connection: rebuild the client on the new
  // version using the same (still in-memory) config.
  const changeVersion = useCallback(
    (next: string) => {
      setVersion(next);
      setResult(null);
      if (clientRef.current && configRef.current) {
        const config = configRef.current;
        teardown();
        setStatus('connecting');
        if (config.mode === 'oauth') saveOAuthConnection(next, config);
        createClient(next, config)
          .then((client) => {
            clientRef.current = client;
            setStatus('connected');
          })
          .catch((err) => {
            setStatus('error');
            setStatusDetail(err instanceof Error ? err.message : String(err));
          });
      }
    },
    [teardown]
  );

  useEffect(() => () => disposeClient(clientRef.current), []);

  const run = useCallback(
    async (values: Record<string, string>) => {
      const client = clientRef.current;
      if (!client || !selection) return;
      setRunning(true);
      setResult(null);
      const started = performance.now();
      try {
        const instance = await createService(client, selection.service);
        const data = await invokeMethod(instance, selection.method, values);
        setResult({ ok: true, data, durationMs: Math.round(performance.now() - started) });
      } catch (err) {
        setResult({
          ok: false,
          error: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
          durationMs: Math.round(performance.now() - started),
        });
      } finally {
        setRunning(false);
      }
    },
    [selection]
  );

  return (
    <div className="layout">
      <header className="topbar">
        <h1>UiPath SDK Playground</h1>
        <label className="version-picker">
          SDK version
          <select value={version} onChange={(e) => changeVersion(e.target.value)}>
            {VERSION_LIST.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </label>
      </header>

      <div className="columns">
        <div className="left-column">
          <ConnectionPanel status={status} statusDetail={statusDetail} onConnect={connect} />
          <ServiceTree
            manifest={manifest}
            selectedService={selection?.service.name}
            selectedMethod={selection?.method.name}
            onSelect={(service, method) => {
              setSelection({ service, method });
              setResult(null);
            }}
          />
        </div>

        {selection ? (
          <MethodPanel
            service={selection.service}
            method={selection.method}
            version={version}
            connected={status === 'connected'}
            running={running}
            result={result}
            onRun={run}
          />
        ) : (
          <main className="panel method-panel empty">
            <p>Select a method from the tree to inspect and run it.</p>
            {manifest && (
              <p className="hint">
                SDK {manifest.version} exposes {manifest.services.length} services with{' '}
                {manifest.services.reduce((n, s) => n + s.methods.length, 0)} methods.
              </p>
            )}
          </main>
        )}
      </div>
    </div>
  );
}
