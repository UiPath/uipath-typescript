import {
  IXPFieldGroupType,
  type IXPFieldGroupRecord,
  type IXPTaxonomy,
  type IXPTaxonomyField,
  type IXPTaxonomyNode,
} from '@/models/document-understanding';

export const field = (id: string): IXPTaxonomyField => ({ $ref: '#/$defs/Text', 'x-uipath-field-id': id });

const record = (properties: Record<string, IXPTaxonomyNode>): IXPFieldGroupRecord => ({
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});

const $defs = { Text: { type: ['string', 'null'] } };

/** Groups nested in their parent, to three levels: Invoice rows → Items rows → Tax object. */
export const nestedTaxonomy = {
  type: 'object',
  properties: {
    Invoice: {
      type: IXPFieldGroupType.Array,
      'x-uipath-field-group-id': 'invoice',
      items: {
        type: 'object',
        ...record({
          Number: field('number'),
          Items: {
            type: IXPFieldGroupType.Array,
            'x-uipath-field-group-id': 'items',
            items: {
              type: 'object',
              ...record({
                Quantity: field('quantity'),
                Tax: {
                  type: IXPFieldGroupType.Object,
                  'x-uipath-field-group-id': 'tax',
                  ...record({ Rate: field('rate') }),
                },
              }),
            },
          },
          Vendor: {
            type: IXPFieldGroupType.Object,
            'x-uipath-field-group-id': 'vendor',
            ...record({ Name: field('vendor-name') }),
          },
        }),
      },
    },
  },
  required: ['Invoice'],
  additionalProperties: false,
  $defs,
} satisfies IXPTaxonomy;

/** The same nesting as producers write it today: children flattened next to their parent. */
export const flatTaxonomy = {
  type: 'object',
  properties: {
    Invoice: {
      type: IXPFieldGroupType.Array,
      'x-uipath-field-group-id': 'invoice',
      items: { type: 'object', ...record({ Number: field('number') }) },
    },
    'Invoice > Items': {
      type: IXPFieldGroupType.Array,
      'x-uipath-field-group-id': 'items',
      'x-uipath-parent-field-group-id': 'invoice',
      items: { type: 'object', ...record({ Quantity: field('quantity') }) },
    },
  },
  required: ['Invoice', 'Invoice > Items'],
  additionalProperties: false,
  $defs,
} satisfies IXPTaxonomy;
