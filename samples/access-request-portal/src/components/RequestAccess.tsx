import { useEffect, useState } from 'react';
import { PlatformGroupType } from '@uipath/uipath-typescript/groups';
import type { PlatformGroupGetResponse } from '@uipath/uipath-typescript/groups';
import { PlatformRoleScopeType } from '@uipath/uipath-typescript/roles';
import type { PlatformRoleGetResponse } from '@uipath/uipath-typescript/roles';
import type { PlatformServices } from '../lib/services';
import type { CurrentUser } from '../lib/identity';
import type { RequestStore, RequestKind } from '../lib/storage';
import { toUserMessage } from '../lib/errors';
import { groupLabel, roleLabel } from '../lib/labels';

/** Data Fabric text fields default to a 200-character limit. */
const JUSTIFICATION_MAX_LENGTH = 200;

/**
 * The request catalog: everything a member can ask for — the organization's custom
 * groups (`groups.getAll()`; built-in groups cannot be edited) and organization-level
 * roles (`roles.getAll({ scopeType })`), which is the scope an approval grants at.
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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        const [allGroups, orgRoles] = await Promise.all([
          services.groups.getAll(),
          services.roles.getAll({ scopeType: PlatformRoleScopeType.Organization }),
        ]);
        if (ignore) return;
        setGroups(allGroups.filter(g => g.type === PlatformGroupType.Custom));
        setRoles(orgRoles.items);
      } catch (err) {
        if (!ignore) setLoadError(toUserMessage(err, 'The request catalog could not be loaded. Try again in a moment.'));
      }
    };
    load();
    return () => { ignore = true; };
  }, [services]);

  if (loadError) return <p className="error">{loadError}</p>;
  if (!groups || !roles) return <p>Loading catalog…</p>;

  const options = kind === 'group'
    ? groups.map(g => ({ id: g.id, name: groupLabel(g) }))
    : roles.map(r => ({ id: r.id, name: roleLabel(r) }));

  const submit = async () => {
    const target = options.find(o => o.id === targetId);
    if (!target || !justification.trim()) {
      setSubmitError('Pick a target and provide a justification.');
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      await store.create({
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
      setSubmitError(toUserMessage(err, 'Your request could not be submitted. Try again in a moment.'));
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
            maxLength={JUSTIFICATION_MAX_LENGTH}
            value={justification}
            onChange={e => setJustification(e.target.value)}
            placeholder="Why do you need this access?"
          />
        </label>
        <button className="primary" disabled={submitting} onClick={submit}>
          {submitting ? 'Submitting…' : 'Submit request'}
        </button>
        {submitError && <p className="error">{submitError}</p>}
      </div>
    </section>
  );
}
