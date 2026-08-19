import { useEffect, useState } from 'react';
import type { PlatformDirectoryGroup, PlatformPrincipalRoleAssignments } from '@uipath/uipath-typescript/platform';
import type { PlatformServices } from '../lib/services';
import type { CurrentUser } from '../lib/identity';

/**
 * "What do I have?" — the requester's own groups and direct role assignments.
 *
 * Groups: `groups.getAll()` + `directory.getGroupMembership()` (which of the
 * org's groups am I in). Roles: `roles.getAssignments()` filtered to me.
 */
export function MyAccess({ services, user }: { services: PlatformServices; user: CurrentUser }) {
  const [myGroups, setMyGroups] = useState<PlatformDirectoryGroup[] | null>(null);
  const [myAssignments, setMyAssignments] = useState<PlatformPrincipalRoleAssignments[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const allGroups = await services.groups.getAll(user.organizationId);
        const memberships = await services.directory.getGroupMembership(
          user.userId,
          allGroups.map(g => g.id),
          user.organizationId
        );
        setMyGroups(memberships);
        const assignments = await services.roles.getAssignments('/', {
          securityPrincipalId: user.userId,
          pageSize: 10,
        });
        setMyAssignments(assignments.items);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load access');
      }
    };
    load();
  }, [services, user]);

  if (error) return <p className="error">{error}</p>;
  if (!myGroups || !myAssignments) return <p>Loading your access…</p>;

  const roleRows = myAssignments.flatMap(principal => principal.roleAssignments);

  return (
    <section>
      <h2>Groups I belong to</h2>
      {myGroups.length === 0 ? (
        <p className="muted">No group memberships.</p>
      ) : (
        <ul className="pills">
          {myGroups.map(g => <li key={g.id}>{g.displayName || g.name}</li>)}
        </ul>
      )}

      <h2>My role assignments</h2>
      {roleRows.length === 0 ? (
        <p className="muted">No direct role assignments — access may come via group membership.</p>
      ) : (
        <table>
          <thead>
            <tr><th>Role</th><th>Type</th><th>Scope</th><th>Inherited</th></tr>
          </thead>
          <tbody>
            {roleRows.map(a => (
              <tr key={a.id}>
                <td>{a.roleName}</td>
                <td>{a.roleType}</td>
                <td><code>{a.scope}</code></td>
                <td>{a.inherited ? 'Yes' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
