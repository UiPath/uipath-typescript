import { ListChecks, LogOut } from 'lucide-react'
import { Button } from '@uipath/apollo-wind/components/ui/button'
import { Spinner } from '@uipath/apollo-wind/components/ui/spinner'
import { Toaster } from '@uipath/apollo-wind/components/ui/sonner'
import { AuthProvider, useAuth } from './context/AuthContext'
import { SignIn } from './components/SignIn'
import { TaskList } from './components/TaskList'
import { ThemeToggle } from './components/Theme'

function AppContent() {
  const { isAuthenticated, isLoading, login, logout, error } = useAuth()

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner label="Initializing UiPath SDK…" showLabel />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <SignIn error={error} onSignIn={login} />
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <header className="flex items-center justify-between gap-4 border-b px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <ListChecks className="h-5 w-5 shrink-0 text-primary" />
          <h1 className="truncate text-base font-semibold">Action Center Manager</h1>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" size="sm" onClick={logout}>
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </div>
      </header>

      <main className="min-h-0 flex-1">
        <TaskList />
      </main>
      <Toaster />
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
