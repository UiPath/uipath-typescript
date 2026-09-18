import { Badge } from '@uipath/apollo-wind/components/ui/badge';
import { Button } from '@uipath/apollo-wind/components/ui/button';
import { Card, CardContent } from '@uipath/apollo-wind/components/ui/card';
import { Spinner } from '@uipath/apollo-wind/components/ui/spinner';
import type { InvoiceListOutput, InvoiceStatus } from '../api';
import { Route } from './Route';

const STATUSES: (InvoiceStatus | 'all')[] = ['all', 'draft', 'pending', 'approved', 'rejected'];

const money = (n: number) => n.toLocaleString(undefined, { style: 'currency', currency: 'EUR' });

/**
 * The collection route.
 *
 * The status filter is a QUERY parameter, not a path segment: it selects a view
 * of the collection rather than addressing a different resource. Clicking a row
 * moves to the item route, which is where a path param belongs.
 */
export function InvoiceList({
  data,
  busy,
  status,
  selectedId,
  onStatus,
  onSelect,
}: {
  data: InvoiceListOutput | null;
  busy: boolean;
  status: InvoiceStatus | 'all';
  selectedId: string | null;
  onStatus: (s: InvoiceStatus | 'all') => void;
  onSelect: (invoiceId: string) => void;
}) {
  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Route method="GET" path={status === 'all' ? '/invoices' : `/invoices?status=${status}`} />
          {data ? (
            <span className="text-xs text-muted-foreground">
              {data.invoices.length} of {data.totalCount}
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <Button
              key={s}
              size="sm"
              variant={s === status ? 'default' : 'outline'}
              onClick={() => onStatus(s)}
              disabled={busy}
            >
              {s}
            </Button>
          ))}
        </div>

        {busy && !data ? (
          <div className="flex justify-center py-6">
            <Spinner className="size-5" />
          </div>
        ) : null}

        {data && data.invoices.length === 0 ? (
          /* 200 with an empty array, not a 404 — the collection exists, it is
             just empty under this filter. */
          <p className="py-4 text-sm text-muted-foreground">
            No invoices with status “{status}”. The collection route returned 200 with an empty
            array — an empty collection is not a missing one.
          </p>
        ) : null}

        {data && data.invoices.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Invoice</th>
                  <th className="py-2 pr-3 font-medium">Vendor</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 pr-3 text-right font-medium">Total</th>
                  <th className="py-2 pr-3 text-right font-medium">Lines</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.invoices.map((inv) => (
                  <tr
                    key={inv.invoiceId}
                    className={
                      inv.invoiceId === selectedId ? 'border-b bg-muted/50' : 'border-b'
                    }
                  >
                    <td className="py-2 pr-3 font-mono">{inv.invoiceId}</td>
                    <td className="py-2 pr-3">{inv.vendor}</td>
                    <td className="py-2 pr-3">
                      <Badge variant="outline">{inv.status}</Badge>
                    </td>
                    <td className="py-2 pr-3 text-right font-mono">{money(inv.totalEur)}</td>
                    <td className="py-2 pr-3 text-right font-mono">{inv.lineCount}</td>
                    <td className="py-2 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onSelect(inv.invoiceId)}
                        disabled={busy}
                      >
                        Open
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
