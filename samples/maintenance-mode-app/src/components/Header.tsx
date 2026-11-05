import { LogOut, Settings, Wrench } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useMaintenance } from '../context/MaintenanceContext'
import { Button } from '@uipath/apollo-wind/components/ui/button'
import { Badge } from '@uipath/apollo-wind/components/ui/badge'
import { ThemeToggle } from './ThemeToggle'

export type Page = 'home' | 'settings'

interface HeaderProps {
  page: Page
  onNavigate: (page: Page) => void
}

export function Header({ page, onNavigate }: HeaderProps) {
  const { logout } = useAuth()
  const { isAdmin, maintenanceEnabled } = useMaintenance()

  return (
    <header className="border-b bg-background shrink-0">
      <div className="px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
              <Wrench className="h-4 w-4 text-primary" />
            </div>
            <h1 className="text-base font-semibold">Maintenance Mode Gate</h1>
          </div>

          <nav className="flex items-center gap-1" aria-label="Main">
            <Button
              variant={page === 'home' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => onNavigate('home')}
            >
              Home
            </Button>
            {/* The Settings page only exists for Administrators. Hiding the
                link is a courtesy; the store's own permissions decide who can
                actually write the switch. */}
            {isAdmin && (
              <Button
                variant={page === 'settings' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => onNavigate('settings')}
              >
                <Settings className="h-4 w-4 mr-1.5" />
                Settings
              </Button>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <MaintenanceBadge enabled={maintenanceEnabled} />
          <ThemeToggle />
          <Button variant="ghost" size="sm" onClick={logout}>
            <LogOut className="h-4 w-4 mr-1.5" />
            Sign out
          </Button>
        </div>
      </div>
    </header>
  )
}

function MaintenanceBadge({ enabled }: { enabled: boolean }) {
  return enabled ? (
    <Badge
      variant="outline"
      className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-transparent"
    >
      Maintenance on
    </Badge>
  ) : (
    <Badge
      variant="outline"
      className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-transparent"
    >
      Maintenance off
    </Badge>
  )
}
