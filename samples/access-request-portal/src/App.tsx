import { useEffect, useMemo, useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { getCurrentUser } from './lib/identity';
import type { CurrentUser } from './lib/identity';
import { createServices } from './lib/services';
import type { PlatformServices } from './lib/services';
import { isAccessAdmin } from './lib/rbac';
import { createRequestStore } from './lib/storage';
import { MyAccess } from './components/MyAccess';
import { RequestAccess } from './components/RequestAccess';
import { MyRequests } from './components/MyRequests';
import { Approvals } from './components/Approvals';
import { Audit } from './components/Audit';
import { CloneAccess } from './components/CloneAccess';

type Tab = 'my-access' | 'request' | 'my-requests' | 'approvals' | 'audit' | 'clone';

const USER_TABS: { id: Tab; label: string }[] = [
  { id: 'my-access', label: 'My Access' },
  { id: 'request', label: 'Request Access' },
  { id: 'my-requests', label: 'My Requests' },
];

const ADMIN_TABS: { id: Tab; label: string }[] = [
  { id: 'approvals', label: 'Approvals' },
  { id: 'audit', label: 'Audit' },
  { id: 'clone', label: 'Clone Access' },
];

export default function App() {
  const { sdk, isAuthenticated, isLoading, error, login } = useAuth();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [services, setServices] = useState<PlatformServices | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>('my-access');
  const store = useMemo(() => createRequestStore(), []);

  useEffect(() => {
    if (!isAuthenticated) return;
    const bootstrap = async () => {
      const currentUser = getCurrentUser(sdk);
      const platformServices = createServices(sdk);
      setUser(currentUser);
      setServices(platformServices);
      try {
        setIsAdmin(await isAccessAdmin(platformServices, currentUser.userId, currentUser.organizationId));
      } catch (err) {
        console.error('Admin check failed:', err);
        setIsAdmin(false);
      }
    };
    bootstrap();
  }, [isAuthenticated, sdk]);

  if (isLoading) return <div className="centered">Loading…</div>;

  if (!isAuthenticated) {
    return (
      <div className="centered login">
        <h1>Access Request Portal</h1>
        <p>Request access to groups and roles; admins review and grant in one click.</p>
        {error && <p className="error">{error}</p>}
        <button className="primary" onClick={login}>Sign in with UiPath</button>
      </div>
    );
  }

  if (!user || !services || isAdmin === null) {
    return <div className="centered">Checking your access…</div>;
  }

  const tabs = isAdmin ? [...USER_TABS, ...ADMIN_TABS] : USER_TABS;

  return (
    <div className="app">
      <header>
        <div>
          <h1>Access Request Portal</h1>
          <span className="subtitle">Powered by the UiPath TypeScript SDK platform services</span>
        </div>
        <div className="whoami">
          <strong>{user.displayName}</strong>
          <span className={isAdmin ? 'badge admin' : 'badge'}>{isAdmin ? 'Access Admin' : 'Member'}</span>
        </div>
      </header>
      <nav>
        {tabs.map(t => (
          <button key={t.id} className={tab === t.id ? 'tab active' : 'tab'} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>
      <main>
        {tab === 'my-access' && <MyAccess services={services} user={user} />}
        {tab === 'request' && <RequestAccess services={services} user={user} store={store} onSubmitted={() => setTab('my-requests')} />}
        {tab === 'my-requests' && <MyRequests user={user} store={store} />}
        {tab === 'approvals' && isAdmin && <Approvals services={services} user={user} store={store} />}
        {tab === 'audit' && isAdmin && <Audit services={services} />}
        {tab === 'clone' && isAdmin && <CloneAccess services={services} user={user} />}
      </main>
    </div>
  );
}
