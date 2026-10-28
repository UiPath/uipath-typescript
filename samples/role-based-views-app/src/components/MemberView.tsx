import { useEffect, useState } from 'react';
import type { PlatformDirectoryGroup } from '@uipath/uipath-typescript/directory';
import type { PlatformServices } from '../lib/services';
import type { CurrentUser } from '../lib/identity';

/**
 * What every signed-in user sees: their own profile and the groups they belong to.
 * The profile comes straight from the access token; the groups from `groups.getAll()`
 * plus `directory.getGroupMembership()`, which answers which of those groups the
 * user is in.
 */
export function MemberView({ services, user }: { services: PlatformServices; user: CurrentUser }) {
  const [groups, setGroups] = useState<PlatformDirectoryGroup[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const load = async () => {
      const allGroups = await services.groups.getAll();
      setGroups(await services.directory.getGroupMembership(user.userId, allGroups.map(g => g.id)));
    };
    load().catch(err => {
      console.error('Loading group membership failed:', err);
      setFailed(true);
    });
  }, [services, user]);

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
      ) : !groups ? (
        <p className="muted">Loading…</p>
      ) : groups.length === 0 ? (
        <p className="muted">You are not a member of any group.</p>
      ) : (
        <ul className="pills">
          {groups.map(g => <li key={g.id}>{g.displayName || g.name}</li>)}
        </ul>
      )}
    </section>
  );
}
