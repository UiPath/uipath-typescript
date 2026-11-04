import { useEffect, useMemo, useState } from 'react';
import type { Template } from '../services/templates';
import { platform, deployedAppUrl } from '../services/config';
import { useAuth } from '../hooks/useAuth';
import { deployTemplate, loadFolders, type DeployResponse, type Folder } from '../services/deploy';

interface Props {
  template: Template;
  onClose: () => void;
}

interface InputSchema {
  type?: string;
  title?: string;
  enum?: string[];
  default?: unknown;
  items?: { type?: string };
}

type DeployState =
  | { kind: 'idle' }
  | { kind: 'form' }
  | { kind: 'working'; startedAt: number }
  | { kind: 'done'; result: DeployResponse }
  | { kind: 'error'; message: string };

const DEPLOY_STEPS = ['Reading the stored build', 'Packing the app', 'Publishing to the tenant feed', 'Deploying into the folder'];

/** The Open step: tenant, the template's inputs, the link that carries them, and Deploy into a folder. */
export function OpenPanel({ template, onClose }: Props) {
  const { sdk } = useAuth();
  const schema = (template.manifest.inputs ?? {}) as { properties?: Record<string, InputSchema>; required?: string[] };
  const fields = Object.entries(schema.properties ?? {});
  const required = new Set(schema.required ?? []);
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map(([k, s]) => [k, s.default === undefined ? '' : Array.isArray(s.default) ? s.default.join(',') : String(s.default)])),
  );
  const [copied, setCopied] = useState(false);

  // deploy
  const [deploy, setDeploy] = useState<DeployState>({ kind: 'idle' });
  const [folders, setFolders] = useState<Folder[] | null>(null);
  const [foldersError, setFoldersError] = useState<string | null>(null);
  const [folderKey, setFolderKey] = useState((import.meta.env.VITE_DEFAULT_FOLDER_KEY as string | undefined) ?? '');
  const [packageName, setPackageName] = useState(template.entry.id);
  const [routingName, setRoutingName] = useState(template.entry.id);
  const [displayName, setDisplayName] = useState('');
  const [clientId, setClientId] = useState((import.meta.env.VITE_DEFAULT_CLIENT_ID as string | undefined) ?? '');
  const [elapsed, setElapsed] = useState(0);

  const href = useMemo(() => {
    const q = new URLSearchParams();
    if (template.manifest.requiresTenant !== false && platform.tenantName) q.set('tenant', platform.tenantName);
    for (const [k, v] of Object.entries(values)) if (v.trim() !== '') q.set(k, v.trim());
    const qs = q.toString();
    return `/open/${template.entry.id}/${qs ? `?${qs}` : ''}`;
  }, [template, values]);

  const missing = fields.filter(([k]) => required.has(k) && !values[k]?.trim()).map(([k, s]) => s.title ?? k);

  useEffect(() => {
    if (deploy.kind !== 'form' || folders !== null) return;
    const token = sdk.getToken();
    if (!token) {
      setFoldersError('Please sign in again.');
      return;
    }
    loadFolders(token)
      .then((r) => {
        setFolders(r.folders);
      })
      .catch(() => setFoldersError('Folders could not be loaded.'));
  }, [deploy.kind, folders, sdk]);

  useEffect(() => {
    if (deploy.kind !== 'working') return;
    const id = window.setInterval(() => setElapsed(Math.round((Date.now() - deploy.startedAt) / 1000)), 250);
    return () => window.clearInterval(id);
  }, [deploy]);

  const copyLink = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}${href}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  const runDeploy = async () => {
    const token = sdk.getToken();
    if (!token) return setDeploy({ kind: 'error', message: 'Please sign in again.' });
    setElapsed(0);
    setDeploy({ kind: 'working', startedAt: Date.now() });
    try {
      const inputs = Object.fromEntries(Object.entries(values).filter(([, v]) => v.trim() !== ''));
      const result = await deployTemplate(
        { templateId: template.entry.id, version: template.entry.live, folderKey, routingName: routingName.trim(), packageName: packageName.trim(), clientId: clientId.trim(), tenantName: platform.tenantName, title: displayName.trim() || routingName.trim(), inputs },
        token,
      );
      setDeploy({ kind: 'done', result });
    } catch (e) {
      setDeploy({ kind: 'error', message: e instanceof Error ? e.message : 'Something went wrong.' });
    }
  };

  const stepIndex = Math.min(DEPLOY_STEPS.length - 1, elapsed < 2 ? 0 : elapsed < 4 ? 1 : elapsed < 9 ? 2 : 3);
  const deployReady = /^[0-9a-f-]{36}$/i.test(folderKey) && /^[a-z0-9-]{4,64}$/.test(routingName.trim()) && /^[a-z0-9-]{4,64}$/.test(packageName.trim()) && /^[0-9a-f-]{36}$/i.test(clientId.trim());

  return (
    <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 flex flex-col gap-2">
      {template.manifest.requiresTenant !== false && (
        <div className="text-xs text-gray-600">
          Tenant <span className="font-medium text-gray-800">{platform.tenantName || 'none selected'}</span>
          <span className="text-gray-400"> (from your sign-in; passed as ?tenant=)</span>
        </div>
      )}

      {fields.length === 0 && <p className="text-xs text-gray-500">This template has no inputs.</p>}
      {fields.map(([key, s]) => (
        <label key={key} className="text-xs text-gray-600">
          {s.title ?? key}
          {required.has(key) && <span className="text-red-600"> *</span>}
          {s.enum ? (
            <select
              value={values[key] ?? ''}
              onChange={(e) => setValues({ ...values, [key]: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">(not set)</option>
              {s.enum.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          ) : (
            <input
              value={values[key] ?? ''}
              onChange={(e) => setValues({ ...values, [key]: e.target.value })}
              placeholder={s.type === 'array' ? 'comma separated' : s.type ?? 'text'}
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
            />
          )}
        </label>
      ))}

      <p className="text-xs text-gray-500 break-all">
        Link: <code>{href}</code>
      </p>
      <p className="text-xs text-gray-500">
        Open: inputs travel in the URL and reach the app as <code>UIPATH_PUBLIC_*</code> values; nothing is created in the org.
      </p>
      {missing.length > 0 && <p className="text-xs text-amber-700">Required: {missing.join(', ')}</p>}

      <div className="flex gap-2">
        <a
          href={href}
          className={`flex-1 text-center rounded-lg text-sm font-medium px-3 py-2 ${missing.length ? 'bg-blue-300 text-white pointer-events-none' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
        >
          Open
        </a>
        <button type="button" onClick={copyLink} className="rounded-lg border border-gray-300 text-sm px-3 py-2">
          {copied ? 'Copied' : 'Copy link'}
        </button>
        <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 text-sm px-3 py-2">
          Cancel
        </button>
      </div>

      <div className="border-t border-gray-200 pt-2 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-600">
            <span className="font-medium text-gray-800">Deploy to a folder</span>: same inputs for everyone, a fixed URL, folder access.
          </div>
          {deploy.kind === 'idle' && (
            <button type="button" onClick={() => setDeploy({ kind: 'form' })} className="rounded-lg border border-gray-300 text-xs px-2 py-1">
              Deploy...
            </button>
          )}
        </div>

        {deploy.kind === 'form' && (
          <div className="flex flex-col gap-2">
            <label className="text-xs text-gray-600">
              Folder key
              {folders === null && !foldersError && <span className="ml-2 text-gray-400">loading your folders...</span>}
              {foldersError && <span className="ml-2 text-gray-400">({foldersError} Paste the key from Orchestrator, folder settings.)</span>}
              <input
                value={folderKey}
                onChange={(e) => setFolderKey(e.target.value.trim())}
                list="gallery-folder-keys"
                placeholder="00000000-0000-0000-0000-000000000000"
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-mono"
              />
              {folders && folders.length > 0 && (
                <datalist id="gallery-folder-keys">
                  {folders.map((f) => (
                    <option key={f.key} value={f.key}>{f.fullyQualifiedName || f.displayName}</option>
                  ))}
                </datalist>
              )}
            </label>
            <label className="text-xs text-gray-600">
              Package name
              <input value={packageName} onChange={(e) => setPackageName(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-mono" />
              <span className="text-gray-400">in the tenant feed; a version already there is reused</span>
            </label>
            <label className="text-xs text-gray-600">
              URL name (routing name)
              <input value={routingName} onChange={(e) => setRoutingName(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-mono" />
              <span className="text-gray-400">lowercase letters, digits, hyphens; must be unique in the org</span>
            </label>
            <label className="text-xs text-gray-600">
              Display name
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={routingName.trim() || template.manifest.name}
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
              />
              <span className="text-gray-400">shown in the Apps list; must be unique in the org (defaults to the URL name)</span>
            </label>
            <label className="text-xs text-gray-600">
              External application client ID
              <input
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="00000000-0000-0000-0000-000000000000"
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-mono"
              />
              <span className="text-gray-400">
                A non-confidential app with the deployed URL as redirect URI and at least this template's scopes ({(template.manifest as { scope?: string }).scope ?? 'see uipath.json'}).
              </span>
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={runDeploy}
                disabled={!deployReady}
                className="flex-1 rounded-lg bg-gray-900 text-white text-sm font-medium px-3 py-2 disabled:opacity-50"
              >
                Deploy
              </button>
              <button type="button" onClick={() => setDeploy({ kind: 'idle' })} className="rounded-lg border border-gray-300 text-sm px-3 py-2">
                Cancel
              </button>
            </div>
          </div>
        )}

        {deploy.kind === 'working' && (
          <div className="rounded-lg bg-white border border-gray-200 p-3">
            <div className="flex items-center gap-2 text-sm text-gray-800">
              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-700" />
              <span>{DEPLOY_STEPS[stepIndex]}</span>
              <span className="ml-auto text-xs text-gray-500">{elapsed}s</span>
            </div>
            <ol className="mt-2 space-y-1 text-xs">
              {DEPLOY_STEPS.map((s, i) => (
                <li key={s} className={i < stepIndex ? 'text-green-700' : i === stepIndex ? 'text-gray-800' : 'text-gray-400'}>
                  {i < stepIndex ? '✓' : i === stepIndex ? '•' : '○'} {s}
                </li>
              ))}
            </ol>
          </div>
        )}

        {deploy.kind === 'done' && (
          <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm">
            <p className="text-green-900 font-medium">Deployed</p>
            <p className="text-green-800 text-xs mt-1">
              Package <code>{deploy.result.packageName}</code> {deploy.result.packageVersion} ({deploy.result.upload === 'exists' ? 'already in the feed' : 'uploaded'}, {deploy.result.registered === 'reused' ? 'registered earlier' : 'registered'}), app{' '}
              <code>{deploy.result.systemName}</code> v{deploy.result.deployVersion}, deployment <code>{deploy.result.deploymentId}</code>.
            </p>
            {deploy.result.warnings.map((w) => (
              <p key={w} className="text-amber-700 text-xs mt-1">{w}</p>
            ))}
            {(() => {
              const url = deploy.result.url ?? deployedAppUrl(deploy.result.routingName);
              return (
                <>
                  <p className="text-xs text-green-800 mt-2 break-all">
                    App URL: <a href={url} target="_blank" rel="noreferrer" className="underline font-mono">{url}</a>
                  </p>
                  <a href={url} target="_blank" rel="noreferrer" className="inline-block mt-2 rounded-lg bg-green-700 text-white text-sm font-medium px-3 py-2 hover:bg-green-800">
                    Open the deployed app
                  </a>
                </>
              );
            })()}
            <button type="button" onClick={() => setDeploy({ kind: 'idle' })} className="ml-3 text-xs text-green-800 underline">
              Done
            </button>
          </div>
        )}

        {deploy.kind === 'error' && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm">
            <p className="text-red-800">{deploy.message}</p>
            <button type="button" onClick={() => setDeploy({ kind: 'form' })} className="mt-1 text-xs text-red-800 underline">
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
