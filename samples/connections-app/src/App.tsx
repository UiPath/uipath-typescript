import { useEffect, useRef, useState } from 'react'
import { Button } from '@mui/material'
import { UiPath, UiPathError } from '@uipath/uipath-typescript/core'
import ConnectorsPage from './pages/ConnectorsPage'
import './App.css'

/**
 * Coded App pattern: `new UiPath()` with no config picks up `clientId`,
 * `orgName`, `tenantName`, `baseUrl`, `scope`, and `redirectUri` from the
 * `<meta name="uipath:*">` tags injected by `@uipath/coded-apps-dev`
 * (locally, from `uipath.json`) or by the UiPath platform (in production).
 */
function App() {
  const [sdk] = useState<UiPath>(() => new UiPath())
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Guard against React StrictMode's double-invocation in dev — the OAuth
  // `code` is single-use, so calling completeOAuth() twice fails the second
  // time with "Authentication failed".
  const didInit = useRef(false)

  useEffect(() => {
    if (didInit.current) return
    didInit.current = true

    const init = async () => {
      setIsLoading(true)
      setError(null)
      try {
        if (sdk.isInOAuthCallback()) {
          // SDK strips ?code & ?state from the URL after a successful exchange.
          await sdk.completeOAuth()
        }
        setIsAuthenticated(sdk.isAuthenticated())
      } catch (err) {
        console.error('Auth init failed:', err)
        setError(
          err instanceof UiPathError ? err.message : 'Authentication failed',
        )
        setIsAuthenticated(false)
      } finally {
        setIsLoading(false)
      }
    }
    init()
  }, [sdk])

  const login = async () => {
    setIsLoading(true)
    setError(null)
    try {
      // Redirects to UiPath; the app reloads into the callback branch above.
      await sdk.initialize()
      setIsAuthenticated(sdk.isAuthenticated())
    } catch (err) {
      console.error('Login failed:', err)
      setError(err instanceof UiPathError ? err.message : 'Login failed')
      setIsAuthenticated(false)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="app-container">
      <div className="app-header">
        <h1>Connections Explorer</h1>
        <p>
          Browse connectors, inspect their connections and activities, then
          build and run an activity against a live connection.
        </p>
      </div>

      {isLoading ? (
        <div className="loading-container">
          <div className="loading-spinner" />
          <div className="loading-text">Initializing UiPath SDK…</div>
        </div>
      ) : !isAuthenticated ? (
        <div className="connectors-panel">
          <div className="empty-state">
            <div className="empty-state-icon">🔌</div>
            <h2 className="empty-state-title">Sign in to UiPath</h2>
            <p className="empty-state-description">
              Connect to your tenant to browse connectors and their connections.
            </p>
            {error && <div className="connectors-error">{error}</div>}
            <Button
              variant="contained"
              onClick={login}
              sx={{
                mt: 3,
                background:
                  'linear-gradient(135deg, var(--teal-600), var(--teal-700))',
              }}
            >
              Sign in
            </Button>
          </div>
        </div>
      ) : (
        <ConnectorsPage uipathSdk={sdk} />
      )}
    </div>
  )
}

export default App
