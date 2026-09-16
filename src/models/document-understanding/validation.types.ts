/**
 * Options for the Document Understanding validation-station methods.
 *
 * Declared here rather than in `framework/validation.types.ts` because that file
 * is generated from the OpenAPI spec and must not be edited manually.
 */
export interface DuValidationRequestOptions {
  /** DU framework API version sent as the `api-version` query param. Defaults to `'1.1'`. */
  apiVersion?: string;
}
