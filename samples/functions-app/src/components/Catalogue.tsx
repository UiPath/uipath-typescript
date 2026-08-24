import { Minus, Plus, Search } from 'lucide-react';
import { Badge } from '@uipath/apollo-wind/components/ui/badge';
import { Button } from '@uipath/apollo-wind/components/ui/button';
import { Card, CardContent } from '@uipath/apollo-wind/components/ui/card';
import { EmptyState } from '@uipath/apollo-wind/components/ui/empty-state';
import { Input } from '@uipath/apollo-wind/components/ui/input';
import { Skeleton } from '@uipath/apollo-wind/components/ui/skeleton';
import type { Product } from '../../coded-functions/lib/contract';
import type { Cart } from '../App';
import { formatMoney } from '../format';
import { productVisual } from '../product-visual';

interface CatalogueProps {
  products: Product[];
  categories: string[];
  cart: Cart;
  loading: boolean;
  search: string;
  category: string | null;
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: string | null) => void;
  onChange: (productId: string, quantity: number) => void;
}

export function Catalogue({
  products,
  categories,
  cart,
  loading,
  search,
  category,
  onSearchChange,
  onCategoryChange,
  onChange,
}: CatalogueProps) {
  const filtered = search.trim() !== '' || category !== null;

  return (
    <section aria-label="Catalogue" className="space-y-5">
      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Catalogue</h2>
            <p className="text-muted-foreground text-sm">
              Served and priced by the{' '}
              <code className="font-mono text-xs">list-products</code> function. Filtering
              happens here in the page.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search products…"
              aria-label="Search products"
              className="pl-9"
            />
          </div>
        </div>

        {/* Local filtering: the catalogue is already loaded. */}
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by category">
          <Button
            variant={category === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => onCategoryChange(null)}
          >
            All
          </Button>
          {categories.map((name) => (
            <Button
              key={name}
              variant={category === name ? 'default' : 'outline'}
              size="sm"
              onClick={() => onCategoryChange(name)}
            >
              {name}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Card key={i}>
              <CardContent className="space-y-3 p-4">
                <Skeleton className="size-11 rounded-lg" />
                <Skeleton className="h-4 w-3/5" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-9 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : products.length === 0 ? (
        <EmptyState
          icon={<Search className="text-muted-foreground size-8" />}
          title="Nothing matches that"
          description="Try a different word, or clear the filters."
          action={
            filtered
              ? {
                  label: 'Clear filters',
                  onClick: () => {
                    onSearchChange('');
                    onCategoryChange(null);
                  },
                }
              : undefined
          }
        />
      ) : (
        <>
          <p className="text-muted-foreground text-xs">
            {products.length} product{products.length === 1 ? '' : 's'}
            {category ? ` in ${category}` : ''}
          </p>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {products.map((product, i) => {
              const quantity = cart[product.id] ?? 0;
              const inCart = quantity > 0;
              const { Icon, tile } = productVisual(product.sku);

              return (
                <Card
                  key={product.id}
                  className={`card-in group relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${
                    inCart ? 'border-primary/60 shadow-primary/5 shadow-sm' : ''
                  }`}
                  style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}
                >
                  {inCart ? (
                    <Badge className="absolute top-3 right-3 z-10 tabular-nums">{quantity}</Badge>
                  ) : null}

                  <CardContent className="flex h-full flex-col gap-3 p-4">
                    <div className="flex items-start gap-3">
                      <div
                        className={`grid size-11 shrink-0 place-items-center rounded-lg bg-gradient-to-br ${tile} transition-transform duration-200 group-hover:scale-105`}
                      >
                        <Icon className="size-5" />
                      </div>
                      <div className="min-w-0 pt-0.5">
                        <p className="leading-tight font-medium text-balance">{product.name}</p>
                        <p className="text-muted-foreground mt-0.5 font-mono text-[11px]">
                          {product.sku}
                        </p>
                      </div>
                    </div>

                    <p className="text-muted-foreground text-xs leading-relaxed">
                      {product.description}
                    </p>

                    <div className="mt-auto space-y-3 pt-1">
                      <p className="text-xl font-semibold tabular-nums">
                        {formatMoney(product.unitPrice, product.currency)}
                      </p>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          aria-label={`Remove one ${product.name}`}
                          disabled={!inCart}
                          onClick={() => onChange(product.id, quantity - 1)}
                        >
                          <Minus className="size-4" />
                        </Button>
                        <span
                          className="min-w-8 text-center text-sm tabular-nums"
                          aria-live="polite"
                          aria-label={`${product.name} quantity`}
                        >
                          {quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          aria-label={`Add one ${product.name}`}
                          onClick={() => onChange(product.id, quantity + 1)}
                        >
                          <Plus className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
