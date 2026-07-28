import { useEffect, useMemo, useState } from 'react';
import type { MethodManifest, ParamManifest, ServiceManifest } from '../types/manifest';
import { ResponseViewer, type InvocationResult } from './ResponseViewer';

interface MethodPanelProps {
  service: ServiceManifest;
  method: MethodManifest;
  version: string;
  connected: boolean;
  running: boolean;
  result: InvocationResult | null;
  onRun: (values: Record<string, string>) => void;
}

function ParamInput({ param, value, onChange }: { param: ParamManifest; value: string; onChange: (v: string) => void }) {
  switch (param.kind) {
    case 'boolean':
      return (
        <select value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">{param.optional ? '(omit)' : 'select…'}</option>
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      );
    case 'enum':
      return (
        <select value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">{param.optional ? '(omit)' : 'select…'}</option>
          {param.enumValues?.map((v) => (
            <option key={String(v)} value={String(v)}>
              {String(v)}
            </option>
          ))}
        </select>
      );
    case 'date':
      return <input type="datetime-local" value={value} onChange={(e) => onChange(e.target.value)} />;
    case 'number':
      return <input type="number" value={value} onChange={(e) => onChange(e.target.value)} placeholder={param.typeText} />;
    case 'json':
      return (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={param.optional ? '{ } — leave empty to omit' : '{ }'}
          rows={value.split('\n').length > 4 ? Math.min(value.split('\n').length + 1, 16) : 4}
          spellCheck={false}
        />
      );
    default:
      return <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={param.typeText} spellCheck={false} />;
  }
}

/** Builds a copy-pasteable TypeScript snippet. Credentials are always masked. */
function buildSnippet(service: ServiceManifest, method: MethodManifest, values: Record<string, string>, version: string): string {
  const args = method.params
    .map((p) => {
      const raw = (values[p.name] ?? '').trim();
      if (raw === '') return undefined;
      if (p.kind === 'string') return JSON.stringify(raw);
      if (p.kind === 'enum' && typeof p.enumValues?.[0] === 'string') return JSON.stringify(raw);
      if (p.kind === 'date') return `new Date(${JSON.stringify(raw)})`;
      return raw;
    })
    .filter((a): a is string => a !== undefined);

  return [
    `import { UiPath } from '@uipath/uipath-typescript@${version}/core';`,
    `import { ${service.name} } from '@uipath/uipath-typescript@${version}/${service.subpath}';`,
    '',
    `const sdk = new UiPath({`,
    `  baseUrl: '<YOUR_BASE_URL>',`,
    `  orgName: '<YOUR_ORG>',`,
    `  tenantName: '<YOUR_TENANT>',`,
    `  secret: '<YOUR_SECRET>', // never hardcode — load from a secure store`,
    `});`,
    `await sdk.initialize();`,
    '',
    `const service = new ${service.name}(sdk);`,
    `const result = await service.${method.name}(${args.join(', ')});`,
  ].join('\n');
}

export function MethodPanel({ service, method, version, connected, running, result, onRun }: MethodPanelProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [showExample, setShowExample] = useState(false);
  const [showSnippet, setShowSnippet] = useState(false);

  useEffect(() => {
    setValues({});
    setShowExample(false);
  }, [service.name, method.name, version]);

  const requiredMissing = method.params.some((p) => !p.optional && (values[p.name] ?? '').trim() === '');
  const snippet = useMemo(() => buildSnippet(service, method, values, version), [service, method, values, version]);

  return (
    <main className="panel method-panel">
      <header>
        <h2>
          <span className="service-name">{service.name}.</span>
          {method.name}()
        </h2>
        {method.description && <p className="method-description">{method.description}</p>}
        <code className="return-type">{method.returnType}</code>
      </header>

      {method.example && (
        <details className="example" open={showExample} onToggle={(e) => setShowExample((e.target as HTMLDetailsElement).open)}>
          <summary>Example from SDK docs</summary>
          <pre>{method.example.replace(/^```\w*\n?/, '').replace(/```$/, '')}</pre>
        </details>
      )}

      <div className="params">
        {method.params.length === 0 && <p className="hint">This method takes no parameters.</p>}
        {method.params.map((param) => (
          <div key={param.name} className="param-row">
            <label>
              <span className="param-name">
                {param.name}
                {!param.optional && <span className="required">*</span>}
              </span>
              <span className="param-type">{param.typeText}</span>
            </label>
            <ParamInput param={param} value={values[param.name] ?? ''} onChange={(v) => setValues((prev) => ({ ...prev, [param.name]: v }))} />
            {param.kind === 'json' && param.properties && (
              <details className="shape-hint">
                <summary>shape</summary>
                <ul>
                  {param.properties.map((prop) => (
                    <li key={prop.name}>
                      <code>
                        {prop.name}
                        {prop.optional ? '?' : ''}: {prop.typeText}
                      </code>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        ))}
      </div>

      <div className="run-row">
        <button className="primary" disabled={!connected || running || requiredMissing} onClick={() => onRun(values)}>
          {running ? 'Running…' : 'Run'}
        </button>
        {!connected && <span className="hint">Connect first to run methods.</span>}
        <button className="ghost" onClick={() => setShowSnippet((s) => !s)}>
          {showSnippet ? 'Hide code' : 'Show code'}
        </button>
      </div>

      {showSnippet && (
        <div className="snippet">
          <pre>{snippet}</pre>
          <button className="ghost" onClick={() => navigator.clipboard.writeText(snippet)}>
            Copy
          </button>
        </div>
      )}

      <ResponseViewer result={result} />
    </main>
  );
}
