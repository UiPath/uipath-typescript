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

export const ProcessList = ({ onPickProcess }: Props) => {
  const { sdk } = useAuth();
  const [rows, setRows] = useState<ProcessRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-gray-500">
                    No processes found in this tenant.
                  </td>
                </tr>
              )}
              {rows.map((row) => (
                <tr
                  key={`${row.folderKey}-${row.id}`}
                  onClick={() => onPickProcess(row.name, row.folderName, row.folderKey)}
                  className="cursor-pointer hover:bg-blue-50"
                >
                  <td className="px-6 py-3 font-medium text-gray-900">{row.name}</td>
                  <td className="px-6 py-3 text-gray-700">{row.folderName || '—'}</td>
                  <td className="px-6 py-3 text-gray-500 font-mono text-xs">
                    {row.folderKey || '—'}
                  </td>
                  <td className="px-6 py-3 text-gray-700">{row.packageVersion}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};
