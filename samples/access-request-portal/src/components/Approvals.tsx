import { useCallback, useEffect, useState } from 'react';
import { PlatformPrincipalType } from '@uipath/uipath-typescript/roles';
import type { PlatformServices } from '../lib/services';
import type { CurrentUser } from '../lib/identity';
import type { AccessRequest, RequestStore } from '../lib/storage';
import { toUserMessage } from '../lib/errors';
import { groupLabel, roleLabel } from '../lib/labels';

/**
 * Admin approval queue. Approving actually grants the access:
 * - group requests → `groups.updateById()` with `memberUserIdsToAdd`
 * - role requests  → `roles.updateAssignments()` with a `toAdd` entry
 *
 * The platform re-checks the admin's own permissions server-side on both
 * calls, so a non-admin cannot grant access by calling the API directly.
 *
 * The request row is written by the requester, so nothing stored in it is
 * trusted at review time. Each pending request is resolved against the
 * platform first — the target via `groups.getById()` / `roles.getById()`, the
 * requester via `users.getById()` — and the admin reviews those authoritative
 * values. A row whose stored target label no longer matches what its ID
 * resolves to was edited after submission; it is flagged and cannot be approved.
 */

/** A pending request with its target and requester resolved from the platform. */
interface VerifiedRequest {
  /** Authoritative label of the group or role `targetId` points at. */
  targetName: string;
  /** Authoritative identity of the account that would receive the access. */
  requester: string;
  /** The stored target label disagrees with the platform — the row was edited after submission. */
  tampered: boolean;
}

async function verify(services: PlatformServices, request: AccessRequest): Promise<VerifiedRequest> {
  const [targetName, requester] = await Promise.all([
    request.kind === 'group'
      ? services.groups.getById(request.targetId).then(groupLabel)
      : services.roles.getById(request.targetId).then(roleLabel),
    services.users.getById(request.requestedById),
  ]);
  return {
    targetName,
    requester: `${requester.displayName || requester.userName} <${requester.email}>`,
    tampered: targetName !== request.targetName,
  };
}

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
  const [verified, setVerified] = useState<Record<string, VerifiedRequest>>({});
  const [unverified, setUnverified] = useState<Record<string, true>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const all = await store.list();
    const pending = all.filter(r => r.status === 'pending');
    const results = await Promise.allSettled(pending.map(r => verify(services, r)));
    const ok: Record<string, VerifiedRequest> = {};
    const failed: Record<string, true> = {};
    results.forEach((result, i) => {
      if (result.status === 'fulfilled') {
        ok[pending[i].id] = result.value;
      } else {
        console.error(`Could not verify request ${pending[i].id}:`, result.reason);
        failed[pending[i].id] = true;
      }
    });
    setVerified(ok);
    setUnverified(failed);
    setRequests(all);
  }, [services, store]);

  useEffect(() => {
    reload().catch(err => setLoadError(toUserMessage(err, 'The approval queue could not be loaded. Try again in a moment.')));
  }, [reload]);

  if (loadError) return <p className="error">{loadError}</p>;
  if (!requests) return <p>Loading…</p>;

  const pending = requests.filter(r => r.status === 'pending');
  const resolved = requests.filter(r => r.status !== 'pending');

  const grant = async (request: AccessRequest) => {
    if (request.kind === 'group') {
      await services.groups.updateById(request.targetId, {
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
    if (approve) {
      const check = verified[request.id];
      if (!check || check.tampered) {
        setActionError('This request could not be verified against the platform. Deny it, or ask the requester to submit it again.');
        return;
      }
    }
    setBusyId(request.id);
    setActionError(null);
    try {
      if (approve) {
        try {
          await grant(request);
        } catch (err) {
          setActionError(toUserMessage(err, 'The access could not be granted. Try again in a moment.'));
          return;
        }
      }
      try {
        await store.update({
          ...request,
          status: approve ? 'approved' : 'denied',
          resolvedByName: user.displayName,
          resolvedTime: new Date().toISOString(),
        });
      } catch (err) {
        setActionError(toUserMessage(
          err,
          approve
            ? 'The access was granted, but the request could not be marked approved, so it still shows as pending.'
            : 'The request could not be marked denied. Try again in a moment.'
        ));
        return;
      }
      await reload().catch(err => setActionError(toUserMessage(err, 'The queue could not be refreshed. Reload the page.')));
    } finally {
      setBusyId(null);
    }
  };

  const busy = busyId !== null;

  return (
    <section>
      <h2>Pending approvals ({pending.length})</h2>
      {actionError && <p className="error">{actionError}</p>}
      {pending.length === 0 ? (
        <p className="muted">Nothing waiting for review.</p>
      ) : (
        <table>
          <thead>
            <tr><th>Requester</th><th>Requested</th><th>Kind</th><th>Justification</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {pending.map(r => {
              const check = verified[r.id];
              const canGrant = check !== undefined && !check.tampered;
              return (
                <tr key={r.id}>
                  <td>{check ? check.requester : r.requestedByName}</td>
                  <td>
                    {check ? check.targetName : r.targetName}
                    {check?.tampered && (
                      <>
                        {' '}
                        <span className="badge denied" title={`Submitted as "${r.targetName}"`}>altered</span>
                      </>
                    )}
                    {unverified[r.id] && (
                      <>
                        {' '}
                        <span className="badge pending" title="The requested group, role or requester could not be found on the platform">unverified</span>
                      </>
                    )}
                  </td>
                  <td>{r.kind}</td>
                  <td>{r.justification}</td>
                  <td className="actions">
                    <button className="primary" disabled={busy || !canGrant} onClick={() => resolve(r, true)}>
                      {busyId === r.id ? 'Working…' : 'Approve & grant'}
                    </button>
                    <button disabled={busy} onClick={() => resolve(r, false)}>Deny</button>
                  </td>
                </tr>
              );
            })}
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
