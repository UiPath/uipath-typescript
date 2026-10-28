import { useEffect, useState } from 'react';
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
  const { sdk, isAuthenticated, isLoading, error, login } = useAuth();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [services, setServices] = useState<PlatformServices | null>(null);
  /** The view this user is entitled to. */
  const [view, setView] = useState<View | null>(null);
  /** The view on screen — admins can switch to preview what members see. */
  const [showing, setShowing] = useState<View>('member');

  useEffect(() => {
    if (!isAuthenticated) return;
    const bootstrap = async () => {
      const currentUser = getCurrentUser(sdk);
      const platformServices = createServices(sdk);
      setUser(currentUser);
      setServices(platformServices);
      let resolved: View = 'member';
      try {
        resolved = await resolveView(platformServices, currentUser.userId);
      } catch (err) {
        console.error('Resolving the view failed; showing the member view:', err);
      }
      setView(resolved);
      setShowing(resolved);
    };
    bootstrap();
  }, [isAuthenticated, sdk]);

  if (isLoading) return <div className="centered">Loading…</div>;

  if (!isAuthenticated) {
    return (
      <div className="centered login">
        <h1>Role-Based Views</h1>
        <p>One app, two experiences: what you see depends on who you are in the organization.</p>
        {error && <p className="error">Sign-in failed. Try again.</p>}
        <button className="primary" onClick={login}>Sign in with UiPath</button>
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
          ? <AdminView services={services} />
          : <MemberView services={services} user={user} />}
      </main>
    </div>
  );
}
