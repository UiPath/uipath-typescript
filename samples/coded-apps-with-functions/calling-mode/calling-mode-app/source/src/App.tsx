import { useCallback, useMemo, useState } from 'react';
import { Button } from '@uipath/apollo-wind/components/ui/button';
import { Card, CardContent } from '@uipath/apollo-wind/components/ui/card';
import { Input } from '@uipath/apollo-wind/components/ui/input';
import { Spinner } from '@uipath/apollo-wind/components/ui/spinner';
import { ArrowLeftRight } from 'lucide-react';
import type { UiPath } from '@uipath/uipath-typescript/core';
import {
  createApi,
  errorMessage,
  INPUT_INLINE_LIMIT_KB,
  OUTPUT_INLINE_LIMIT_KB,
  type Run,
} from './api';
import { useAuth } from './auth';
import { RunCard } from './components/RunCard';
import { ThemeToggle } from './components/ThemeToggle';

/** Small enough for either channel, then big enough that only a job carries it. */
const PRESETS = [
  { label: 'Small — 2 KB', sendKb: 2, askKb: 2 },
  { label: 'Large — 1 MB', sendKb: 1024, askKb: 1024 },
];

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

  if (status !== 'ready') return <SignIn error={authError} onSignIn={signIn} />;
  return <CallingMode sdk={sdk} />;
}

function SignIn({ error, onSignIn }: { error: string | null; onSignIn: () => Promise<void> }) {
  return (
    <div className="grid min-h-dvh place-items-center p-6">
      <Card className="w-full max-w-md">
        <CardContent className="space-y-4 p-6 text-center">
          <ArrowLeftRight className="mx-auto size-8 text-primary" />
          <h1 className="text-xl font-semibold">Calling mode</h1>
          <p className="text-sm text-muted-foreground">
            The same work called two ways: wait for a response, or run it as a job.
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

function CallingMode({ sdk }: { sdk: UiPath }) {
  const api = useMemo(() => createApi(sdk), [sdk]);

  const [sendKb, setSendKb] = useState(2);
  const [askKb, setAskKb] = useState(2);

  const [httpRun, setHttpRun] = useState<Run | null>(null);
  const [httpError, setHttpError] = useState<string | null>(null);
  const [httpBusy, setHttpBusy] = useState(false);

  const [jobRun, setJobRun] = useState<Run | null>(null);
  const [jobError, setJobError] = useState<string | null>(null);
  const [jobBusy, setJobBusy] = useState(false);
  const [tick, setTick] = useState<string | null>(null);

  const runHttp = useCallback(
    async (s = sendKb, a = askKb) => {
      setHttpBusy(true);
      setHttpError(null);
      setHttpRun(null);
      try {
        setHttpRun(await api.http(s, a));
      } catch (e) {
        setHttpError(errorMessage(e));
      } finally {
        setHttpBusy(false);
      }
    },
    [api, sendKb, askKb],
  );

  const runJob = useCallback(
    async (s = sendKb, a = askKb) => {
      setJobBusy(true);
      setJobError(null);
      setJobRun(null);
      setTick('starting…');
      try {
        setJobRun(await api.job(s, a, (state, ms) => setTick(`${state} · ${Math.round(ms / 1000)}s`)));
      } catch (e) {
        setJobError(errorMessage(e));
      } finally {
        setJobBusy(false);
        setTick(null);
      }
    },
    [api, sendKb, askKb],
  );

  /* Both channels at the same size, side by side — the comparison is the point. */
  const runBoth = useCallback(
    (s: number, a: number) => {
      setSendKb(s);
      setAskKb(a);
      void runHttp(s, a);
      void runJob(s, a);
    },
    [runHttp, runJob],
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Calling mode</h1>
          <p className="mt-1 max-w-prose text-sm text-muted-foreground">
            Two functions doing identical work. One declares <code>method</code> and{' '}
            <code>path</code> and answers over HTTP; the other declares neither and runs as a job.
            Pick a payload size and run both — at a megabyte only one of them can carry it.
          </p>
        </div>
        <ThemeToggle />
      </header>

      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <Button
                key={p.label}
                size="sm"
                variant="outline"
                disabled={httpBusy || jobBusy}
                onClick={() => runBoth(p.sendKb, p.askKb)}
              >
                {p.label} — run both
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm">
              <span className="block text-muted-foreground">send (KB)</span>
              <Input
                type="number"
                min={0}
                max={4096}
                value={sendKb}
                onChange={(e) => setSendKb(Number(e.target.value))}
                className="max-w-28"
              />
            </label>
            <label className="text-sm">
              <span className="block text-muted-foreground">ask for (KB)</span>
              <Input
                type="number"
                min={0}
                max={4096}
                value={askKb}
                onChange={(e) => setAskKb(Number(e.target.value))}
                className="max-w-28"
              />
            </label>
          </div>

          <p className="text-xs text-muted-foreground">
            {sendKb > INPUT_INLINE_LIMIT_KB || askKb > OUTPUT_INLINE_LIMIT_KB ? (
              <>
                At this size HTTP will fail and the job will use attachments. Over{' '}
                {INPUT_INLINE_LIMIT_KB} KB in, the trigger answers{' '}
                <code>500 errorCode 4801</code>; over {OUTPUT_INLINE_LIMIT_KB} KB out, it answers{' '}
                <code>200</code> with an empty body.
              </>
            ) : (
              <>Small enough for both channels — they should agree.</>
            )}
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <RunCard
          title="HTTP semantics"
          declaration='method: "POST", path: "/echo"'
          blurb="Invoked and answered in one call. Good for work a caller can wait for — and limited to what fits in a request and a response."
          run={httpRun}
          error={httpError}
          busy={httpBusy}
          onRun={() => void runHttp()}
        />
        <RunCard
          title="Job"
          declaration="no method, no path"
          blurb="Started and polled. Nothing has to stay connected, and large payloads travel as attachments."
          run={jobRun}
          error={jobError}
          busy={jobBusy}
          tick={tick}
          onRun={() => void runJob()}
        />
      </div>

      <p className="text-sm text-muted-foreground">
        Both functions have the same handler — <code>functions/echo.ts</code> and{' '}
        <code>functions/bulk.ts</code> differ only in whether they declare <code>method</code> and{' '}
        <code>path</code>. That one difference decides whether you get a URL to call or a job to
        start, and whether a megabyte can get through.
      </p>
    </div>
  );
}
