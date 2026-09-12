import type { UiPath } from '@uipath/uipath-typescript/core';
import { Functions } from '@uipath/uipath-typescript/functions';
import {
  FUNCTION_NAMES,
  qualifiedName,
  type Invoice,
  type InvoiceLineReadInput,
  type InvoiceLineReadOutput,
  type InvoiceListInput,
  type InvoiceListOutput,
  type InvoiceReadInput,
  type InvoiceStatus,
} from '../../../rest-backend-functions/lib/contract';

/**
 * One wrapper per route, typed from the shared contract in
 * `rest-backend-functions/lib/contract.ts`.
 *
 * Importing the contract rather than re-declaring the shapes is what makes a
 * mismatch a compile error instead of a runtime 400 — the app and the functions
 * ship as one solution, so they should fail to build together, not fail apart.
 */

/**
 * Numeric id of the folder the solution deployed into. Locally, copy
 * `.env.example` to `.env` and set it; the deployed app does not need it,
 * because the platform injects the folder as a meta tag and the SDK reads it.
 */
const FOLDER_ID = Number(import.meta.env.VITE_UIPATH_FOLDER_ID);

const folderOption =
  Number.isFinite(FOLDER_ID) && FOLDER_ID > 0 ? { folderId: FOLDER_ID } : undefined;

/* Re-exported so UI files import types from here rather than deep-linking the
   contract across the project boundary — one path to get wrong, not five. */
export type { Invoice, InvoiceLineReadOutput, InvoiceListOutput, InvoiceStatus };

/**
 * A function's own `FunctionError` text arrives on the thrown SDK error, and it
 * is the useful part: these routes answer a 404 by naming the ids or line
 * numbers that would have worked. Replacing that with something generic would
 * throw away the half of the response worth reading.
 */
export function errorMessage(e: unknown): string {
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message);
  return String(e);
}

export function createApi(sdk: UiPath) {
  const functions = new Functions(sdk);

  const invoke = async <TIn extends object, TOut>(fn: keyof typeof FUNCTION_NAMES, input: TIn) =>
    (await functions.invoke(
      { name: qualifiedName(FUNCTION_NAMES[fn]) },
      input as Record<string, unknown>,
      folderOption,
    )) as TOut;

  return {
    /** `GET /invoices` — the collection, optionally filtered. */
    listInvoices: (input: InvoiceListInput = {}) =>
      invoke<InvoiceListInput, InvoiceListOutput>('invoiceList', input),

    /** `GET /invoices/:invoiceId` — one resource. */
    readInvoice: (input: InvoiceReadInput) => invoke<InvoiceReadInput, Invoice>('invoiceRead', input),

    /** `GET /invoices/:invoiceId/lines/:lineNo` — a nested sub-resource. */
    readInvoiceLine: (input: InvoiceLineReadInput) =>
      invoke<InvoiceLineReadInput, InvoiceLineReadOutput>('invoiceLineRead', input),
  };
}

export type Api = ReturnType<typeof createApi>;
