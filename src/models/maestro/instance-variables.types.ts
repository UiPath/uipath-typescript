/**
 * Instance Variables Types
 * Shared types for Maestro instance variables — used by both process instances and case instances
 */

/**
 * Instance element metadata
 */
export interface ElementMetaData {
  elementId: string;
  elementRunId: string;
  isMarker: boolean;
  inputs: Record<string, unknown>;
  inputDefinitions: Record<string, unknown>;
  outputs: Record<string, unknown>;
}

/**
 * Instance global variable metadata
 */
export interface GlobalVariableMetaData {
  id: string;
  name: string;
  /**
   * Common values: "integer", "string", "boolean"
   * May also contain custom types or "any" when type cannot be determined
   */
  type: string;
  elementId: string;
  /** Name of the BPMN node/element */
  source: string;
  value: unknown;
}

/**
 * Response for getting global variables for an instance
 */
export interface InstanceGetVariablesResponse {
  elements: ElementMetaData[];
  globalVariables: GlobalVariableMetaData[];
  instanceId: string;
  parentElementId: string | null;
}

/**
 * Options for getting global variables
 */
export interface InstanceGetVariablesOptions {
  /** Scope the variables to a specific parent element (e.g. a subprocess or stage). When omitted, root-level variables are returned. */
  parentElementId?: string;
}
