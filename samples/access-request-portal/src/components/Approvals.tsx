import { useCallback, useEffect, useState } from 'react';
import { PlatformPrincipalType } from '@uipath/uipath-typescript/platform';
import type { PlatformServices } from '../lib/services';
import type { CurrentUser } from '../lib/identity';
import type { AccessRequest, RequestStore } from '../lib/storage';

/**
 * Admin approval queue. Approving actually grants the access:
 * - group requests → `groups.updateById()` with `memberUserIdsToAdd`
 * - role requests  → `roles.updateAssignments()` with a `toAdd` entry
 *
 * The platform re-checks the admin's own permissions server-side on both
 * calls, so a non-admin cannot grant access by calling the API directly.
 */
export function Approvals({
  services,
  user,
  store,
}: {
  services: PlatformServices;
  user: CurrentUser;
  store: RequestStore;
}) {
  const [requests, setRequests] = useState<AccessRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const reload = useCallback(() => store.list().then(setRequests), [store]);

  useEffect(() => {
    reload();
  }, [reload]);

  if (error) return <p className="error">{error}</p>;
  if (!requests) return <p>Loading…</p>;

  const pending = requests.filter(r => r.status === 'pending');
  const resolved = requests.filter(r => r.status !== 'pending');

  const grant = async (request: AccessRequest) => {
    if (request.kind === 'group') {
      // updateById requires the group name on every call; targetName holds it.
      await services.groups.updateById(request.targetId, user.organizationId, request.targetName, {
        memberUserIdsToAdd: [request.requestedById],
      });
    } else {
      await services.roles.updateAssignments({
        toAdd: [{
          roleId: request.targetId,
          securityPrincipalId: request.requestedById,
          securityPrincipalType: PlatformPrincipalType.User,
          scope: '/',
        }],
      });
    }
  };

  const resolve = async (request: AccessRequest, approve: boolean) => {
    setBusyId(request.id);
    setError(null);
    try {
      if (approve) await grant(request);
      await store.update({
        ...request,
        status: approve ? 'approved' : 'denied',
        resolvedByName: user.displayName,
        resolvedTime: new Date().toISOString(),
      });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve request');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section>
      <h2>Pending approvals ({pending.length})</h2>
      {pending.length === 0 ? (
        <p className="muted">Nothing waiting for review.</p>
      ) : (
        <table>
          <thead>
            <tr><th>Requester</th><th>Requested</th><th>Kind</th><th>Justification</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {pending.map(r => (
              <tr key={r.id}>
                <td>{r.requestedByName}</td>
                <td>{r.targetName}</td>
                <td>{r.kind}</td>
                <td>{r.justification}</td>
                <td className="actions">
                  <button className="primary" disabled={busyId === r.id} onClick={() => resolve(r, true)}>
                    {busyId === r.id ? 'Granting…' : 'Approve & grant'}
                  </button>
                  <button disabled={busyId === r.id} onClick={() => resolve(r, false)}>Deny</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>Resolved</h2>
      {resolved.length === 0 ? (
        <p className="muted">No resolved requests.</p>
      ) : (
        <table>
          <thead>
            <tr><th>Requester</th><th>Requested</th><th>Status</th><th>Resolved by</th><th>When</th></tr>
          </thead>
          <tbody>
            {resolved.map(r => (
              <tr key={r.id}>
                <td>{r.requestedByName}</td>
                <td>{r.targetName}</td>
                <td><span className={`badge ${r.status}`}>{r.status}</span></td>
                <td>{r.resolvedByName}</td>
                <td>{r.resolvedTime ? new Date(r.resolvedTime).toLocaleString() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
