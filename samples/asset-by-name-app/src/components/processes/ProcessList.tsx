import { useEffect, useState } from 'react';
import { Processes } from '@uipath/uipath-typescript/processes';
import type { ProcessGetResponse } from '@uipath/uipath-typescript/processes';
import { useAuth } from '../../hooks/useAuth';

interface ProcessRow {
  id: number;
  name: string;
  folderName: string;
  folderKey: string;
  packageVersion: string;
}

interface Props {
  onPickProcess: (name: string, folderName: string, folderKey: string) => void;
}

type StartMode = 'path' | 'key';

type StartState =
  | { kind: 'idle' }
  | { kind: 'loading'; rowKey: string; mode: StartMode }
  | { kind: 'success'; rowKey: string; mode: StartMode; jobKey: string }
  | { kind: 'error'; rowKey: string; mode: StartMode; message: string };

export const ProcessList = ({ onPickProcess }: Props) => {
  const { sdk } = useAuth();
  const [rows, setRows] = useState<ProcessRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [startState, setStartState] = useState<StartState>({ kind: 'idle' });

  const handleStart = async (row: ProcessRow, mode: StartMode) => {
    const rowKey = `${row.folderKey}-${row.id}`;
    setStartState({ kind: 'loading', rowKey, mode });
    try {
      // Exercises the B2 options-bag shape. Two test paths:
      //  - 'path' → only folderPath sent → X-UIPATH-FolderPath-Encoded header
      //  - 'key'  → only folderKey  sent → X-UIPATH-FolderKey header
      const processes = new Processes(sdk);
      const folderOptions =
        mode === 'path'
          ? { folderPath: row.folderName || undefined }
          : { folderKey: row.folderKey || undefined };
      const jobs = await processes.start(
        { processName: row.name },
        folderOptions,
      );
      setStartState({
        kind: 'success',
        rowKey,
        mode,
        jobKey: jobs[0]?.key ?? '(no key)',
      });
    } catch (err) {
      console.error('processes.start failed', err);
      setStartState({
        kind: 'error',
        rowKey,
        mode,
        message: err instanceof Error ? err.message : 'Start failed',
      });
    }
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Processes.getAll() returns folder context per row (folderName + folderKey)
        // since /odata/Releases exposes them — so no per-folder loop needed here.
        const processes = new Processes(sdk);
        const result = await processes.getAll({ pageSize: 100 });
        if (cancelled) return;
        const flat: ProcessRow[] = result.items.map((p: ProcessGetResponse) => ({
          id: p.id,
          name: p.name,
          folderName: p.folderName ?? '',
          folderKey: p.folderKey ?? '',
          packageVersion: p.packageVersion,
        }));
        setRows(flat);
      } catch (err) {
        console.error('Failed to load processes', err);
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load processes');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [sdk]);

  return (
    <section className="bg-white rounded-xl shadow border border-gray-200">
      <header className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">
          Processes across folders
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Click a row to prefill the <code>getByName</code> form below.
        </p>
      </header>

      {isLoading && (
        <div className="px-6 py-10 text-center text-gray-500">Loading processes…</div>
      )}

      {error && !isLoading && (
        <div className="px-6 py-4 bg-red-50 border-b border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {!isLoading && !error && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-6 py-3 text-left font-medium">Name</th>
                <th className="px-6 py-3 text-left font-medium">Folder</th>
                <th className="px-6 py-3 text-left font-medium">Folder key</th>
                <th className="px-6 py-3 text-left font-medium">Version</th>
                <th className="px-6 py-3 text-left font-medium">Start</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                    No processes found in this tenant.
                  </td>
                </tr>
              )}
              {rows.map((row) => {
                const rowKey = `${row.folderKey}-${row.id}`;
                const renderButton = (mode: StartMode, label: string) => {
                  const isStarting =
                    startState.kind === 'loading' &&
                    startState.rowKey === rowKey &&
                    startState.mode === mode;
                  const startedHere =
                    startState.kind === 'success' &&
                    startState.rowKey === rowKey &&
                    startState.mode === mode;
                  const failedHere =
                    startState.kind === 'error' &&
                    startState.rowKey === rowKey &&
                    startState.mode === mode;
                  const disabled =
                    isStarting ||
                    (mode === 'path' && !row.folderName) ||
                    (mode === 'key' && !row.folderKey);
                  return (
                    <span className="inline-flex items-center mr-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStart(row, mode);
                        }}
                        disabled={disabled}
                        className="text-xs px-3 py-1 rounded border border-blue-300 text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                      >
                        {isStarting ? 'Starting…' : label}
                      </button>
                      {startedHere && (
                        <span className="ml-2 text-xs text-green-700">
                          ✓ {startState.jobKey.slice(0, 8)}…
                        </span>
                      )}
                      {failedHere && (
                        <span
                          className="ml-2 text-xs text-red-600"
                          title={startState.message}
                        >
                          ✗ failed
                        </span>
                      )}
                    </span>
                  );
                };
                return (
                  <tr key={rowKey} className="hover:bg-blue-50">
                    <td
                      className="px-6 py-3 font-medium text-gray-900 cursor-pointer"
                      onClick={() => onPickProcess(row.name, row.folderName, row.folderKey)}
                    >
                      {row.name}
                    </td>
                    <td className="px-6 py-3 text-gray-700">{row.folderName || '—'}</td>
                    <td className="px-6 py-3 text-gray-500 font-mono text-xs">
                      {row.folderKey || '—'}
                    </td>
                    <td className="px-6 py-3 text-gray-700">{row.packageVersion}</td>
                    <td className="px-6 py-3 whitespace-nowrap">
                      {renderButton('path', 'Start (path)')}
                      {renderButton('key', 'Start (key)')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};
