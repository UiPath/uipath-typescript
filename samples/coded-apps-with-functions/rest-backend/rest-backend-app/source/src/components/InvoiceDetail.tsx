import { Badge } from '@uipath/apollo-wind/components/ui/badge';
import { Button } from '@uipath/apollo-wind/components/ui/button';
import { Card, CardContent } from '@uipath/apollo-wind/components/ui/card';
import { Separator } from '@uipath/apollo-wind/components/ui/separator';
import { XCircle } from 'lucide-react';
import type { Invoice, InvoiceLineReadOutput } from '../api';
import { Route } from './Route';

const money = (n: number) => n.toLocaleString(undefined, { style: 'currency', currency: 'EUR' });

/**
 * The item route and the sub-resource route, one above the other.
 *
 * Opening a line calls a second function rather than reading the line out of the
 * invoice already on screen. That is the point being demonstrated: the line is
 * separately addressable, so it has its own URL — and a real client could link
 * to it, cache it or refetch it without the parent.
 */
export function InvoiceDetail({
  invoice,
  line,
  error,
  onLine,
  onClearLine,
}: {
  invoice: Invoice;
  line: InvoiceLineReadOutput | null;
  error: string | null;
  onLine: (lineNo: number) => void;
  onClearLine: () => void;
}) {
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-4 p-4">
          <Route method="GET" path={`/invoices/${invoice.invoiceId}`} />

          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="font-mono text-lg font-semibold">{invoice.invoiceId}</h2>
            <span className="text-sm text-muted-foreground">{invoice.vendor}</span>
            <Badge variant="outline">{invoice.status}</Badge>
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-muted-foreground">Issued</dt>
              <dd className="font-mono">{invoice.issuedAt}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Due</dt>
              <dd className="font-mono">{invoice.dueAt}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">PO</dt>
              <dd className="font-mono">{invoice.poReference}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Total</dt>
              <dd className="font-mono">{money(invoice.totalEur)}</dd>
            </div>
          </dl>

          <Separator />

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-3 font-medium">#</th>
                <th className="py-2 pr-3 font-medium">SKU</th>
                <th className="py-2 pr-3 font-medium">Description</th>
                <th className="py-2 pr-3 text-right font-medium">Qty</th>
                <th className="py-2 pr-3 text-right font-medium">Unit</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {invoice.lines.map((l) => (
                <tr key={l.lineNo} className="border-b">
                  <td className="py-2 pr-3 font-mono">{l.lineNo}</td>
                  <td className="py-2 pr-3 font-mono">{l.sku}</td>
                  <td className="py-2 pr-3">{l.description}</td>
                  <td className="py-2 pr-3 text-right font-mono">{l.quantity}</td>
                  <td className="py-2 pr-3 text-right font-mono">{money(l.unitPriceEur)}</td>
                  <td className="py-2 text-right">
                    <Button size="sm" variant="ghost" onClick={() => onLine(l.lineNo)}>
                      Open line
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {error ? (
        <Card className="border-destructive/40">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 font-medium">
              <XCircle className="size-4 text-destructive" />
              The function returned an error
            </div>
            {/* The function's own FunctionError text, verbatim — a 404 here names
                the line numbers that would have worked, and paraphrasing it
                would throw that away. */}
            <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      ) : null}

      {line ? (
        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-3">
              <Route
                method="GET"
                path={`/invoices/${line.invoiceId}/lines/${line.lineNo}`}
              />
              <Button size="sm" variant="ghost" onClick={onClearLine}>
                Close
              </Button>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">SKU</dt>
              <dd className="font-mono">{line.sku}</dd>
              <dt className="text-muted-foreground">Description</dt>
              <dd>{line.description}</dd>
              <dt className="text-muted-foreground">Quantity</dt>
              <dd className="font-mono">{line.quantity}</dd>
              <dt className="text-muted-foreground">Unit price</dt>
              <dd className="font-mono">{money(line.unitPriceEur)}</dd>
              <dt className="text-muted-foreground">Line total</dt>
              <dd className="font-mono">{money(line.lineTotalEur)}</dd>
            </dl>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
