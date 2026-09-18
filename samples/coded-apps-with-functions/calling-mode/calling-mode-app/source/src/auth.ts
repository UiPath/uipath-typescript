import { useCallback, useEffect, useState } from 'react';
import { UiPath } from '@uipath/uipath-typescript/core';

export type AuthStatus = 'checking' | 'signedOut' | 'ready' | 'error';

/**
 * Gates the app behind OAuth.
 *
 * `sdk.initialize()` starts a PKCE redirect, so calling it during render paints
 * the UI for a moment before navigating away. This checks the existing session
 * on mount and only redirects when the user asks to sign in, so nothing of the
 * app is shown to someone who is not signed in.
 *
 * `new UiPath()` takes no arguments: deployed, the platform injects clientId,
 * scope, org, tenant, baseUrl and redirectUri as <meta name="uipath:*"> tags;
 * locally the coded-apps-dev Vite plugin injects the same tags from uipath.json.
 */
export function useAuth() {
  const [sdk] = useState(() => new UiPath());
  const [status, setStatus] = useState<AuthStatus>('checking');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // Returning from the identity provider: finish the handshake first.
        if (sdk.isInOAuthCallback()) {
          await sdk.completeOAuth();
        }
        if (!cancelled) setStatus(sdk.isAuthenticated() ? 'ready' : 'signedOut');
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not complete sign-in.');
          setStatus('error');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sdk]);

  const signIn = useCallback(async () => {
    setError(null);
    try {
      // Redirects away from the page; execution normally stops here.
      await sdk.initialize();
      setStatus(sdk.isAuthenticated() ? 'ready' : 'signedOut');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sign-in failed.');
      setStatus('error');
    }
  }, [sdk]);

  return { sdk, status, error, signIn };
}
