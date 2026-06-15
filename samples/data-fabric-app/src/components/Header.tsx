import { Database, LogOut } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Button } from '@uipath/apollo-wind/components/ui/button'
import { ThemeToggle } from './ThemeToggle'

export function Header() {
  const { logout } = useAuth()
  return (
    <header className="border-b bg-background shrink-0">
      {/* Full-width header — no max-width clamp, so the title hugs the
          left edge and the controls hug the right edge regardless of
          viewport size. */}
      <div className="px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
            <Database className="h-4 w-4 text-primary" />
          </div>
          <h1 className="text-base font-semibold">Data Fabric Explorer</h1>
        </div>
        <div className="flex items-center gap-1">
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
