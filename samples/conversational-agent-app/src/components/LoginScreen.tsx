/**
 * LoginScreen - Simple login screen with UiPath branding
 */

import { useAuth } from '../context/AuthContext'
import { Spinner } from './Spinner'

export function LoginScreen() {
  const { login, error, isLoading } = useAuth()

  return (
    <div className="h-full flex items-center justify-center bg-chat-bg">
      <div className="max-w-md w-full p-8 text-center">
        {/* Logo */}
        <div className="w-20 h-20 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold mb-2">Conversational Agent</h1>
        <p className="text-gray-400 mb-8">Sign in with your UiPath account to continue</p>

        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Login button */}
        <button
          onClick={login}
          disabled={isLoading}
          className="w-full px-6 py-3 bg-accent hover:bg-accent/90 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Spinner className="w-5 h-5 border-white" />
              <span>Signing in...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              <span>Sign in with UiPath</span>
            </>
          )}
        </button>

        {/* Footer */}
        <p className="mt-8 text-xs text-gray-500">
          You will be redirected to UiPath to authenticate
        </p>
      </div>
    </div>
  )
}
