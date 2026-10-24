import { useState } from 'react'
import type { ReactNode } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { MaintenanceProvider, useMaintenance } from './context/MaintenanceContext'
import { LoginScreen } from './components/LoginScreen'
import { Header } from './components/Header'
import type { Page } from './components/Header'
import { HomePage } from './components/HomePage'
import { SettingsPage } from './components/SettingsPage'
import { MaintenancePage } from './components/MaintenancePage'
import { MaintenanceBanner } from './components/MaintenanceBanner'
import { ThemeProvider } from './components/ThemeProvider'
import { Toaster } from '@uipath/apollo-wind/components/ui/sonner'
import { TooltipProvider } from '@uipath/apollo-wind/components/ui/tooltip'

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return <FullScreenMessage>Initializing UiPath SDK…</FullScreenMessage>
  }
  if (!isAuthenticated) {
    return <LoginScreen />
  }

  // The gate needs a signed-in user, so it only mounts after authentication.
  return (
    <MaintenanceProvider>
      <MaintenanceGate />
    </MaintenanceProvider>
  )
}

/**
 * The decision this sample exists to demonstrate:
 *
 * - Checks still running          → wait; render nothing that could be wrong.
 * - Maintenance on, not an admin  → maintenance page.
 * - Otherwise                     → the app (with a banner if maintenance is
 *                                   on, so an admin knows users see otherwise).
 *
 * An admin can also preview the maintenance page at any time.
 */
function MaintenanceGate() {
  const { status, isAdmin, maintenanceEnabled, previewing } = useMaintenance()
  const [page, setPage] = useState<Page>('home')

  if (status === 'checking') {
    return <FullScreenMessage>Checking access…</FullScreenMessage>
  }

  if (previewing || (maintenanceEnabled && !isAdmin)) {
    return <MaintenancePage preview={previewing} />
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <Header page={page} onNavigate={setPage} />
      {maintenanceEnabled && <MaintenanceBanner />}
      <main className="flex-1 min-h-0 overflow-auto">
        {page === 'settings' && isAdmin ? <SettingsPage /> : <HomePage />}
      </main>
    </div>
  )
}

function FullScreenMessage({ children }: { children: ReactNode }) {
  return (
    <div className="h-screen flex items-center justify-center bg-background">
      <div className="text-muted-foreground">{children}</div>
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider delayDuration={150}>
          <AppContent />
        </TooltipProvider>
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </ThemeProvider>
  )
}
