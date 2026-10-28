import { useEffect, useState } from 'react';
import type { PlatformGroupGetResponse } from '@uipath/uipath-typescript/groups';
import { useAuth } from './hooks/useAuth';
import { getCurrentUser } from './lib/identity';
import type { CurrentUser } from './lib/identity';
import { createServices } from './lib/services';
import type { PlatformServices } from './lib/services';
import { resolveView } from './lib/views';
import type { View } from './lib/views';
import { AdminView } from './components/AdminView';
import { MemberView } from './components/MemberView';

export default function App() {
  const { sdk, isAuthenticated, isLoading, error, login, logout } = useAuth();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [services, setServices] = useState<PlatformServices | null>(null);
  /** The organization's groups, loaded once and shared by both views; null when they could not be loaded. */
  const [groups, setGroups] = useState<PlatformGroupGetResponse[] | null>(null);
  /** The view this user is entitled to. */
  const [view, setView] = useState<View | null>(null);
  /** The view on screen — admins can switch to preview what members see. */
  const [showing, setShowing] = useState<View>('member');
  const [bootFailed, setBootFailed] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    let ignore = false;
    const bootstrap = async () => {
      let currentUser: CurrentUser;
      try {
        currentUser = getCurrentUser(sdk);
      } catch (err) {
        console.error('Could not identify the signed-in user:', err);
        setBootFailed(true);
        return;
      }
      const platformServices = createServices(sdk);
      let allGroups: PlatformGroupGetResponse[] | null = null;
      let resolved: View = 'member';
      try {
        allGroups = await platformServices.groups.getAll();
        resolved = await resolveView(platformServices, currentUser.userId, allGroups);
      } catch (err) {
        console.error('Resolving the view failed; showing the member view:', err);
      }
      if (ignore) return;
      setUser(currentUser);
      setServices(platformServices);
      setGroups(allGroups);
      setView(resolved);
      setShowing(resolved);
    };
    bootstrap();
    return () => { ignore = true; };
  }, [isAuthenticated, sdk]);

  if (isLoading) return <div className="centered">Loading…</div>;

  if (!isAuthenticated) {
    return (
      <div className="centered login">
        <h1>Role-Based Views</h1>
        <p>One app, two experiences: what you see depends on who you are in the organization.</p>
        {error && <p className="error">{error}</p>}
        <button className="primary" onClick={login}>Sign in with UiPath</button>
      </div>
    );
  }

  if (bootFailed) {
    return (
      <div className="centered login">
        <p className="error">We couldn't identify your account. Sign in again.</p>
        <button className="primary" onClick={logout}>Sign out</button>
      </div>
    );
  }

  if (!user || !services || view === null) {
    return <div className="centered">Checking your access…</div>;
  }

  return (
    <div className="app">
      <header>
        <div>
          <h1>Role-Based Views</h1>
          <span className="subtitle">Powered by the UiPath TypeScript SDK platform services</span>
        </div>
        <div className="whoami">
          <strong>{user.displayName}</strong>
          <span className={view === 'admin' ? 'badge admin' : 'badge'}>{view === 'admin' ? 'Administrator' : 'Member'}</span>
          <button className="link" onClick={logout}>Sign out</button>
        </div>
      </header>

      {view === 'admin' && (
        <nav>
          <button className={showing === 'admin' ? 'tab active' : 'tab'} onClick={() => setShowing('admin')}>
            Organization
          </button>
          <button className={showing === 'member' ? 'tab active' : 'tab'} onClick={() => setShowing('member')}>
            Member view
          </button>
        </nav>
      )}

      <main>
        {view === 'admin' && showing === 'admin'
          ? <AdminView services={services} groups={groups} />
          : <MemberView services={services} user={user} groups={groups} />}
      </main>
    </div>
  );
}
