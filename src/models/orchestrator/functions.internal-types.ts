/**
 * Internal types for the Functions service — raw API wire formats before
 * transformation. Not exported through the public barrel.
 */

/**
 * Raw HTTP trigger row from `GET /odata/HttpTriggers` after
 * `pascalToCamelCaseKeys()`. Only the fields consumed by the service are
 * declared; the API returns many more job-runner fields that the SDK drops.
 */
export interface RawFunctionTrigger {
  /** Trigger identifier (GUID). */
  id: string;
  /** Trigger name — unique within a folder. */
  name: string;
  /** URL path segment within the package. */
  slug: string;
  /** HTTP verb, e.g. `Post`. */
  method: string;
  /** Description from the function definition. */
  description?: string | null;
  /** Whether the trigger is enabled. */
  enabled: boolean;
  /** Default input arguments as a JSON string. */
  inputArguments?: string | null;
  /** Source file path inside the package. */
  entryPointPath?: string | null;
  /** Key (GUID) of the release that owns the trigger. */
  releaseKey: string;
  /** Numeric ID of the folder the trigger lives in. */
  organizationUnitId: number;
  /** Fully qualified folder name (null on list responses). */
  organizationUnitFullyQualifiedName?: string | null;
  /** Release (process) that packages the function. */
  release: {
    id: number;
    name: string;
    slug: string;
  };
}

/**
 * Raw folder entity from `GET /odata/Folders({id})` — PascalCase wire format,
 * limited to the field the Functions service consumes.
 */
export interface RawFolderResponse {
  /** Folder key (GUID) — the `t/{key}` segment of the function invoke URL. */
  Key: string;
}
