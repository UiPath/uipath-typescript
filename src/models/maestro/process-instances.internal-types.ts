/**
 * Internal types for process instances service
 * These types are used internally and not exposed in the public API
 */

/**
 * Interface for BPMN variable metadata extracted from BPMN XML
 * @internal
 */
export interface BpmnVariableMetadata {
  id: string;
  name: string;
  type: string;
  elementId: string;
  source: string;
}