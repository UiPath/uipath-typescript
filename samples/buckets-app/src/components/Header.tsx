import { Archive, LogOut } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Button } from '@uipath/apollo-wind/components/ui/button'
import { ThemeToggle } from './ThemeToggle'

export function Header({ folderId }: { folderId: number }) {
  const { logout } = useAuth()
  return (
    <header className="border-b bg-background shrink-0">
      <div className="px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
            <Archive className="h-4 w-4 text-primary" />
          </div>
          <h1 className="text-base font-semibold truncate">Bucket Explorer</h1>
          <span className="text-xs text-muted-foreground font-mono truncate">
            Folder {folderId}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
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
