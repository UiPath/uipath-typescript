import { defineFunction } from '@uipath/coded-functions-js-sdk';
import { allProducts } from '../lib/catalogue.ts';
import type { ProductsOutput } from '../lib/contract.ts';

/** The catalogue. Prices are served from here, never sent up by the browser. */
export default defineFunction({
  name: 'list-products',
  description: 'Returns the product catalogue.',
  method: 'GET',
  path: '/products',
  input: {
    type: 'object',
    properties: {},
    required: [],
    additionalProperties: false,
  },
  handler: async (): Promise<ProductsOutput> => ({ products: allProducts() }),
});
