import type { FolderScopedOptions } from '../common/types';
import type { ExtractionResult } from '../document-understanding/framework/results.types';
import type { DocumentTaxonomy } from '../document-understanding/framework/taxonomy.types';

/**
 * Echoed payload returned alongside an exception-report submission.
 */
export interface ExceptionReportSubmitResult {
  /** Document identifier the exception was reported against. */
  DocumentId: string | null;
  /** Reason captured for the exception. */
  Reason: string | null;
}

/**
 * Response returned by `submitExceptionReport()`.
 */
export interface SubmitExceptionReportResponse {
  /** Echo of the submitted exception report. */
  SubmitResult?: ExceptionReportSubmitResult;
  /** Whether the submission was accepted by the server. */
  IsSuccessful: boolean;
  /** Server-supplied error message when {@link SubmitExceptionReportResponse.IsSuccessful} is `false`; empty string on success. */
  ErrorMessage: string | null;
}

/**
 * Options for `submitExceptionReport()`.
 */
export interface SubmitExceptionReportOptions extends FolderScopedOptions {}

/**
 * Request body for processing extracted document data against a taxonomy.
 *
 * Combines the automatic extraction output with any validator-supplied edits so the
 * server can compute the merged extraction result.
 */
export interface ProcessExtractedDataRequest {
  /** Extraction result produced by the automatic extractor. */
  AutomaticExtractedResults: ExtractionResult;
  /** Extraction result after human validation/edits. */
  ValidatedExtractedResults: ExtractionResult;
  /** Document taxonomy describing the schema both results conform to. */
  Taxonomy: DocumentTaxonomy;
}

/**
 * Options for `processExtractedData()`.
 */
export interface ProcessExtractedDataOptions extends FolderScopedOptions {}
