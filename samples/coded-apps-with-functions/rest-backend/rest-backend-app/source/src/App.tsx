import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@uipath/apollo-wind/components/ui/button';
import { Card, CardContent } from '@uipath/apollo-wind/components/ui/card';
import { Spinner } from '@uipath/apollo-wind/components/ui/spinner';
import { Receipt } from 'lucide-react';
import type { UiPath } from '@uipath/uipath-typescript/core';
import {
  createApi,
  errorMessage,
  type Invoice,
  type InvoiceLineReadOutput,
  type InvoiceListOutput,
  type InvoiceStatus,
} from './api';
import { useAuth } from './auth';
import { InvoiceDetail } from './components/InvoiceDetail';
import { InvoiceList } from './components/InvoiceList';
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

  return <Invoices sdk={sdk} />;
}

function SignIn({ error, onSignIn }: { error: string | null; onSignIn: () => Promise<void> }) {
  return (
    <div className="grid min-h-dvh place-items-center p-6">
      <Card className="w-full max-w-md">
        <CardContent className="space-y-4 p-6 text-center">
          <Receipt className="mx-auto size-8 text-primary" />
          <h1 className="text-xl font-semibold">Invoices</h1>
          <p className="text-sm text-muted-foreground">
            Three coded functions, shaped as the REST resources a web developer would expect.
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

function Invoices({ sdk }: { sdk: UiPath }) {
  const api = useMemo(() => createApi(sdk), [sdk]);

  const [list, setList] = useState<InvoiceListOutput | null>(null);
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all');
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [line, setLine] = useState<InvoiceLineReadOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /* Each drill-down is a separate call to a separately addressable resource,
     which is the argument the sample is making. The alternative — read the line
     out of the invoice already in state — would be fewer round trips and would
     demonstrate nothing. */
  const loadList = useCallback(
    async (filter: InvoiceStatus | 'all') => {
      setBusy(true);
      setError(null);
      try {
        setList(await api.listInvoices(filter === 'all' ? {} : { status: filter }));
      } catch (e) {
        setError(errorMessage(e));
      } finally {
        setBusy(false);
      }
    },
    [api],
  );

  useEffect(() => {
    void loadList(statusFilter);
  }, [loadList, statusFilter]);

  const openInvoice = useCallback(
    async (invoiceId: string) => {
      setBusy(true);
      setError(null);
      setLine(null);
      try {
        setInvoice(await api.readInvoice({ invoiceId }));
      } catch (e) {
        setInvoice(null);
        setError(errorMessage(e));
      } finally {
        setBusy(false);
      }
    },
    [api],
  );

  const openLine = useCallback(
    async (lineNo: number) => {
      if (!invoice) return;
      setError(null);
      try {
        setLine(await api.readInvoiceLine({ invoiceId: invoice.invoiceId, lineNo }));
      } catch (e) {
        setLine(null);
        setError(errorMessage(e));
      }
    },
    [api, invoice],
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Invoices</h1>
          <p className="mt-1 max-w-prose text-sm text-muted-foreground">
            A collection, one resource, and a nested sub-resource — three coded functions declared
            as <code>/invoices</code>, <code>/invoices/:invoiceId</code> and{' '}
            <code>/invoices/:invoiceId/lines/:lineNo</code>. The route is shown above every result.
          </p>
        </div>
        <ThemeToggle />
      </header>

      <InvoiceList
        data={list}
        busy={busy}
        status={statusFilter}
        selectedId={invoice?.invoiceId ?? null}
        onStatus={setStatusFilter}
        onSelect={openInvoice}
      />

      {invoice ? (
        <InvoiceDetail
          invoice={invoice}
          line={line}
          error={error}
          onLine={openLine}
          onClearLine={() => setLine(null)}
        />
      ) : error ? (
        <Card className="border-destructive/40">
          <CardContent className="p-4">
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      ) : null}

      <p className="text-sm text-muted-foreground">
        Nothing here needs an Orchestrator resource: the invoice data ships inside the function
        package, so the only thing on display is the shape of the endpoints. Open the network tab
        and note that the SDK sends the declared slug with the values as query parameters — call the
        trigger with <code>curl</code> and the path form works as written. The README explains both.
      </p>
    </div>
  );
}
