import { useEffect, useState } from 'react'
import { Folder, ListChecks, LogOut, ShieldCheck, X } from 'lucide-react'
import type { UiPathSDKConfig } from '@uipath/uipath-typescript/core'
import { Alert, AlertDescription } from '@uipath/apollo-wind/components/ui/alert'
import { Button } from '@uipath/apollo-wind/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@uipath/apollo-wind/components/ui/card'
import { Input } from '@uipath/apollo-wind/components/ui/input'
import { Spinner } from '@uipath/apollo-wind/components/ui/spinner'
import { Toaster } from '@uipath/apollo-wind/components/ui/sonner'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { TaskList } from './components/TaskList'
import { ThemeToggle } from './components/Theme'

// Coded App pattern: the SDK fills config from `<meta name="uipath:*">` tags
// (injected locally by coded-apps-dev or by the platform), so we pass {}.
const authConfig = {} as UiPathSDKConfig

const FOLDER_STORAGE_KEY = 'action-center-app.folderId'

function AppContent() {
  const { isAuthenticated, isLoading, login, logout, error } = useAuth()

  // Persist the folder filter across refresh/OAuth; blank = all folders.
  const [folderId, setFolderId] = useState<number | null>(() => {
    const stored = localStorage.getItem(FOLDER_STORAGE_KEY)
    const parsed = stored ? Number(stored) : NaN
    return Number.isFinite(parsed) ? parsed : null
  })
  const [draft, setDraft] = useState(folderId?.toString() ?? '')

  useEffect(() => {
    if (folderId == null) localStorage.removeItem(FOLDER_STORAGE_KEY)
    else localStorage.setItem(FOLDER_STORAGE_KEY, String(folderId))
  }, [folderId])

  const commitFolder = () => {
    const trimmed = draft.trim()
    const parsed = trimmed === '' ? null : Number(trimmed)
    setFolderId(parsed != null && Number.isFinite(parsed) ? parsed : null)
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner label="Initializing UiPath SDK…" showLabel />
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="items-center text-center">
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <CardTitle>Action Center Manager</CardTitle>
            <CardDescription>
              Triage UiPath Action Center tasks — list, assign, complete, and create them.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button onClick={login} className="w-full">
              Sign in with UiPath
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <header className="flex items-center justify-between gap-4 border-b px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <ListChecks className="h-5 w-5 shrink-0 text-primary" />
          <h1 className="truncate text-base font-semibold">Action Center Manager</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Folder
              className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              id="folder-id"
              // type=text + inputMode=numeric: numeric keypad on mobile, no
              // desktop spinner arrows (incrementing an ID isn't meaningful).
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              value={draft}
              onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, ''))}
              onBlur={commitFolder}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitFolder()
                if (e.key === 'Escape' && draft) {
                  setDraft('')
                  setFolderId(null)
                }
              }}
              placeholder="All folders"
              aria-label="Folder ID"
              title="Optional — leave blank to list tasks across all your folders"
              className="w-44 pl-8 pr-8"
            />
            {draft && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setDraft('')
                  setFolderId(null)
                }}
                aria-label="Clear folder filter"
                title="Clear folder filter"
                className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
          <ThemeToggle />
          <Button variant="ghost" size="sm" onClick={logout}>
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </div>
      </header>

      <main className="min-h-0 flex-1">
        <TaskList folderId={folderId} />
      </main>
      <Toaster />
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider config={authConfig}>
      <AppContent />
    </AuthProvider>
  )
}
