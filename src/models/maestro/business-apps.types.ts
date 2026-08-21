/**
 * Business App service types — request/response shapes for business app definitions.
 */

/**
 * A business app definition as returned by the API, before entity methods are attached.
 *
 * A business app is the tenant-level definition behind a workspace in Maestro: display
 * metadata plus the set of processes the workspace surfaces.
 */
export interface RawBusinessAppGetResponse {
  /** Business app GUID. */
  id: string;
  /** Display name, unique within the tenant (compared case-insensitively). */
  name: string;
  /** Human description of what the app is for, or `null` if none was set. */
  description: string | null;
  /** Icon identifier, or `null` to use the default icon. */
  icon: string | null;
  /** Hex color code including the leading `#`, or `null` to use the default color. */
  color: string | null;
  /** Orchestrator process (release) keys the app surfaces. */
  processKeys: string[];
  /** GUID of the user who created the app. */
  createdBy: string;
  /** When the app was created. */
  createdTime: string;
  /** GUID of the user who last modified the app. */
  lastModifiedBy: string;
  /** When the app was last modified. */
  lastModifiedTime: string;
}

/**
 * Optional display fields accepted when creating a business app.
 */
export interface BusinessAppCreateOptions {
  /** Human description of what the app is for. Omit, or pass blank, to store none. */
  description?: string;
  /** Icon identifier. Omit to use the default icon. */
  icon?: string;
  /** Hex color code including the leading `#`, e.g. `'#1F6FEB'`. Omit to use the default color. */
  color?: string;
}

/**
 * Optional display fields accepted when updating a business app.
 *
 * An update is a full replace, so omitting one of these clears the stored value.
 */
export interface BusinessAppUpdateOptions extends BusinessAppCreateOptions {}
