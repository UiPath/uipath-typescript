import { useCallback, useMemo, useState } from 'react';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { Button } from '@uipath/apollo-wind/components/ui/button';
import { Card, CardContent } from '@uipath/apollo-wind/components/ui/card';
import { Spinner } from '@uipath/apollo-wind/components/ui/spinner';
import type { UiPath } from '@uipath/uipath-typescript/core';
import { createApi, errorMessage, type ReadCredentialOutput } from './api';
import { useAuth } from './auth';
import { ReadResult } from './components/ReadResult';
import { ThemeToggle } from './components/ThemeToggle';

export function App() {
  const { sdk, status, error: authError, signIn } = useAuth();

  if (status === 'checking') {
    return (
      <div className="grid min-h-dvh place-items-center">
        <Spinner className="size-6" />
        <span className="sr-only">Checking your session</span>
      </div>
    );
  }

  if (status !== 'ready') {
    return <SignIn error={authError} onSignIn={signIn} />;
  }

  return <Secrets sdk={sdk} />;
}

function SignIn({ error, onSignIn }: { error: string | null; onSignIn: () => Promise<void> }) {
  return (
    <div className="grid min-h-dvh place-items-center p-6">
      <Card className="w-full max-w-md">
        <CardContent className="space-y-4 p-6 text-center">
          <ShieldCheck className="mx-auto size-8 text-primary" />
          <h1 className="text-xl font-semibold">Partner Credential</h1>
          <p className="text-sm text-muted-foreground">
            A credential this page is never allowed to hold, used on its behalf by a coded function.
          </p>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button className="w-full" onClick={onSignIn}>
            Sign in with UiPath
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Secrets({ sdk }: { sdk: UiPath }) {
  const api = useMemo(() => createApi(sdk), [sdk]);

  const [result, setResult] = useState<ReadCredentialOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const read = useCallback(async () => {
    setBusy(true);
    setResult(null);
    setError(null);
    try {
      setResult(await api.readCredential());
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }, [api]);

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Partner Credential</h1>
          <p className="mt-1 max-w-prose text-sm text-muted-foreground">
            The credential lives in an Orchestrator Credential asset. This page cannot read it —
            not even with your own token. The function reads it with <code>ctx.robot</code>, its own
            identity, and returns proof it was used: a username, a length and a fingerprint.
          </p>
        </div>
        <ThemeToggle />
      </header>

      <Button onClick={read} disabled={busy}>
        {busy ? <Spinner className="size-4" /> : <KeyRound className="size-4" />}
        Use the credential
      </Button>

      <ReadResult result={result} error={error} />

      <p className="text-sm text-muted-foreground">
        Nothing in this page ever holds the secret. Open the network tab and read the response — a
        length and a fingerprint are all that cross the boundary. That is the pattern: the value
        stays server-side, and the caller gets only evidence that it was used.
      </p>
    </div>
  );
}
