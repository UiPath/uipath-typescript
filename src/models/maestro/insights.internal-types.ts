import { DurationStats } from './insights.types';

/**
 * Raw API response for TopElementswithFailure endpoint.
 * The SDK renames `count` to `failedCount` in the public response type.
 */
export interface RawElementGetTopFailedCountResponse {
  /** BPMN element name (falls back to element ID if name is empty) */
  elementName: string;
  /** BPMN element type (e.g. ServiceTask, ReceiveTask, IntermediateCatchEvent) */
  elementType: string;
  /** The unique process key this element belongs to */
  processKey: string;
  /** Number of failed executions */
  count: number;
}

/**
 * Raw API response for InstanceCountByStatus endpoint.
 * The SDK renames `countOf*` fields to `*Count` for consistency with ElementStats.
 */
export interface RawInstanceStats extends DurationStats {
  countOfAllInstances: number;
  countOfRunning: number;
  countOfTransitioning: number;
  countOfPaused: number;
  countOfFaulted: number;
  countOfCompleted: number;
  countOfCancelled: number;
  countOfDeleted: number;
}
