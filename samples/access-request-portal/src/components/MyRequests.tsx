import { useEffect, useState } from 'react';
import type { CurrentUser } from '../lib/identity';
import type { AccessRequest, RequestStore } from '../lib/storage';

/** The requester's own requests — non-admins never see anyone else's. */
export function MyRequests({ user, store }: { user: CurrentUser; store: RequestStore }) {
  const [requests, setRequests] = useState<AccessRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const mine = user.userId.toLowerCase();
    store
      .list()
      .then(all => setRequests(all.filter(r => r.requestedById.toLowerCase() === mine)))
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load requests'));
  }, [store, user]);

  if (error) return <p className="error">{error}</p>;
  if (!requests) return <p>Loading…</p>;
  if (requests.length === 0) return <p className="muted">You have no requests yet.</p>;

  return (
    <section>
      <h2>My requests</h2>
      <table>
        <thead>
          <tr><th>Requested</th><th>Kind</th><th>Justification</th><th>Status</th><th>Resolved by</th></tr>
        </thead>
        <tbody>
          {requests.map(r => (
            <tr key={r.id}>
              <td>{r.targetName}</td>
              <td>{r.kind}</td>
              <td>{r.justification}</td>
              <td><span className={`badge ${r.status}`}>{r.status}</span></td>
              <td>{r.resolvedByName ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
