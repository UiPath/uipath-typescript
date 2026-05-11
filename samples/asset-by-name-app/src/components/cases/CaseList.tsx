import { useEffect, useState } from 'react';
import { Cases } from '@uipath/uipath-typescript/cases';
import { useAuth } from '../../hooks/useAuth';

interface CaseRow {
  processKey: string;
  name: string;
  folderName: string;
  folderKey: string;
  packageId: string;
  runningCount: number;
}

interface Props {
  onPickCase: (name: string, folderPath: string, folderKey: string) => void;
}

export const CaseList = ({ onPickCase }: Props) => {
  const { sdk } = useAuth();
  const [rows, setRows] = useState<CaseRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const cases = await new Cases(sdk).getAll();
        if (cancelled) return;
        setRows(
          cases.map((c) => ({
            processKey: c.processKey,
            name: c.name,
            folderName: c.folderName,
            folderKey: c.folderKey,
            packageId: c.packageId,
            runningCount: c.runningCount,
          })),
        );
      } catch (err) {
        console.error('Failed to load cases', err);
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load cases');
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
        <h2 className="text-lg font-semibold text-gray-900">Case management processes</h2>
        <p className="text-sm text-gray-500 mt-1">
          Click a row to prefill the <code>getByName</code> form below. Names are
          derived from <code>packageId</code> by stripping the <code>CaseManagement.</code>{' '}
          prefix.
        </p>
      </header>

      {isLoading && (
        <div className="px-6 py-10 text-center text-gray-500">Loading cases…</div>
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
                <th className="px-6 py-3 text-left font-medium">Running</th>
                <th className="px-6 py-3 text-left font-medium">Package ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                    No case management processes found in this tenant.
                  </td>
                </tr>
              )}
              {rows.map((row) => (
                <tr
                  key={row.processKey}
                  onClick={() => onPickCase(row.name, row.folderName, row.folderKey)}
                  className="cursor-pointer hover:bg-blue-50"
                >
                  <td className="px-6 py-3 font-medium text-gray-900">{row.name}</td>
                  <td className="px-6 py-3 text-gray-700">{row.folderName || '—'}</td>
                  <td className="px-6 py-3 text-gray-500 font-mono text-xs">
                    {row.folderKey || '—'}
                  </td>
                  <td className="px-6 py-3 text-gray-700">{row.runningCount}</td>
                  <td className="px-6 py-3 text-gray-500 font-mono text-xs">{row.packageId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};
