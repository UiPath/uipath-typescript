import type { Product } from './contract.ts';

/**
 * The catalogue. Prices live here, on the server, and the browser only ever
 * sends product ids and quantities back.
 */
const PRODUCTS: readonly Product[] = [
  {
    id: 'p-1001', sku: 'DESK-01', name: 'Standing desk',
    description: 'Height-adjustable, 140×70cm, four memory presets.',
    category: 'Desks', unitPrice: 749, currency: 'USD',
  },
  {
    id: 'p-1002', sku: 'DESK-02', name: 'Compact writing desk',
    description: 'Solid oak, 110×55cm, cable channel along the rear edge.',
    category: 'Desks', unitPrice: 389, currency: 'USD',
  },
  {
    id: 'p-1003', sku: 'CHAIR-01', name: 'Ergonomic task chair',
    description: 'Mesh back, adjustable lumbar, 4D armrests.',
    category: 'Seating', unitPrice: 429.5, currency: 'USD',
  },
  {
    id: 'p-1004', sku: 'CHAIR-02', name: 'Draughtsman stool',
    description: 'Height range for standing desks, with a footring.',
    category: 'Seating', unitPrice: 219, currency: 'USD',
  },
  {
    id: 'p-1005', sku: 'MON-01', name: '27" 4K monitor',
    description: 'USB-C at 90W, height adjustable, factory calibrated.',
    category: 'Displays', unitPrice: 519.99, currency: 'USD',
  },
  {
    id: 'p-1006', sku: 'MON-02', name: '34" ultrawide',
    description: '3440×1440, 120Hz, built-in KVM switch.',
    category: 'Displays', unitPrice: 899, currency: 'USD',
  },
  {
    id: 'p-1007', sku: 'KEY-01', name: 'Mechanical keyboard',
    description: 'Tenkeyless, hot-swappable, tactile switches.',
    category: 'Peripherals', unitPrice: 89.9, currency: 'USD',
  },
  {
    id: 'p-1008', sku: 'KEY-02', name: 'Vertical mouse',
    description: 'Wireless, reduced wrist pronation, six buttons.',
    category: 'Peripherals', unitPrice: 54.25, currency: 'USD',
  },
  {
    id: 'p-1009', sku: 'DOCK-01', name: 'USB-C dock',
    description: '11 ports, 100W passthrough, dual 4K output.',
    category: 'Peripherals', unitPrice: 179, currency: 'USD',
  },
  {
    id: 'p-1010', sku: 'LAMP-01', name: 'Desk lamp',
    description: 'Dimmable 2700–6500K, 90+ CRI, clamp mount.',
    category: 'Lighting', unitPrice: 42, currency: 'USD',
  },
  {
    id: 'p-1011', sku: 'LAMP-02', name: 'Monitor light bar',
    description: 'Asymmetric beam, no screen glare, touch dimmer.',
    category: 'Lighting', unitPrice: 68.5, currency: 'USD',
  },
  {
    id: 'p-1012', sku: 'ACC-01', name: 'Acoustic desk divider',
    description: 'Recycled felt, 60×40cm, clamps to any desk edge.',
    category: 'Accessories', unitPrice: 96, currency: 'USD',
  },
];

/** The whole catalogue. Filtering is a presentation concern, done in the UI. */
export function allProducts(): Product[] {
  return [...PRODUCTS];
}

export function findProduct(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id);
}
