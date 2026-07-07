import { ShieldCheck } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

export function LoginScreen() {
  const { login, isLoading, error } = useAuth()

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <ShieldCheck className="mx-auto h-10 w-10 text-(--brand)" />
        <h1 className="mt-4 text-lg font-bold">Runtime Compliance Violations</h1>
        <p className="mt-1 text-sm text-slate-500">
          Sign in with your UiPath account to load compliance check results for your agent fleet.
        </p>
        <button
          type="button"
          onClick={login}
          disabled={isLoading}
          className="mt-6 w-full rounded-lg bg-(--brand) px-4 py-2 text-sm font-semibold text-white hover:bg-(--brand-dark) disabled:opacity-50"
        >
          {isLoading ? 'Signing in…' : 'Sign in with UiPath'}
        </button>
        {error && <p className="mt-3 text-xs text-red-600">{error}</p>}
      </div>
    </div>
  )
}
