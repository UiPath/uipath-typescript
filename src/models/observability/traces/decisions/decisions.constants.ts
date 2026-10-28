import { DecisionActorKind, DecisionPlatform, DecisionSortField } from './decisions.types';

/** Maps Decisions API response fields to SDK naming conventions. */
export const DecisionMap: { [key: string]: string } = {
  createdAt: 'createdTime',
  updatedAt: 'updatedTime',
};

/** 32 hex characters — the Decisions API's trace ID format. */
export const TRACE_ID_REGEX = /^[0-9a-f]{32}$/i;

/** 16 hex characters (an OTEL span ID) — the Decisions API's decision ID format. */
export const DECISION_ID_REGEX = /^[0-9a-f]{16}$/i;

/** `query()`'s body wants `platform` as an int; `create()` uses the string union. */
export const DecisionPlatformWireMap: Record<DecisionPlatform, number> = {
  ActionCenter: 0,
  CodedApp: 1,
  VerticalUi: 2,
};

/** `query()`'s body wants `actorKind` as an int; see {@link DecisionPlatformWireMap}. */
export const DecisionActorKindWireMap: Record<DecisionActorKind, number> = {
  Automation: 0,
  Human: 1,
  Rule: 2,
  Agent: 3,
};

/** `query()`'s body wants `sortBy` as an int; see {@link DecisionPlatformWireMap}. */
export const DecisionSortFieldWireMap: Record<DecisionSortField, number> = {
  UpdatedAt: 0,
  CreatedAt: 1,
};
