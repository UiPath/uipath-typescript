import { CheckCircle2, Tag } from 'lucide-react';
import { Badge } from '@uipath/apollo-wind/components/ui/badge';
import { Button } from '@uipath/apollo-wind/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@uipath/apollo-wind/components/ui/dialog';
import { Separator } from '@uipath/apollo-wind/components/ui/separator';
import type { Quote } from '../../coded-functions/lib/contract';
import { formatMoney } from '../format';

interface CheckoutDialogProps {
  quote: Quote | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}

/**
 * Confirmation step. Nothing is persisted: the sample is about where the code
 * check happens, not about order storage, so this just reflects the priced
 * quote back and clears the basket.
 */
export function CheckoutDialog({ quote, open, onOpenChange, onDone }: CheckoutDialogProps) {
  if (!quote) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" />
            Order summary
          </DialogTitle>
          <DialogDescription>
            Every figure here was calculated by the <code className="font-mono text-xs">quote</code>{' '}
            function.
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-2 text-sm">
          {quote.lines.map((line) => (
            <li key={line.productId} className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate">
                {line.name}
                <span className="text-muted-foreground"> x {line.quantity}</span>
              </span>
              <span className="tabular-nums">{formatMoney(line.lineTotal, quote.currency)}</span>
            </li>
          ))}
        </ul>

        <Separator />

        <dl className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd className="tabular-nums">{formatMoney(quote.subtotal, quote.currency)}</dd>
          </div>

          {quote.discount > 0 && quote.promo?.applied ? (
            <div className="flex items-center justify-between gap-3 text-emerald-600 dark:text-emerald-400">
              <dt className="flex items-center gap-1.5">
                <Tag className="size-3.5" />
                {quote.promo.label ?? 'Discount'}
                <Badge variant="secondary">{quote.promo.percentOff}% off</Badge>
              </dt>
              <dd className="tabular-nums">
                &minus;{formatMoney(quote.discount, quote.currency)}
              </dd>
            </div>
          ) : null}

          <Separator className="my-2" />

          <div className="flex items-baseline justify-between text-base font-semibold">
            <dt>Total</dt>
            <dd className="tabular-nums">{formatMoney(quote.total, quote.currency)}</dd>
          </div>
        </dl>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Keep shopping</Button>
          </DialogClose>
          <Button onClick={onDone}>Place order</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
