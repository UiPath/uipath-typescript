import { useEffect, useState } from 'react';
import type { CurrentUser } from '../lib/identity';
import type { AccessRequest, RequestStore } from '../lib/storage';
import { toUserMessage } from '../lib/errors';

/**
 * The signed-in user's own requests. The filter runs in the browser: anyone with
 * Data Fabric read access to the entity can read every row, so the store is not a
 * place for confidential justifications (see the README's hardening note).
 */
export function MyRequests({ user, store }: { user: CurrentUser; store: RequestStore }) {
  const [requests, setRequests] = useState<AccessRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const mine = user.userId.toLowerCase();
    store
      .list()
      .then(all => setRequests(all.filter(r => r.requestedById.toLowerCase() === mine)))
      .catch(err => setError(toUserMessage(err, 'Your requests could not be loaded. Try again in a moment.')));
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
