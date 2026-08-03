/**
 * Internal types for instance variables — shared by process instances and case instances
 * These types are used internally and not exposed in the public API
 */

import { ElementMetaData } from './instance-variables.types';

/**
 * Raw wire format of the instance variables endpoint, before the SDK reshapes
 * the flat `globals` map into enriched `globalVariables`
 * @internal
 */
export interface RawInstanceGetVariablesResponse {
  elements: ElementMetaData[];
  globals: Record<string, unknown>;
  instanceId: string;
  workflowId: string;
  parentElementId: string | null;
}

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
