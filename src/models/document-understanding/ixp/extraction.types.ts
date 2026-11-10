/**
 * Result contracts of IXP document processors: the engine output, as it
 * travels in `ProcessedDocument.result`.
 *
 * Hand-written: the generated `framework/` contracts describe the UiPath
 * Document Understanding Framework API, a different representation.
 */

/** What a {@link IXPReference} cites. */
export enum IXPReferenceKind {
  /** A word of the document, as optical character recognition (OCR) read it. */
  Word = 'word',
  /** A region of the page that names no word. */
  Area = 'area',
}

/** A cited place on a page, in page units. */
export interface IXPReference {
  kind: IXPReferenceKind;
  /** The cited box in page units; for a `word`, the OCR word's box exactly as the digitized document has it. */
  box: [top: number, left: number, width: number, height: number];
  /** A `word`'s OCR confidence; `null` when the OCR gave none. Absent on an `area`. */
  ocrConfidence?: number | null;
}

/**
 * Where a value was read from: one entry per attachment page. A source names at
 * least one of `attachmentId` and `pageNumber`.
 */
export interface IXPAttributionSource {
  /** The attachment (document) the value was read from; `null` when the processor recorded only the page. */
  attachmentId: string | null;
  /**
   * 1-based page number; `null` when the processor recorded only the
   * attachment, as it does for a value it inferred rather than read.
   */
  pageNumber: number | null;
  /** The page width in page units; `null` when the page has no known size. */
  pageWidth: number | null;
  /** The page height in page units; `null` when the page has no known size. */
  pageHeight: number | null;
  /** The citations on this page; empty when the processor recorded only the attachment. */
  references: IXPReference[];
}

/** The provenance of one value of the output. */
export interface IXPAttribution {
  /** Confidence in the value, between 0 and 1. */
  confidence: number;
  /** Where the value was read from; empty when the value is `null`. */
  sources: IXPAttributionSource[];
}

/** The trace context of the run that produced a result. */
export interface IXPTraceContext {
  /** W3C trace id of the producing run. */
  traceId: string;
  /** The producing span. */
  spanId: string;
  /** The folder the producing run executed in. */
  folderKey: string;
}

/**
 * The result of an IXP extraction: the values plus their attribution.
 *
 * @typeParam TOutput - The shape of `output`, described by the run's {@link IXPTaxonomy}.
 */
export interface IXPExtraction<TOutput = unknown> {
  /** The values, one property per taxonomy field. */
  output: TOutput;
  /** Per-value provenance keyed by RFC 6901 JSON Pointer into `output`, e.g. `'/Net pay'`. */
  attribution: Record<string, IXPAttribution>;
  /**
   * The trace context exactly as the processor wrote it. Absent when the run
   * had no valid trace, folder or organization. In an {@link ExtractionProcessedDocument}
   * the same ids are lifted into `metadata`, which is always present; read them
   * from `metadata` there.
   */
  traceContext?: IXPTraceContext;
}

/**
 * An {@link IXPExtraction} with the reviewer's state.
 *
 * @typeParam TOutput - The shape of `output`, described by the run's {@link IXPTaxonomy}.
 */
export interface IXPReviewedExtraction<TOutput = unknown> extends IXPExtraction<TOutput> {
  /**
   * RFC 6901 JSON Pointers, in the `attribution` key space, of the values the
   * reviewer confirmed. A row's or a group's pointer confirms every value under it.
   * Meaningful on a document sent into review and on a saved draft. A submitted
   * document carries none, because submitting confirms every value.
   */
  confirmations?: string[];
}
