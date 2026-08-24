import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { toast } from '@uipath/apollo-wind/components/ui/sonner';
import { Button } from '@uipath/apollo-wind/components/ui/button';
import { Card, CardContent } from '@uipath/apollo-wind/components/ui/card';
import { Spinner } from '@uipath/apollo-wind/components/ui/spinner';
import type { Product, Quote } from '../coded-functions/lib/contract';
import { createApi, errorMessage } from './api';
import { useAuth } from './auth';
import { Basket } from './components/Basket';
import { Catalogue } from './components/Catalogue';
import { CheckoutDialog } from './components/CheckoutDialog';
import { Hero } from './components/Hero';
import { ThemeToggle } from './components/ThemeToggle';

/** productId → quantity. The only shape the browser ever sends. */
export type Cart = Record<string, number>;

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

  return <Shop sdk={sdk} />;
}

function SignIn({ error, onSignIn }: { error: string | null; onSignIn: () => Promise<void> }) {
  return (
    <div className="relative grid min-h-dvh place-items-center p-6">
      <div className="hero-grid text-foreground pointer-events-none absolute inset-0" aria-hidden="true" />
      <Card className="relative w-full max-w-md">
        <CardContent className="space-y-4 p-8 text-center">
          <div className="bg-primary/10 mx-auto grid size-12 place-items-center rounded-full">
            <ShieldCheck className="text-primary size-6" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-xl font-semibold">Promo Shop</h1>
            <p className="text-muted-foreground text-sm">
              A UiPath Coded Functions sample. Sign in to continue.
            </p>
          </div>
          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : null}
          <Button className="w-full" onClick={() => void onSignIn()}>
            Sign in with UiPath
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Shop({ sdk }: { sdk: ReturnType<typeof useAuth>['sdk'] }) {
  const api = useMemo(() => createApi(sdk), [sdk]);

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | null>(null);

  const [cart, setCart] = useState<Cart>({});
  const [promoCode, setPromoCode] = useState('');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  // The catalogue is fetched once. Search and category filtering happen below,
  // in the browser: the data is already here, and a round trip per keystroke
  // would spend a job to filter six kilobytes the page is holding anyway.
  useEffect(() => {
    let cancelled = false;
    api
      .listProducts()
      .then((output) => {
        if (!cancelled) setProducts(output.products);
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(errorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [api]);

  const categories = useMemo(
    () => [...new Set(products.map((p) => p.category))],
    [products],
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (category && p.category !== category) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    });
  }, [products, search, category]);

  const items = useMemo(
    () =>
      Object.entries(cart)
        .filter(([, quantity]) => quantity > 0)
        .map(([productId, quantity]) => ({ productId, quantity })),
    [cart],
  );

  const itemCount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items],
  );

  // A request id keeps a slow response from overwriting a newer one.
  const requestId = useRef(0);
  // Only announce a code's verdict when the user actually submitted one.
  const announce = useRef(false);

  const reprice = useCallback(
    async (code: string) => {
      if (items.length === 0) {
        setQuote(null);
        setQuoteError(null);
        // Nothing was priced, so there is no verdict to announce. Leaving the
        // flag set would fire a toast on some unrelated later reprice.
        announce.current = false;
        return;
      }
      const id = ++requestId.current;
      setQuoting(true);
      setQuoteError(null);
      try {
        const result = await api.requestQuote({
          items,
          ...(code.trim() ? { promoCode: code } : {}),
        });
        // Superseded by a newer request. The flag is deliberately left set: the
        // newer request carries the same code, so it should announce instead.
        if (id !== requestId.current) return;
        setQuote(result);

        if (announce.current && result.promo) {
          announce.current = false;
          if (result.promo.applied) {
            toast.success(`${result.promo.label ?? 'Discount'} applied`, {
              description: `${result.promo.percentOff}% off, checked against the Secret asset.`,
            });
          } else {
            toast.error('Code not valid', { description: result.promo.reason });
          }
        }
      } catch (err: unknown) {
        // The failure is shown inline, so there is no verdict to toast. Clearing
        // the flag stops a later basket change announcing this dead request.
        announce.current = false;
        if (id === requestId.current) {
          setQuote(null);
          setQuoteError(errorMessage(err));
        }
      } finally {
        if (id === requestId.current) setQuoting(false);
      }
    },
    [api, items],
  );

  // Reprice whenever the basket changes; the code is applied via the form.
  useEffect(() => {
    void reprice(promoCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reprice]);

  const setQuantity = (productId: string, quantity: number) =>
    setCart((current) => ({ ...current, [productId]: Math.max(0, quantity) }));

  const applyPromo = () => {
    announce.current = true;
    void reprice(promoCode);
  };

  return (
    <div className="min-h-dvh">
      <header className="bg-background/70 sticky top-0 z-20 border-b backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 grid size-8 place-items-center rounded-md">
              <KeyRound className="text-primary size-4" />
            </div>
            <span className="font-semibold">Promo Shop</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <Hero />

      <main className="mx-auto max-w-6xl px-6 py-8">
        {loadError ? (
          <p className="text-destructive text-sm" role="alert">
            {loadError}
          </p>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1.7fr_1fr] lg:items-start">
            <Catalogue
              products={visible}
              categories={categories}
              cart={cart}
              loading={loading}
              search={search}
              category={category}
              onSearchChange={setSearch}
              onCategoryChange={setCategory}
              onChange={setQuantity}
            />
            <Basket
              quote={quote}
              itemCount={itemCount}
              busy={quoting}
              error={quoteError}
              promoCode={promoCode}
              onPromoCodeChange={setPromoCode}
              onApplyPromo={applyPromo}
              onCheckout={() => setCheckoutOpen(true)}
            />
          </div>
        )}
      </main>

      <CheckoutDialog
        quote={quote}
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        onDone={() => {
          setCheckoutOpen(false);
          setCart({});
          setPromoCode('');
          toast.success('Order placed', { description: 'Nothing is stored: this is a sample.' });
        }}
      />

      <footer className="text-muted-foreground mx-auto max-w-6xl px-6 pb-10 text-xs">
        Two coded functions:{' '}
        <code className="font-mono">list-products</code> serves the catalogue,{' '}
        <code className="font-mono">quote</code> prices the basket and checks the code against the{' '}
        <code className="font-mono">promo-codes</code> Secret asset.
      </footer>
    </div>
  );
}
