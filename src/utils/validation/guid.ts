/**
 * Matches a canonical GUID (`8-4-4-4-12` hex digits, case-insensitive). Used by services to
 * reject non-GUID keys before an OData `Key eq ...` filter hits the API.
 */
export const GUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
