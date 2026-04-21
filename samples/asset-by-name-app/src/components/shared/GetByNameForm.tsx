import { useState } from 'react';

interface Props<TResponse> {
  /** Heading shown above the form — e.g. "assets.getByName()". */
  title: string;
  /** Subheading explaining what this form does. */
  description: React.ReactNode;
  /** Placeholder for the resource-name input. */
  namePlaceholder: string;
  /** Label for the submit button. */
  submitLabel: string;
  /** Current form values (controlled from parent so row-clicks can prefill). */
  name: string;
  folderPath: string;
  folderKey: string;
  onNameChange: (v: string) => void;
  onFolderPathChange: (v: string) => void;
  onFolderKeyChange: (v: string) => void;
  /** Caller-supplied resource fetch — receives trimmed values, returns the resource. */
  fetch: (
    name: string,
    options: { folderPath?: string; folderKey?: string },
  ) => Promise<TResponse>;
}

type Result<T> =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'success'; data: T; tookMs: number }
  | { kind: 'error'; message: string };

export function GetByNameForm<TResponse>({
  title,
  description,
  namePlaceholder,
  submitLabel,
  name,
  folderPath,
  folderKey,
  onNameChange,
  onFolderPathChange,
  onFolderKeyChange,
  fetch,
}: Props<TResponse>) {
  const [result, setResult] = useState<Result<TResponse>>({ kind: 'idle' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setResult({ kind: 'error', message: 'Name is required' });
      return;
    }
    setResult({ kind: 'loading' });
    const started = performance.now();
    try {
      const options: { folderPath?: string; folderKey?: string } = {};
      if (folderPath.trim()) options.folderPath = folderPath.trim();
      if (folderKey.trim()) options.folderKey = folderKey.trim();
      const data = await fetch(name.trim(), options);
      setResult({
        kind: 'success',
        data,
        tookMs: Math.round(performance.now() - started),
      });
    } catch (err) {
      console.error('getByName failed', err);
      setResult({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Request failed',
      });
    }
  };

  return (
    <section className="bg-white rounded-xl shadow border border-gray-200">
      <header className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <p className="text-sm text-gray-500 mt-1">{description}</p>
      </header>

      <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder={namePlaceholder}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">
              Folder path <span className="text-gray-400">(optional)</span>
            </span>
            <input
              type="text"
              value={folderPath}
              onChange={(e) => onFolderPathChange(e.target.value)}
              placeholder="Shared/Finance"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">
              Folder key <span className="text-gray-400">(optional)</span>
            </span>
            <input
              type="text"
              value={folderKey}
              onChange={(e) => onFolderKeyChange(e.target.value)}
              placeholder="guid"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>
        </div>
        <p className="text-xs text-gray-500">
          Pass <code>folderPath</code>, <code>folderKey</code>, or both — Orchestrator
          prefers <code>folderPath</code> when both are present.
        </p>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={result.kind === 'loading'}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium px-5 py-2 rounded-lg transition-colors"
          >
            {result.kind === 'loading' ? 'Fetching…' : submitLabel}
          </button>
          {result.kind === 'success' && (
            <span className="text-sm text-gray-500">
              Resolved in {result.tookMs} ms
            </span>
          )}
        </div>
      </form>

      {result.kind === 'error' && (
        <div className="mx-6 mb-6 bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          <strong className="font-semibold">Error:</strong> {result.message}
        </div>
      )}

      {result.kind === 'success' && (
        <div className="mx-6 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Response</h3>
          <pre className="bg-gray-900 text-green-200 text-xs rounded-lg p-4 overflow-x-auto">
{JSON.stringify(result.data, null, 2)}
          </pre>
        </div>
      )}
    </section>
  );
}
