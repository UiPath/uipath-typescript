import { AuthProvider, useAuth } from '@/context/AuthContext'
import { Dashboard } from '@/components/Dashboard'
import { LoginScreen } from '@/components/LoginScreen'

function Gate() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-(--brand)" />
      </div>
    )
  }
  return isAuthenticated ? <Dashboard /> : <LoginScreen />
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  )
}
