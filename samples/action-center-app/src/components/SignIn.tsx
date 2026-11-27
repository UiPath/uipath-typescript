import { ShieldCheck } from 'lucide-react'
import { Alert, AlertDescription } from '@uipath/apollo-wind/components/ui/alert'
import { Button } from '@uipath/apollo-wind/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@uipath/apollo-wind/components/ui/card'

/** Sign-in card shown until the user has authenticated with UiPath. */
export function SignIn({ error, onSignIn }: { error: string | null; onSignIn: () => void }) {
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
          <Button onClick={onSignIn} className="w-full">
            Sign in with UiPath
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
