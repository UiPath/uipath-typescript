import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { getCurrentUser } from '../lib/identity'
import type { CurrentUser } from '../lib/identity'
import { isAccessAdmin } from '../lib/access'
import { createMaintenanceStore } from '../lib/maintenance-store'

interface MaintenanceContextType {
  /** `checking` until both the admin check and the switch read have settled. */
  status: 'checking' | 'ready'
  user: CurrentUser | null
  /** Member of the Administrators group. `false` whenever that could not be confirmed. */
  isAdmin: boolean
  /** The switch, as last read. `false` whenever it could not be read. */
  maintenanceEnabled: boolean
  /** Why the admin check failed, if it did. */
  accessError: string | null
  /** Why the switch could not be read, if it couldn't. */
  maintenanceError: string | null
  /** Where the switch is stored, in words. */
  storeDescription: string
  /** Admin-only: show the maintenance page exactly as end users see it. */
  previewing: boolean
  setPreviewing: (previewing: boolean) => void
  /** Re-runs both checks — what "Try again" on the maintenance page does. */
  refresh: () => Promise<void>
  /** Flips the switch and reflects the new value locally. Throws on failure. */
  changeMaintenanceMode: (enabled: boolean) => Promise<void>
}

const MaintenanceContext = createContext<MaintenanceContextType | undefined>(undefined)

/**
 * Decides what the signed-in user should see.
 *
 * Two questions are asked once, in parallel, when the app starts:
 * is maintenance mode on, and is this user an Administrator. Checking only at
 * startup keeps a session that is already open untouched when the switch is
 * flipped — users meet the maintenance page on their next page load.
 *
 * Each failure degrades in the safe direction for that question:
 * - Admin check fails → treated as **not** an admin. A privilege that cannot
 *   be confirmed is not granted.
 * - Switch read fails → treated as **off**. A transient failure to read the
 *   switch must not take the app down for everyone.
 */
export function MaintenanceProvider({ children }: { children: ReactNode }) {
  const { sdk } = useAuth()
  const store = useMemo(() => createMaintenanceStore(sdk), [sdk])

  const [status, setStatus] = useState<'checking' | 'ready'>('checking')
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false)
  const [accessError, setAccessError] = useState<string | null>(null)
  const [maintenanceError, setMaintenanceError] = useState<string | null>(null)
  const [previewing, setPreviewing] = useState(false)

  const refresh = useCallback(async () => {
    setStatus('checking')

    let currentUser: CurrentUser | null = null
    try {
      currentUser = getCurrentUser(sdk)
    } catch (err) {
      console.warn('Could not read the signed-in user from the access token:', err)
    }

    const [access, maintenance] = await Promise.allSettled([
      isAccessAdmin(sdk),
      store.read(),
    ])

    if (access.status === 'fulfilled') {
      setIsAdmin(access.value)
      setAccessError(null)
    } else {
      console.warn('Admin check failed — treating the user as a non-admin:', access.reason)
      setIsAdmin(false)
      setAccessError(messageOf(access.reason))
    }

    if (maintenance.status === 'fulfilled') {
      setMaintenanceEnabled(maintenance.value)
      setMaintenanceError(null)
    } else {
      console.warn('Could not read the maintenance switch — treating it as off:', maintenance.reason)
      setMaintenanceEnabled(false)
      setMaintenanceError(messageOf(maintenance.reason))
    }

    setUser(currentUser)
    setStatus('ready')
  }, [sdk, store])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const changeMaintenanceMode = useCallback(
    async (enabled: boolean) => {
      await store.write(enabled)
      setMaintenanceEnabled(enabled)
      setMaintenanceError(null)
    },
    [store],
  )

  return (
    <MaintenanceContext.Provider
      value={{
        status,
        user,
        isAdmin,
        maintenanceEnabled,
        accessError,
        maintenanceError,
        storeDescription: store.describe(),
        previewing,
        setPreviewing,
        refresh,
        changeMaintenanceMode,
      }}
    >
      {children}
    </MaintenanceContext.Provider>
  )
}

export function useMaintenance() {
  const ctx = useContext(MaintenanceContext)
  if (!ctx) throw new Error('useMaintenance must be used inside <MaintenanceProvider>')
  return ctx
}

function messageOf(reason: unknown): string {
  return reason instanceof Error ? reason.message : String(reason)
}
