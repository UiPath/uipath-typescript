import { CircleCheck, Info, Lock, ShieldCheck, TriangleAlert } from 'lucide-react'
import { useMaintenance } from '../context/MaintenanceContext'
import { ADMINISTRATORS_GROUP_NAME } from '../lib/access'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@uipath/apollo-wind/components/ui/card'
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@uipath/apollo-wind/components/ui/alert'

/**
 * The app itself. In a real app this is your existing UI; the gate around it
 * is what this sample is about. Here it shows the live inputs the gate used to
 * let you in, so the mechanics are visible rather than hidden.
 */
export function HomePage() {
  const { user, isAdmin, maintenanceEnabled, accessError, maintenanceError, storeDescription } =
    useMaintenance()

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">
          You’re in — here’s why
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          The gate asks two questions when the app starts. Both answers, as it
          saw them for you:
        </p>
      </div>

      {maintenanceError && (
        <Alert variant="destructive">
          <TriangleAlert className="h-4 w-4" />
          <AlertTitle>Couldn’t read the maintenance switch</AlertTitle>
          <AlertDescription>
            {maintenanceError} The app is shown because a switch that can’t be
            read is treated as off.
          </AlertDescription>
        </Alert>
      )}

      {accessError && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Couldn’t confirm administrator access</AlertTitle>
          <AlertDescription>
            {accessError} You are treated as a regular user until this
            succeeds.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>1 · Is maintenance mode on?</CardDescription>
            <CardTitle className="flex items-center gap-2 text-base">
              {maintenanceEnabled ? (
                <>
                  <TriangleAlert className="h-4 w-4 text-amber-700 dark:text-amber-300" />
                  Yes
                </>
              ) : (
                <>
                  <CircleCheck className="h-4 w-4 text-emerald-700 dark:text-emerald-300" />
                  No
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Read from the app’s settings store —{' '}
            <span className="text-foreground">{storeDescription}</span>. An
            administrator flips it on the Settings page; the change applies on
            the next page load.
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>2 · Are you an Administrator?</CardDescription>
            <CardTitle className="flex items-center gap-2 text-base">
              {isAdmin ? (
                <>
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Yes
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  No
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Membership of the built-in{' '}
            <code className="font-mono text-foreground">{ADMINISTRATORS_GROUP_NAME}</code>{' '}
            group, checked with the Groups and Directory services.
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardDescription>Signed in as</CardDescription>
          <CardTitle className="text-base font-mono break-all">
            {user?.userId ?? 'unknown'}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          User GUID from the access token’s <code className="font-mono">sub</code>{' '}
          claim; organization{' '}
          <code className="font-mono break-all">{user?.organizationId ?? 'unknown'}</code>{' '}
          from <code className="font-mono">prt_id</code>. This is the id the
          membership check is made for.
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Your app goes here</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            Replace this page with your own UI. Everything that decides whether
            it renders lives in <code className="font-mono">src/lib/</code> and{' '}
            <code className="font-mono">src/context/MaintenanceContext.tsx</code>{' '}
            — the pages themselves don’t need to know about maintenance mode.
          </p>
          <p>
            To change what blocked users read, edit{' '}
            <code className="font-mono">MAINTENANCE_COPY</code> in{' '}
            <code className="font-mono">src/components/MaintenancePage.tsx</code>.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
