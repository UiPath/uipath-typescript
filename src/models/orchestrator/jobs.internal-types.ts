/**
 * Internal types for the Jobs service.
 * These types are not exported through the public API.
 */

/**
 * Raw job output fields from the API response (PascalCase).
 * Used internally by fetchJobByKey to select only the fields needed for output extraction.
 */
export interface RawJobOutputFields {
  OutputArguments: string | null;
  OutputFile: string | null;
}
