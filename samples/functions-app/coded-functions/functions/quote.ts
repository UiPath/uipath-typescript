import { defineFunction, FunctionError, logger } from '@uipath/coded-functions-js-sdk';
import { findProduct } from '../lib/catalogue.ts';
import { PROMO_CODES_ASSET } from '../lib/contract.ts';
import type { PromoOutcome, Quote, QuoteLine } from '../lib/contract.ts';
import { readSecretAsset, robotConnection } from '../lib/orchestrator.ts';
import { matchPromo, money, parsePromoCodes } from '../lib/promo.ts';

/**
 * Prices a basket, and checks a promo code when one is supplied.
 *
 * The code check is why this sample needs a function. Valid codes live in a
 * Secret asset the browser cannot read, so validating in the page would mean
 * shipping the list to the page.
 */
export default defineFunction({
  name: 'quote',
  description: 'Prices a basket and validates an optional promo code.',
  method: 'POST',
  path: '/quote',
  input: {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        minItems: 1,
        maxItems: 50,
        items: {
          type: 'object',
          properties: {
            productId: { type: 'string', minLength: 1 },
            quantity: { type: 'integer', minimum: 1, maximum: 99 },
          },
          required: ['productId', 'quantity'],
          additionalProperties: false,
        },
      },
      promoCode: { type: 'string', maxLength: 40 },
    },
    required: ['items'],
    additionalProperties: false,
  },
  handler: async (input, ctx): Promise<Quote> => {
    let currency = 'USD';

    const lines: QuoteLine[] = input.items.map((item) => {
      const product = findProduct(item.productId);
      if (!product) {
        throw new FunctionError(`Unknown product '${item.productId}'.`, 404, 'UNKNOWN_PRODUCT');
      }
      currency = product.currency;
      return {
        productId: product.id,
        sku: product.sku,
        name: product.name,
        unitPrice: product.unitPrice,
        quantity: item.quantity,
        lineTotal: money(product.unitPrice * item.quantity),
      };
    });

    const subtotal = money(lines.reduce((sum, line) => sum + line.lineTotal, 0));

    let promo: PromoOutcome | null = null;
    let discount = 0;

    if (input.promoCode?.trim()) {
      const conn = robotConnection(ctx);
      const definitions = parsePromoCodes(await readSecretAsset(conn, PROMO_CODES_ASSET));
      promo = matchPromo(input.promoCode, definitions);

      if (promo.applied && promo.percentOff) {
        discount = money((subtotal * promo.percentOff) / 100);
      }
      // Log the verdict, never the code list.
      logger.info(`quote: promo '${promo.code}' applied=${promo.applied}`);
    }

    return { lines, subtotal, discount, total: money(subtotal - discount), currency, promo };
  },
});
