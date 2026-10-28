import { useCallback, useEffect, useState } from 'react';
import type { PaginationCursor } from '@uipath/uipath-typescript/core';
import { PlatformGroupType } from '@uipath/uipath-typescript/groups';
import type { PlatformGroupGetResponse } from '@uipath/uipath-typescript/groups';
import type { PlatformUserGetResponse } from '@uipath/uipath-typescript/users';
import type { PlatformServices } from '../lib/services';

const PAGE_SIZE = 25;

/**
 * The organization overview only admins see: every user (`users.getAll()`, one
 * page at a time) and every group (`groups.getAll()`).
 */
export function AdminView({ services }: { services: PlatformServices }) {
  const [users, setUsers] = useState<PlatformUserGetResponse[]>([]);
  const [userCount, setUserCount] = useState<number | undefined>(undefined);
  const [nextCursor, setNextCursor] = useState<PaginationCursor | undefined>(undefined);
  const [groups, setGroups] = useState<PlatformGroupGetResponse[] | null>(null);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [failed, setFailed] = useState(false);

  const loadUsers = useCallback(
    async (cursor?: PaginationCursor) => {
      setLoadingUsers(true);
      try {
        const page = await services.users.getAll({ pageSize: PAGE_SIZE, cursor });
        setUsers(previous => (cursor ? [...previous, ...page.items] : page.items));
        setUserCount(page.totalCount);
        setNextCursor(page.hasNextPage ? page.nextCursor : undefined);
      } catch (err) {
        console.error('Loading users failed:', err);
        setFailed(true);
      } finally {
        setLoadingUsers(false);
      }
    },
    [services]
  );

  useEffect(() => {
    loadUsers();
    services.groups
      .getAll()
      .then(setGroups)
      .catch(err => {
        console.error('Loading groups failed:', err);
        setFailed(true);
      });
  }, [services, loadUsers]);

  const customGroups = groups?.filter(g => g.type === PlatformGroupType.Custom).length ?? 0;

  return (
    <section>
      {failed && <p className="error">Some organization data could not be loaded. Try again in a moment.</p>}

      <div className="stats">
        <div className="stat">
          <span className="stat-value">{userCount ?? users.length}</span>
          <span className="muted">users</span>
        </div>
        <div className="stat">
          <span className="stat-value">{groups?.length ?? '…'}</span>
          <span className="muted">groups ({customGroups} custom)</span>
        </div>
      </div>

      <h2>Users</h2>
      <table>
        <thead>
          <tr><th>Name</th><th>Email</th><th>Status</th><th>Last sign-in</th></tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id}>
              <td>{u.displayName ?? u.userName}</td>
              <td>{u.email}</td>
              <td><span className={u.isActive ? 'badge active' : 'badge'}>{u.isActive ? 'active' : 'inactive'}</span></td>
              <td>{u.lastLoginTime ? new Date(u.lastLoginTime).toLocaleDateString() : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {loadingUsers && <p className="muted">Loading…</p>}
      {!loadingUsers && nextCursor && (
        <button onClick={() => loadUsers(nextCursor)}>Load more users</button>
      )}

      <h2>Groups</h2>
      {groups === null ? (
        <p className="muted">Loading…</p>
      ) : (
        <table>
          <thead>
            <tr><th>Name</th><th>Type</th></tr>
          </thead>
          <tbody>
            {groups.map(g => (
              <tr key={g.id}>
                <td>{g.displayName || g.name}</td>
                <td><span className="badge">{g.type === PlatformGroupType.BuiltIn ? 'built-in' : 'custom'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
