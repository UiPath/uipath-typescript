import { Armchair, Cable, Keyboard, Lamp, Monitor, Package, Table2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * Presentation-only decoration for a product.
 *
 * Keyed off the SKU prefix rather than a field on the product, deliberately:
 * icons and gradients are a property of this UI, not of the catalogue the
 * function serves. Adding them to the contract would push styling decisions
 * across the boundary.
 */
interface ProductVisual {
  Icon: LucideIcon;
  /** Tailwind gradient stops for the icon tile. */
  tile: string;
}

const BY_PREFIX: Record<string, ProductVisual> = {
  DESK: { Icon: Table2, tile: 'from-amber-500/20 to-orange-500/10 text-amber-600 dark:text-amber-400' },
  CHAIR: { Icon: Armchair, tile: 'from-sky-500/20 to-blue-500/10 text-sky-600 dark:text-sky-400' },
  MON: { Icon: Monitor, tile: 'from-violet-500/20 to-purple-500/10 text-violet-600 dark:text-violet-400' },
  KEY: { Icon: Keyboard, tile: 'from-emerald-500/20 to-teal-500/10 text-emerald-600 dark:text-emerald-400' },
  LAMP: { Icon: Lamp, tile: 'from-yellow-500/20 to-amber-500/10 text-yellow-600 dark:text-yellow-500' },
  DOCK: { Icon: Cable, tile: 'from-rose-500/20 to-pink-500/10 text-rose-600 dark:text-rose-400' },
};

const FALLBACK: ProductVisual = {
  Icon: Package,
  tile: 'from-slate-500/20 to-slate-400/10 text-slate-600 dark:text-slate-400',
};

export function productVisual(sku: string): ProductVisual {
  const prefix = sku.split('-')[0]?.toUpperCase() ?? '';
  return BY_PREFIX[prefix] ?? FALLBACK;
}
