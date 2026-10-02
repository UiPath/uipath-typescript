import { useState } from 'react'
import { ArrowLeft, Construction, LogOut, RefreshCw } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useMaintenance } from '../context/MaintenanceContext'
import { Button } from '@uipath/apollo-wind/components/ui/button'

/**
 * Everything a user reads on the maintenance page, in one place. Change the
 * wording, add a contact, or a planned end time — nothing else needs touching.
 */
const MAINTENANCE_COPY = {
  title: 'We’re doing some maintenance',
  message:
    'This app is temporarily unavailable while we make improvements. Please check back shortly — nothing is needed from you.',
  adminHint:
    'Administrators can still access the app during maintenance. If you should have access, sign out and sign in with an administrator account.',
} as const

interface MaintenancePageProps {
  /** Rendered from an admin's preview rather than because the user is gated. */
  preview?: boolean
}

/**
 * What end users see while maintenance mode is on.
 *
 * Deliberately self-contained and calm: no navigation, no data, nothing that
 * could fail. "Try again" re-runs the gate's checks so a user who reloads once
 * maintenance is over gets the app back without signing in again.
 */
export function MaintenancePage({ preview = false }: MaintenancePageProps) {
  const { logout } = useAuth()
  const { refresh, setPreviewing } = useMaintenance()
  const [retrying, setRetrying] = useState(false)

  const retry = async () => {
    setRetrying(true)
    try {
      await refresh()
    } finally {
      setRetrying(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      {preview && (
        <div
          role="status"
          className="border-b border-primary/20 bg-primary/10 px-4 py-2 flex items-center justify-between gap-4 text-sm"
        >
          <span>
            <span className="font-medium">Preview.</span> This is the page end
            users see while maintenance mode is on.
          </span>
          <Button variant="outline" size="sm" onClick={() => setPreviewing(false)}>
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Exit preview
          </Button>
        </div>
      )}

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/15 flex items-center justify-center mx-auto mb-5">
            <Construction className="h-7 w-7 text-amber-700 dark:text-amber-300" />
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-balance">
            {MAINTENANCE_COPY.title}
          </h1>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            {MAINTENANCE_COPY.message}
          </p>

          <div className="mt-6 flex items-center justify-center gap-2">
            <Button onClick={retry} disabled={retrying || preview}>
              <RefreshCw className={`h-4 w-4 mr-1.5 ${retrying ? 'animate-spin' : ''}`} />
              {retrying ? 'Checking…' : 'Try again'}
            </Button>
            <Button variant="outline" onClick={logout} disabled={preview}>
              <LogOut className="h-4 w-4 mr-1.5" />
              Sign out
            </Button>
          </div>

          <p className="mt-8 text-xs text-muted-foreground max-w-sm mx-auto">
            {MAINTENANCE_COPY.adminHint}
          </p>
        </div>
      </main>
    </div>
  )
}
