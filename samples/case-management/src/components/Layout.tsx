import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCases } from '@/hooks/useCases';
import { getRecentCases } from '@/lib/recent';
import type { RecentCase } from '@/lib/recent';
import { LogOut } from 'lucide-react';
import { Toaster } from '@uipath/apollo-wind/components/ui/sonner';
import { ThemeToggle } from '@/components/Theme';
import { CaseSwitcher } from '@/components/CasePicker';
import { HomeIcon, CasesIcon, ActionsIcon, AnalyticsIcon, SettingsIcon } from '@/components/icons';

const NAV = [
  { to: '/', label: 'Home', Icon: HomeIcon, end: true },
  { to: '/actions', label: 'Actions', Icon: ActionsIcon },
  { to: '/cases', label: 'Cases', Icon: CasesIcon },
  { to: '/analytics', label: 'Analytics', Icon: AnalyticsIcon },
];

export function Layout({ children }: { children: ReactNode }) {
  const { logout } = useAuth();
  const { caseDefinition } = useCases();
  const location = useLocation();

  // "Recent" = the cases THIS user has opened (localStorage), not an enumeration
  // of all cases. Refresh on navigation and when a case is opened.
  const [recent, setRecent] = useState<RecentCase[]>(getRecentCases());
  useEffect(() => setRecent(getRecentCases()), [location.pathname]);
  useEffect(() => {
    const h = () => setRecent(getRecentCases());
    window.addEventListener('recent-cases-changed', h);
    return () => window.removeEventListener('recent-cases-changed', h);
  }, []);

  const navClass = (isActive: boolean) =>
    `flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition ${
      isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
    }`;

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* Sidebar */}
      <aside className="flex w-60 shrink-0 flex-col border-r bg-card">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
              Ui
            </div>
            <span className="text-[15px] font-semibold tracking-tight">UiPath</span>
          </div>
          <ThemeToggle />
        </div>

        {/* The case this app is scoped to — switch it here. */}
        <div className="mx-3 mb-2">
          <div className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Case
          </div>
          <CaseSwitcher />
          {caseDefinition?.folderName && (
            <span className="mt-1 block truncate px-1 text-[11px] text-muted-foreground" title={caseDefinition.folderName}>
              {caseDefinition.folderName}
            </span>
          )}
        </div>

        <nav className="mt-1 flex-1 space-y-0.5 overflow-y-auto px-3">
          {NAV.map(({ to, label, Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => navClass(isActive)}>
              <Icon width={18} height={18} />
              {label}
            </NavLink>
          ))}

          {recent.length > 0 && (
            <div className="pt-5">
              <div className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Recent
              </div>
              {recent.map((inst) => {
                const path = `/cases/${encodeURIComponent(inst.folderKey)}/${encodeURIComponent(inst.instanceId)}`;
                const active = location.pathname === path;
                return (
                  <NavLink
                    key={inst.instanceId}
                    to={path}
                    className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] ${
                      active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
                    <span className="truncate">{inst.label}</span>
                  </NavLink>
                );
              })}
            </div>
          )}
        </nav>

        <div className="border-t px-3 py-3">
          <NavLink to="/settings" className={({ isActive }) => `mb-1 ${navClass(isActive)}`}>
            <SettingsIcon width={18} height={18} />
            Settings
          </NavLink>
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            title="Sign out"
          >
            <LogOut className="h-[18px] w-[18px]" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">{children}</main>
      <Toaster />
    </div>
  );
}
