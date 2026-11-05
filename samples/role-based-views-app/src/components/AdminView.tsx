import { useCallback, useEffect, useRef, useState } from 'react';
import type { PaginationCursor } from '@uipath/uipath-typescript/core';
import { PlatformGroupType } from '@uipath/uipath-typescript/groups';
import type { PlatformGroupGetResponse } from '@uipath/uipath-typescript/groups';
import type { PlatformUserGetResponse } from '@uipath/uipath-typescript/users';
import type { PlatformServices } from '../lib/services';

const PAGE_SIZE = 25;

/**
 * The organization overview only admins see: every user (`users.getAll()`, one
 * page at a time) and every group (`groups.getAll()`, loaded once by the app).
 */
export function AdminView({
  services,
  groups,
}: {
  services: PlatformServices;
  groups: PlatformGroupGetResponse[] | null;
}) {
  const [users, setUsers] = useState<PlatformUserGetResponse[]>([]);
  const [userCount, setUserCount] = useState<number | undefined>(undefined);
  const [nextCursor, setNextCursor] = useState<PaginationCursor | undefined>(undefined);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [usersFailed, setUsersFailed] = useState(false);
  // Only the latest request may update the list, so a late first page cannot replace a loaded second page
  const latestRequest = useRef(0);

  const loadUsers = useCallback(
    async (cursor?: PaginationCursor) => {
      const request = ++latestRequest.current;
      setLoadingUsers(true);
      setUsersFailed(false);
      try {
        const page = await services.users.getAll({ pageSize: PAGE_SIZE, cursor });
        if (request !== latestRequest.current) return;
        setUsers(previous => (cursor ? [...previous, ...page.items] : page.items));
        setUserCount(page.totalCount);
        setNextCursor(page.hasNextPage ? page.nextCursor : undefined);
      } catch (err) {
        console.error('Loading users failed:', err);
        if (request === latestRequest.current) setUsersFailed(true);
      } finally {
        if (request === latestRequest.current) setLoadingUsers(false);
      }
    },
    [services]
  );

  useEffect(() => {
    loadUsers();
    // Invalidate the in-flight request on unmount
    return () => { latestRequest.current++; };
  }, [loadUsers]);

  const customGroups = groups?.filter(g => g.type === PlatformGroupType.Custom).length ?? 0;
  const usersLoaded = !loadingUsers || users.length > 0;

  return (
    <section>
      <div className="stats">
        <div className="stat">
          <span className="stat-value">{usersFailed && users.length === 0 ? '—' : usersLoaded ? (userCount ?? users.length) : '…'}</span>
          <span className="muted">users</span>
        </div>
        <div className="stat">
          <span className="stat-value">{groups ? groups.length : '—'}</span>
          <span className="muted">groups{groups ? ` (${customGroups} custom)` : ''}</span>
        </div>
      </div>

      <h2>Users</h2>
      {users.length > 0 && (
        <table>
          <thead>
            <tr><th>Name</th><th>Email</th><th>Status</th><th>Last sign-in</th></tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>{u.displayName || u.userName}</td>
                <td>{u.email}</td>
                <td><span className={u.isActive ? 'badge active' : 'badge'}>{u.isActive ? 'active' : 'inactive'}</span></td>
                <td>{u.lastLoginTime ? new Date(u.lastLoginTime).toLocaleDateString() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {loadingUsers && <p className="muted">Loading…</p>}
      {usersFailed && (
        <p className="error">
          Users could not be loaded.{' '}
          <button className="link" onClick={() => loadUsers(users.length > 0 ? nextCursor : undefined)}>Try again</button>
        </p>
      )}
      {!loadingUsers && !usersFailed && nextCursor && (
        <button onClick={() => loadUsers(nextCursor)}>Load more users</button>
      )}

      <h2>Groups</h2>
      {groups === null ? (
        <p className="error">Groups could not be loaded. Reload the page to try again.</p>
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
