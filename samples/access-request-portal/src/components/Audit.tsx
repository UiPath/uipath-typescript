import { useEffect, useState } from 'react';
import type { PlatformPrincipalRoleAssignments } from '@uipath/uipath-typescript/platform';
import type { PlatformServices } from '../lib/services';

/**
 * Org-wide audit: who holds what, via `roles.getAssignments('/')` (grouped by
 * principal, paginated) and a one-click CSV download via
 * `roles.exportAssignments()`.
 */
export function Audit({ services }: { services: PlatformServices }) {
  const [principals, setPrincipals] = useState<PlatformPrincipalRoleAssignments[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    services.roles
      .getAssignments('/', { pageSize: 10 })
      .then(page => setPrincipals(page.items))
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load assignments'));
  }, [services]);

  const exportCsv = async () => {
    setExporting(true);
    setError(null);
    try {
      const csv = await services.roles.exportAssignments();
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'role-assignments.csv';
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  if (error) return <p className="error">{error}</p>;
  if (!principals) return <p>Loading assignments…</p>;

  return (
    <section>
      <div className="row-between">
        <h2>Role assignments (org scope)</h2>
        <button className="primary" disabled={exporting} onClick={exportCsv}>
          {exporting ? 'Exporting…' : 'Export all as CSV'}
        </button>
      </div>
      {principals.map(p => (
        <div key={p.securityPrincipalId} className="card">
          <div className="card-title">
            <strong>{p.displayName}</strong>
            <span className="muted"> {p.email ?? ''} · {p.type}</span>
          </div>
          <ul className="pills">
            {p.roleAssignments.map(a => (
              <li key={a.id} title={`scope: ${a.scope}${a.inherited ? ' (inherited)' : ''}`}>
                {a.roleName}{a.inherited ? ' *' : ''}
              </li>
            ))}
          </ul>
        </div>
      ))}
      <p className="muted">* inherited via group membership. Showing the first page — export for the full list.</p>
    </section>
  );
}
