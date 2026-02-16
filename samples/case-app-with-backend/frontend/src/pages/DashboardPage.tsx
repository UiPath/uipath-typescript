import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getCases } from '../services/casesService';
import type { CaseSummary } from '../types/cases';

export function DashboardPage() {
  const { logout } = useAuth();
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCases()
      .then(setCases)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <button onClick={logout} className="btn-secondary">
          Logout
        </button>
      </div>

      {loading && <p className="status-message">Loading cases...</p>}
      {error && <p className="status-message error">Error: {error}</p>}

      {!loading && !error && (
        <table className="cases-table">
          <thead>
            <tr>
              <th>Case name</th>
              <th>Running</th>
              <th>Completed</th>
              <th>Faulted</th>
              <th>Total</th>
              <th>Versions</th>
              <th>Location</th>
            </tr>
          </thead>
          <tbody>
            {cases.length === 0 ? (
              <tr>
                <td colSpan={7} className="empty-row">No cases found</td>
              </tr>
            ) : (
              cases.map((c, index) => (
                <tr key={c.processKey}>
                  <td><Link to={`/cases/${c.processKey}`} className="case-link" state={{ caseName: c.name }}>{c.name}</Link></td>
                  <td>{c.running}</td>
                  <td>{c.completed}</td>
                  <td className={c.faulted > 0 ? 'faulted' : ''}>{c.faulted}</td>
                  <td>{c.total}</td>
                  <td>{c.versions}</td>
                  <td className="location-cell">{c.location}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
