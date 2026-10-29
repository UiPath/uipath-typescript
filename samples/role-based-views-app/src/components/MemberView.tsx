import { useEffect, useState } from 'react';
import type { PlatformDirectoryGroup } from '@uipath/uipath-typescript/directory';
import type { PlatformGroupGetResponse } from '@uipath/uipath-typescript/groups';
import type { PlatformServices } from '../lib/services';
import type { CurrentUser } from '../lib/identity';

/**
 * What every signed-in user sees: their own profile and the organization's groups
 * they belong to. The profile comes straight from the access token; membership from
 * `directory.getGroupMembership()`, which answers which of the given groups
 * (`groups.getAll()`, loaded once by the app) the user is in.
 */
export function MemberView({
  services,
  user,
  groups,
}: {
  services: PlatformServices;
  user: CurrentUser;
  groups: PlatformGroupGetResponse[] | null;
}) {
  const [memberships, setMemberships] = useState<PlatformDirectoryGroup[] | null>(null);
  const [failed, setFailed] = useState(groups === null);

  useEffect(() => {
    if (!groups) return;
    let ignore = false;
    services.directory
      .getGroupMembership(user.userId, groups.map(g => g.id))
      .then(result => { if (!ignore) setMemberships(result); })
      .catch(err => {
        console.error('Loading group membership failed:', err);
        if (!ignore) setFailed(true);
      });
    return () => { ignore = true; };
  }, [services, user, groups]);

  return (
    <section>
      <h2>Your profile</h2>
      <dl className="profile">
        <dt>Name</dt>
        <dd>{user.displayName}</dd>
        <dt>Email</dt>
        <dd>{user.email}</dd>
        <dt>User ID</dt>
        <dd><code>{user.userId}</code></dd>
      </dl>

      <h2>Your groups</h2>
      {failed ? (
        <p className="error">Your groups could not be loaded. Try again in a moment.</p>
      ) : !memberships ? (
        <p className="muted">Loading…</p>
      ) : memberships.length === 0 ? (
        <p className="muted">You are not a member of any group.</p>
      ) : (
        <ul className="pills">
          {memberships.map(g => <li key={g.id}>{g.displayName || g.name}</li>)}
        </ul>
      )}
    </section>
  );
}
