import { useEffect, useState } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { getCaseInstances } from '../services/casesService';
import type { CaseInstance } from '../types/cases';

export function CaseInstancesPage() {
  const { processKey } = useParams<{ processKey: string }>();
  const location = useLocation();
  const caseName = (location.state as { caseName?: string })?.caseName;

  const [instances, setInstances] = useState<CaseInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!processKey) return;
    getCaseInstances(processKey)
      .then(setInstances)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [processKey]);

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <Link to="/dashboard" className="back-link">&larr; Back to Dashboard</Link>
          <h1>{caseName ?? 'Case Instances'}</h1>
        </div>
      </div>

      {loading && <p className="status-message">Loading instances...</p>}
      {error && <p className="status-message error">Error: {error}</p>}

      {!loading && !error && (
        <table className="cases-table">
          <thead>
            <tr>
              <th>Case ID</th>
              <th>Version</th>
              <th>Started At</th>
            </tr>
          </thead>
          <tbody>
            {instances.length === 0 ? (
              <tr>
                <td colSpan={3} className="empty-row">No instances found</td>
              </tr>
            ) : (
              instances.map((inst) => (
                <tr key={inst.instanceId}>
                  <td><Link to={`/cases/instances/${inst.instanceId}/hitl`} className="case-link" state={{ caseName, caseId: inst.id, folderKey: inst.folderKey }}>{inst.id}</Link></td>
                  <td>{inst.version}</td>
                  <td>{inst.startedAt}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
