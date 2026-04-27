import { useEffect, useState } from 'react';
import { Buckets } from '@uipath/uipath-typescript/buckets';
import { useAuth } from '../../hooks/useAuth';

interface Folder {
  id: number;
  key: string;
  fullyQualifiedName: string;
  displayName: string;
}

interface BucketRow {
  id: number;
  name: string;
  folderPath: string;
  folderKey: string;
  identifier: string;
}

interface Props {
  onPickBucket: (name: string, folderPath: string, folderKey: string) => void;
}

const MAX_FOLDERS = 25;
const MAX_BUCKETS_PER_FOLDER = 100;

export const BucketList = ({ onPickBucket }: Props) => {
  const { sdk } = useAuth();
  const [rows, setRows] = useState<BucketRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const token = sdk.getToken();
        if (!token) throw new Error('No auth token — please sign in again.');
        const { baseUrl, orgName, tenantName } = sdk.config;

        // Step 1 — list folders so we can show path + key for each bucket.
        const foldersResp = await fetch(
          `${baseUrl}/${orgName}/${tenantName}/orchestrator_/odata/Folders?$top=${MAX_FOLDERS}`,
          { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } },
        );
        if (!foldersResp.ok) {
          throw new Error(
            `Folders request failed: ${foldersResp.status} ${foldersResp.statusText}`,
          );
        }
        const foldersData = (await foldersResp.json()) as { value?: Array<Record<string, unknown>> };
        const folders: Folder[] = (foldersData.value ?? []).map((f) => ({
          id: f.Id as number,
          key: (f.Key as string) ?? '',
          fullyQualifiedName: (f.FullyQualifiedName as string) ?? '',
          displayName: (f.DisplayName as string) ?? '',
        }));

        // Step 2 — for each folder, list its buckets via the SDK.
        const buckets = new Buckets(sdk);
        const perFolder = await Promise.all(
          folders.map(async (folder) => {
            try {
              const result = await buckets.getAll({
                folderId: folder.id,
                pageSize: MAX_BUCKETS_PER_FOLDER,
              });
              return result.items.map<BucketRow>((bucket) => ({
                id: bucket.id,
                name: bucket.name,
                folderPath: folder.fullyQualifiedName || folder.displayName,
                folderKey: folder.key,
                identifier: bucket.identifier,
              }));
            } catch (err) {
              console.warn(
                `[BucketList] skipped folder "${folder.fullyQualifiedName}":`,
                err instanceof Error ? err.message : err,
              );
              return [];
            }
          }),
        );

        if (cancelled) return;
        setRows(perFolder.flat());
      } catch (err) {
        console.error('Failed to load buckets', err);
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load buckets');
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
          Buckets across folders
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Click a row to prefill the <code>getByName</code> form below.
        </p>
      </header>

      {isLoading && (
        <div className="px-6 py-10 text-center text-gray-500">Loading buckets…</div>
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
                <th className="px-6 py-3 text-left font-medium">Folder path</th>
                <th className="px-6 py-3 text-left font-medium">Folder key</th>
                <th className="px-6 py-3 text-left font-medium">Identifier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-gray-500">
                    No buckets found in this tenant.
                  </td>
                </tr>
              )}
              {rows.map((row, idx) => (
                <tr
                  key={`${row.folderKey}-${row.id}-${idx}`}
                  onClick={() => onPickBucket(row.name, row.folderPath, row.folderKey)}
                  className="cursor-pointer hover:bg-blue-50"
                >
                  <td className="px-6 py-3 font-medium text-gray-900">{row.name}</td>
                  <td className="px-6 py-3 text-gray-700">{row.folderPath || '—'}</td>
                  <td className="px-6 py-3 text-gray-500 font-mono text-xs">
                    {row.folderKey || '—'}
                  </td>
                  <td className="px-6 py-3 text-gray-500 font-mono text-xs">{row.identifier}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};
