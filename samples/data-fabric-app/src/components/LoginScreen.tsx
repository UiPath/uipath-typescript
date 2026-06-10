import { Database } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export function LoginScreen() {
  const { login, error, isLoading } = useAuth()

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
            <Database className="h-5 w-5 text-primary" />
          </div>
          <CardTitle>Data Fabric Explorer</CardTitle>
          <CardDescription>
            Browse and edit your UiPath Data Fabric entities and records.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Login failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Button onClick={login} disabled={isLoading} className="w-full">
            {isLoading ? 'Signing in…' : 'Sign in with UiPath'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
