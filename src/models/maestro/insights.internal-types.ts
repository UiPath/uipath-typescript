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
