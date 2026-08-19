import { AlertCircle, Lock, Receipt, ShoppingBag, Tag, TrendingDown } from 'lucide-react';
import { Badge } from '@uipath/apollo-wind/components/ui/badge';
import { Button } from '@uipath/apollo-wind/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@uipath/apollo-wind/components/ui/card';
import { EmptyState } from '@uipath/apollo-wind/components/ui/empty-state';
import { Input } from '@uipath/apollo-wind/components/ui/input';
import { Separator } from '@uipath/apollo-wind/components/ui/separator';
import { Skeleton } from '@uipath/apollo-wind/components/ui/skeleton';
import { Spinner } from '@uipath/apollo-wind/components/ui/spinner';
import type { Quote } from '../../coded-functions/lib/contract';
import { formatMoney } from '../format';

interface BasketProps {
  quote: Quote | null;
  itemCount: number;
  busy: boolean;
  error: string | null;
  promoCode: string;
  onPromoCodeChange: (value: string) => void;
  onApplyPromo: () => void;
  onCheckout: () => void;
}

export function Basket({
  quote,
  itemCount,
  busy,
  error,
  promoCode,
  onPromoCodeChange,
  onApplyPromo,
  onCheckout,
}: BasketProps) {
  const isEmpty = itemCount === 0;
  const rejected = quote?.promo && !quote.promo.applied ? quote.promo : null;
  const saved = quote?.discount ?? 0;

  return (
    <div className="space-y-4 lg:sticky lg:top-20">
      {/* Two figures worth seeing without opening the basket. */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <ShoppingBag className="size-3.5" />
              Items
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{itemCount}</p>
          </CardContent>
        </Card>

        <Card className={saved > 0 ? 'border-emerald-500/40' : undefined}>
          <CardContent className="p-4">
            <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <TrendingDown className="size-3.5" />
              You save
            </p>
            <p
              key={saved}
              className={`mt-1 text-2xl font-semibold tabular-nums ${
                saved > 0 ? 'flash-value text-emerald-600 dark:text-emerald-400' : ''
              }`}
            >
              {quote ? formatMoney(saved, quote.currency) : '-'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="size-4" />
            Your basket
          </CardTitle>
          <CardDescription>
            Priced by the <code className="font-mono text-xs">quote</code> function. The browser
            sends product ids and quantities only.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {isEmpty ? (
            <EmptyState
              icon={<ShoppingBag className="text-muted-foreground size-8" />}
              title="Nothing here yet"
              description="Add something from the catalogue to see it priced."
            />
          ) : (
            <div aria-live="polite" aria-busy={busy}>
              {error ? (
                <p className="text-destructive flex items-start gap-2 text-sm" role="alert">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  {error}
                </p>
              ) : !quote ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="h-6 w-1/2" />
                </div>
              ) : (
                <>
                  <ul className="space-y-2 text-sm">
                    {quote.lines.map((line) => (
                      <li
                        key={line.productId}
                        className="flex items-baseline justify-between gap-3"
                      >
                        <span className="min-w-0 truncate">
                          {line.name}
                          <span className="text-muted-foreground"> × {line.quantity}</span>
                        </span>
                        <span className="tabular-nums">
                          {formatMoney(line.lineTotal, quote.currency)}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <Separator className="my-3" />

                  <dl className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Subtotal</dt>
                      <dd className="tabular-nums">
                        {formatMoney(quote.subtotal, quote.currency)}
                      </dd>
                    </div>

                    {saved > 0 && quote.promo?.applied ? (
                      <div className="rise-in flex items-start justify-between gap-3 text-emerald-600 dark:text-emerald-400">
                        <dt className="flex min-w-0 flex-wrap items-center gap-1.5">
                          <Tag className="size-3.5 shrink-0" />
                          <span className="truncate">{quote.promo.label ?? 'Discount'}</span>
                          <Badge variant="secondary" className="shrink-0">
                            {quote.promo.percentOff}% off
                          </Badge>
                        </dt>
                        <dd className="tabular-nums">
                          −{formatMoney(saved, quote.currency)}
                        </dd>
                      </div>
                    ) : null}

                    <Separator className="my-2" />

                    <div className="flex items-baseline justify-between text-base font-semibold">
                      <dt>Total</dt>
                      <dd key={quote.total} className="flash-value tabular-nums">
                        {formatMoney(quote.total, quote.currency)}
                      </dd>
                    </div>
                  </dl>

                  <Button className="mt-4 w-full" disabled={busy} onClick={onCheckout}>
                    Checkout
                  </Button>
                </>
              )}
            </div>
          )}

          <Separator />

          <form
            className="space-y-2"
            onSubmit={(event) => {
              event.preventDefault();
              onApplyPromo();
            }}
          >
            <label htmlFor="promo-code" className="flex items-center gap-1.5 text-sm font-medium">
              <Lock className="text-muted-foreground size-3.5" />
              Discount code
            </label>

            <div className="flex gap-2">
              <Input
                id="promo-code"
                value={promoCode}
                placeholder="Enter a code"
                autoComplete="off"
                spellCheck={false}
                aria-invalid={rejected ? true : undefined}
                onChange={(event) => onPromoCodeChange(event.target.value)}
              />
              <Button type="submit" disabled={busy || isEmpty}>
                {busy ? <Spinner className="size-4" /> : 'Apply'}
              </Button>
            </div>

            {rejected ? (
              <p className="text-destructive text-sm" role="status">
                {rejected.reason}
              </p>
            ) : (
              <p className="text-muted-foreground text-xs">
                Checked inside the function against a Secret asset. The list of valid codes never
                reaches this page.
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
