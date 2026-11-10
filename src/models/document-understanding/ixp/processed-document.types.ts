/**
 * The `ProcessedDocument` envelope: the single output every IXP
 * processor node emits and the validation nodes accept.
 */

import type { IXPReviewedExtraction } from './extraction.types';
import type { IXPTaxonomy } from './taxonomy.types';

/** The processor kind that produced a processed document; fixes the shape of its `result` and `taxonomy`. */
export enum ProcessedDocumentType {
  Extraction = 'Extraction',
}

/**
 * The processor configuration a run used. It grows with the processor, so
 * unlisted keys are allowed.
 *
 * Because unlisted keys are allowed, a misspelt known key (e.g.
 * `atributionStrategy`) is not a type error: it is read as an unlisted key.
 */
export interface ProcessedDocumentModelConfig {
  /** The overall instructions the author wrote; `null` when there are none. */
  prompt?: string | null;
  /** The configured language support, e.g. `'auto'`; not the language detected in the document. */
  languageSupport?: string | null;
  /** The configured layout parsing, e.g. `'uipath-figure-to-text'`. */
  layoutParsing?: string | null;
  /** The configured layout engine; `null` when the processor runs on the default. */
  layoutEngine?: string | null;
  /** The configured layout model; `null` when the processor runs on the default. */
  layoutModel?: string | null;
  /** Engine-level overrides, as a serialized JSON string. */
  overrides?: string | null;
  /** The model the run was configured with; `null` when the processor runs on the default. */
  modelOverride?: string | null;
  [key: string]: unknown;
}

/** The configuration of an extraction run. */
export interface ExtractionProcessedDocumentModelConfig extends ProcessedDocumentModelConfig {
  /** The configured extraction strategy, e.g. `'ZeroShot'`. */
  extractionStrategy?: string;
  /** The configured attribution strategy, e.g. `'WordId'`; decides what the attribution can carry. */
  attributionStrategy?: string;
  /** The model attribution was configured with; `null` when it runs on the default. */
  attributionModelOverride?: string | null;
}

/**
 * Identifiers of the run and the document, for calling back into the platform.
 * The authoritative source of the trace ids: the processor fails the run rather
 * than emit a document without them.
 *
 * @typeParam TModelConfig - The configuration type of the producing processor kind.
 */
export interface ProcessedDocumentMetadata<TModelConfig extends ProcessedDocumentModelConfig = ProcessedDocumentModelConfig> {
  /** GUID of the pipeline run that produced the document. */
  pipelineRunId: string;
  /** The folder the producing run executed in. */
  folderKey: string;
  /** W3C trace id of the producing run; the key to its spans and artifacts in the Traces service. */
  traceId: string;
  /** The producing span; the anchor for feedback. */
  spanId: string;
  /** The processor's configuration; `{}` when it could not be read. */
  modelConfig: TModelConfig;
}

/**
 * The processed document an IXP extraction processor emits: the extracted
 * values with their attribution, the taxonomy they were extracted against,
 * and the identifiers of the run.
 *
 * @typeParam TOutput - The shape of `result.output`, described by `taxonomy`;
 *   leave it `unknown` when the taxonomy is not known at compile time.
 *
 * @example
 * ```typescript
 * import type { ExtractionProcessedDocument } from '@uipath/uipath-typescript/document-understanding';
 *
 * interface Payslip { 'Net pay': string | null }
 *
 * function read(doc: ExtractionProcessedDocument<Payslip>) {
 *   console.log(doc.result.output['Net pay'], doc.result.attribution['/Net pay']);
 * }
 * ```
 */
export interface ExtractionProcessedDocument<TOutput = unknown> {
  /** The contract version. */
  version: string;
  type: ProcessedDocumentType.Extraction;
  result: IXPReviewedExtraction<TOutput>;
  taxonomy: IXPTaxonomy;
  metadata: ProcessedDocumentMetadata<ExtractionProcessedDocumentModelConfig>;
}
