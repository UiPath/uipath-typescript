import { useEffect, useState } from 'react';
import type { Template } from '../services/templates';
import type { CopyResponse } from '../services/copies';
import { platform } from '../services/config';
import { OpenPanel } from './OpenPanel';

interface Props {
  template: Template;
  onEdit: (template: Template, solutionName: string) => Promise<CopyResponse>;
}

type EditState =
  | { kind: 'idle' }
  | { kind: 'opening' }
  | { kind: 'naming' }
  | { kind: 'working'; startedAt: number }
  | { kind: 'done'; result: CopyResponse; solutionName: string }
  | { kind: 'error'; message: string };

const STEPS = [
  'Reading the template from storage',
  'Creating the solution and project',
  'Uploading source and build',
  'Finishing up',
];

export function TemplateCard({ template, onEdit }: Props) {
  const { manifest, entry, releaseNotes } = template;
  const [state, setState] = useState<EditState>({ kind: 'idle' });
  const [name, setName] = useState(`${manifest.name} (copy)`);
  const [elapsed, setElapsed] = useState(0);
  const inputs = Object.values(manifest.inputs?.properties ?? {}).map((p) => p.title).filter(Boolean);

  useEffect(() => {
    if (state.kind !== 'working') return;
    const id = window.setInterval(() => setElapsed(Math.round((Date.now() - state.startedAt) / 1000)), 250);
    return () => window.clearInterval(id);
  }, [state]);

  const createCopy = async () => {
    const solutionName = name.trim() || `${manifest.name} (copy)`;
    setElapsed(0);
    setState({ kind: 'working', startedAt: Date.now() });
    try {
      const result = await onEdit(template, solutionName);
      setState({ kind: 'done', result, solutionName });
    } catch (e) {
      setState({ kind: 'error', message: e instanceof Error ? e.message : 'Something went wrong.' });
    }
  };

  // The backend is one call, so the step shown is an estimate from elapsed time, not real progress.
  const stepIndex = Math.min(STEPS.length - 1, elapsed < 2 ? 0 : elapsed < 5 ? 1 : elapsed < 14 ? 2 : 3);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{manifest.name}</h3>
          <p className="text-sm text-gray-600 mt-1">{manifest.description}</p>
        </div>
        <span className="text-xs font-mono bg-gray-100 text-gray-700 rounded px-2 py-1 whitespace-nowrap">v{entry.live}</span>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        {manifest.requiresTenant !== false && (
          <span className="rounded-full bg-blue-50 text-blue-700 px-2 py-0.5">tenant: {platform.tenantName || 'pick at open'}</span>
        )}
        {(manifest.tags ?? []).map((t) => (
          <span key={t} className="rounded-full bg-gray-100 text-gray-700 px-2 py-0.5">{t}</span>
        ))}
        {inputs.length > 0 && <span className="rounded-full bg-amber-50 text-amber-800 px-2 py-0.5">inputs: {inputs.join(', ')}</span>}
      </div>

      {releaseNotes && (
        <details className="text-xs text-gray-600">
          <summary className="cursor-pointer select-none">What changed</summary>
          <pre className="whitespace-pre-wrap font-sans mt-1">{releaseNotes}</pre>
        </details>
      )}

      <div className="mt-auto pt-2 flex flex-col gap-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setState({ kind: 'opening' })}
            disabled={state.kind === 'working' || state.kind === 'opening'}
            className="flex-1 rounded-lg bg-blue-600 text-white text-sm font-medium px-3 py-2 hover:bg-blue-700 disabled:opacity-60"
            title="The shared hosted copy, served from template storage"
          >
            Open
          </button>
          <button
            type="button"
            onClick={() => setState({ kind: 'naming' })}
            disabled={state.kind === 'working' || state.kind === 'naming'}
            className="flex-1 rounded-lg border border-gray-300 text-gray-800 text-sm font-medium px-3 py-2 hover:bg-gray-50 disabled:opacity-60"
            title="Create your own copy of the source in Studio Web"
          >
            {state.kind === 'working' ? 'Creating your copy...' : 'Edit'}
          </button>
        </div>

        {state.kind === 'opening' && <OpenPanel template={template} onClose={() => setState({ kind: 'idle' })} />}

        {state.kind === 'naming' && (
          <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 flex flex-col gap-2">
            <label className="text-xs text-gray-600">
              Solution name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && createCopy()}
                autoFocus
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
              />
            </label>
            <p className="text-xs text-gray-500">
              Creates a solution in <span className="font-medium">{platform.orgName}</span> / {platform.tenantName} with this template's source and build. It does not follow template updates.
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={createCopy} className="flex-1 rounded-lg bg-gray-900 text-white text-sm font-medium px-3 py-2">
                Create copy
              </button>
              <button type="button" onClick={() => setState({ kind: 'idle' })} className="rounded-lg border border-gray-300 text-sm px-3 py-2">
                Cancel
              </button>
            </div>
          </div>
        )}

        {state.kind === 'working' && (
          <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
            <div className="flex items-center gap-2 text-sm text-gray-800">
              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-700" />
              <span>{STEPS[stepIndex]}</span>
              <span className="ml-auto text-xs text-gray-500">{elapsed}s</span>
            </div>
            <ol className="mt-2 space-y-1 text-xs">
              {STEPS.map((s, i) => (
                <li key={s} className={i < stepIndex ? 'text-green-700' : i === stepIndex ? 'text-gray-800' : 'text-gray-400'}>
                  {i < stepIndex ? '✓' : i === stepIndex ? '•' : '○'} {s}
                </li>
              ))}
            </ol>
            <p className="mt-2 text-xs text-gray-500">
              Copying into <span className="font-medium">{platform.orgName}</span> / {platform.tenantName}. Nothing is built; the stored bundle ships as is.
            </p>
          </div>
        )}

        {state.kind === 'done' && (
          <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm">
            <p className="text-green-900 font-medium">Your copy is ready</p>
            <p className="text-green-800 text-xs mt-1">
              Solution <span className="font-medium">{state.solutionName}</span>, {state.result.filesUploaded} files, template {state.result.templateId} {state.result.version}.
              It is yours now and does not follow template updates.
            </p>
            <a
              href={state.result.designerUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-block mt-2 rounded-lg bg-green-700 text-white text-sm font-medium px-3 py-2 hover:bg-green-800"
            >
              Open in Studio Web
            </a>
            <button type="button" onClick={() => setState({ kind: 'idle' })} className="ml-3 text-xs text-green-800 underline">
              Make another copy
            </button>
          </div>
        )}

        {state.kind === 'error' && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm">
            <p className="text-red-800">{state.message}</p>
            <button type="button" onClick={() => setState({ kind: 'idle' })} className="mt-1 text-xs text-red-800 underline">
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
