import { useEffect, useState } from 'react'
import type { UiPathSDKConfig } from '@uipath/uipath-typescript/core'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { TaskList } from './components/TaskList'

// Coded App pattern: the SDK fills required fields (clientId, orgName,
// tenantName, baseUrl, scope, redirectUri) from `<meta name="uipath:*">` tags
// injected at runtime — by `@uipath/coded-apps-dev` locally (from uipath.json)
// or by the platform when deployed. The static type insists on those fields,
// so we pass an empty object cast to satisfy it.
const authConfig = {} as UiPathSDKConfig

const FOLDER_STORAGE_KEY = 'action-center-app.folderId'

function AppContent() {
  const { isAuthenticated, isLoading, login, logout, error } = useAuth()

  // Action Center tasks are folder-scoped. Persist the choice so it survives a
  // refresh and the OAuth round-trip.
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
      <div className="flex h-screen items-center justify-center text-gray-500">
        Initializing UiPath SDK…
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-sm rounded-lg border bg-white p-8 text-center shadow-sm">
          <h1 className="mb-2 text-xl font-semibold">Action Center Manager</h1>
          <p className="mb-6 text-sm text-gray-600">
            Triage UiPath Action Center tasks — list, assign, complete, and create them.
          </p>
          {error && <p className="mb-4 rounded-md bg-red-50 p-2 text-sm text-red-700">{error}</p>}
          <button
            onClick={login}
            className="w-full rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
          >
            Sign in with UiPath
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-white text-gray-900">
      <header className="flex items-center justify-between gap-4 border-b px-4 py-3 sm:px-6">
        <h1 className="truncate text-base font-semibold">Action Center Manager</h1>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-sm text-gray-600">
            <span className="hidden sm:inline">Folder ID</span>
            <input
              type="number"
              inputMode="numeric"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitFolder}
              onKeyDown={(e) => e.key === 'Enter' && commitFolder()}
              placeholder="all folders"
              title="Optional — leave blank to list tasks across all your folders"
              className="w-32 rounded-md border px-2 py-1 text-sm"
            />
          </label>
          <button onClick={logout} className="text-sm text-gray-600 hover:text-gray-900">
            Sign out
          </button>
        </div>
      </header>

      <main className="min-h-0 flex-1">
        <TaskList folderId={folderId} />
      </main>
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
