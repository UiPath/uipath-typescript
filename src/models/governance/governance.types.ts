/**
 * Governance Service Types
 *
 * Public types exposed via `@uipath/uipath-typescript/governance`.
 */

import { PaginationOptions } from '../../utils/pagination/types';

export enum PolicyEvaluationResult {
  /** Active policy permitted the action. */
  Allow = 'Allow',
  /** Active policy blocked the action. */
  Deny = 'Deny',
  /** Simulated (NoOp) policy would have permitted the action. */
  SimulatedAllow = 'SimulatedAllow',
  /** Simulated (NoOp) policy would have blocked the action. */
  SimulatedDeny = 'SimulatedDeny',
}

/**
 * Each trace row represents one policy's verdict within a governance
 * enforcement event. One enforcement event can produce multiple trace rows
 * when multiple policies contributed to the final verdict.
 */
export interface PolicyTrace {
  /** Tenant the trace was recorded in. Present even when `fullOrganization` is `true`. */
  tenantId?: string;
  /** The start time of governance enforcement event. */
  startTime: string;
  /** Final enforcement verdict for the parent governance event. */
  finalEnforcement?: string;
  /** ID of the policy this trace row evaluates. */
  policyId?: string;
  /** This individual policy's enforcement contribution to the parent verdict. */
  policyEnforcement?: string;
  /** The outcome of one policy evaluation — whether it allowed or denied the action, and whether that decision was actively enforced or just simulated (NoOp). */
  policyEvaluationResult?: PolicyEvaluationResult;
  /** Display name of the policy. */
  policyName?: string;
  /** Enforcement mode of the policy at the time of evaluation. */
  policyStatus?: string;
  /** Opaque details payload describing the evaluation result. */
  policyEvaluationDetails?: string;
  /** Process or executable that triggered the evaluation. */
  actorProcessId?: string;
  /** Type of the actor process (e.g. coded agent, RPA process). */
  actorProcessType?: string;
  /** Identity (user/principal) that triggered the evaluation. */
  actorIdentityId?: string;
  /** Resource being acted on. */
  resourceId?: string;
  /** Type of the resource being acted on. */
  resourceType?: string;
  /** Orchestrator folder key associated with the evaluation, if any. */
  folderKey?: string;
  /** Distributed-tracing ID covering the governance enforcement event. */
  traceId?: string;
  /** Process key associated with the evaluation, if any. */
  processKey?: string;
  /** Job key associated with the evaluation, if any. */
  jobKey?: string;
}

/**
 * Common filter options shared across Governance APIs.
 *
 * Holds filters that are not specific to any single governance resource, so
 * other governance endpoints can reuse them.
 */
export interface GovernanceFilterOptions {
  /**
   * Inclusive upper bound on trace start time. When omitted, the upper bound
   * is open. 
   */
  endTime?: Date;
  /**
   * When `true`, drops the tenant filter and queries the whole organization.
   * Caller still has to be an organization admin.
   */
  fullOrganization?: boolean;
}

/**
 * Filter and pagination options for fetching policy traces.
 *
 * All filters combine with AND semantics. Array filters match any value in
 * the array (OR within a single filter).
 */
export type PolicyTraceGetAllOptions = PaginationOptions & GovernanceFilterOptions & {
  /** Filter by one or more policy evaluation results. */
  evaluationResult?: PolicyEvaluationResult[];
  /** Filter by one or more policy IDs. */
  policyId?: string[];
  /** Filter by one or more actor process IDs. */
  actorProcessId?: string[];
  /** Filter by one or more actor process types (e.g. coded agent, RPA process). */
  actorProcessType?: string[];
  /** Filter by one or more actor identity IDs. */
  actorIdentityId?: string[];
  /** Filter by one or more resource IDs. */
  resourceId?: string[];
  /** Filter by one or more resource types. */
  resourceType?: string[];
  /** Filter by one or more distributed-trace IDs. */
  traceId?: string[];
};
