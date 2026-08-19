import { useEffect, useState } from 'react';
import type { PlatformGroupGetResponse, PlatformRoleGetResponse } from '@uipath/uipath-typescript/platform';
import type { PlatformServices } from '../lib/services';
import type { CurrentUser } from '../lib/identity';
import type { RequestStore, RequestKind } from '../lib/storage';

/**
 * The request catalog: everything a member can ask for — the org's groups
 * (`groups.getAll()`) and roles (`roles.getAll()`).
 */
export function RequestAccess({
  services,
  user,
  store,
  onSubmitted,
}: {
  services: PlatformServices;
  user: CurrentUser;
  store: RequestStore;
  onSubmitted: () => void;
}) {
  const [groups, setGroups] = useState<PlatformGroupGetResponse[] | null>(null);
  const [roles, setRoles] = useState<PlatformRoleGetResponse[] | null>(null);
  const [kind, setKind] = useState<RequestKind>('group');
  const [targetId, setTargetId] = useState('');
  const [justification, setJustification] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setGroups(await services.groups.getAll(user.organizationId));
        const rolePage = await services.roles.getAll({ pageSize: 100 });
        setRoles(rolePage.items);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load catalog');
      }
    };
    load();
  }, [services, user]);

  if (error) return <p className="error">{error}</p>;
  if (!groups || !roles) return <p>Loading catalog…</p>;

  const options = kind === 'group'
    ? groups.map(g => ({ id: g.id, name: g.displayName || g.name }))
    : roles.map(r => ({ id: r.id, name: `${r.name} (${r.scopeType})` }));

  const submit = async () => {
    const target = options.find(o => o.id === targetId);
    if (!target || !justification.trim()) {
      setError('Pick a target and provide a justification.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await store.create({
        id: crypto.randomUUID(),
        kind,
        targetId: target.id,
        targetName: target.name,
        justification: justification.trim(),
        requestedById: user.userId,
        requestedByName: user.displayName,
        status: 'pending',
        createdTime: new Date().toISOString(),
      });
      onSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section>
      <h2>Request access</h2>
      <div className="form">
        <label>
          What kind of access?
          <select value={kind} onChange={e => { setKind(e.target.value as RequestKind); setTargetId(''); }}>
            <option value="group">Group membership</option>
            <option value="role">Role assignment</option>
          </select>
        </label>
        <label>
          {kind === 'group' ? 'Group' : 'Role'}
          <select value={targetId} onChange={e => setTargetId(e.target.value)}>
            <option value="">— select —</option>
            {options.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </label>
        <label>
          Business justification
          <textarea
            rows={3}
            value={justification}
            onChange={e => setJustification(e.target.value)}
            placeholder="Why do you need this access?"
          />
        </label>
        <button className="primary" disabled={submitting} onClick={submit}>
          {submitting ? 'Submitting…' : 'Submit request'}
        </button>
      </div>
    </section>
  );
}
