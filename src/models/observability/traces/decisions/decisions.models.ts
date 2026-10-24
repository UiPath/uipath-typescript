import type {
  DecisionCreateInput,
  DecisionIngestAck,
  DecisionGetOptions,
  DecisionListOptions,
  DecisionQueryOptions,
  DecisionResponse,
  DecisionsPageResponse,
} from './decisions.types';
import type { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../../../../utils/pagination';

/** Records and reads the Decision Object Model: who decided what on a trace, field by field. */
export interface DecisionsServiceModel {
  /**
   * Writes one or more decisions to a trace. Rewriting an existing `decisionId` on the same trace updates that decision.
   *
   * @param traceId - Trace the decisions belong to (32 lowercase hex characters)
   * @param decisions - Decisions to write; each `decisionId` is the id of the completing span (16 lowercase hex characters)
   * @param folderKey - Folder (GUID) the decisions are written to
   * @returns Promise resolving to one {@link DecisionIngestAck} per decision, in input order
   * @example
   * ```typescript
   * import { Decisions } from '@uipath/uipath-typescript/traces';
   *
   * const decisions = new Decisions(sdk);
   *
   * const acks = await decisions.create('<traceId>', [{
   *   decisionId: '<spanId>',
   *   data: {
   *     amount: {
   *       proposedValue: 1065,
   *       finalValue: 1065,
   *       disposition: 'Accepted',
   *       proposedBy: { identity: '<agentId>', kind: 'Agent' },
   *     },
   *   },
   *   actor: { identity: '<userEmail>', kind: 'Human' },
   *   acceptedOutcome: 'Approve',
   *   decisionTimestamp: new Date().toISOString(),
   *   platform: 'ActionCenter',
   * }], '<folderKey>');
   * console.log(acks[0].feedbackId);
   * ```
   */
  create(traceId: string, decisions: DecisionCreateInput[], folderKey: string): Promise<DecisionIngestAck[]>;

  /**
   * Gets a single decision by its decision ID, including the decision body and, unless disabled, the span it is attached to.
   *
   * @param decisionId - Decision ID (16 lowercase hex characters), as returned by {@link DecisionsServiceModel.create}
   * @param options - Optional folder scope and span inclusion
   * @returns Promise resolving to the {@link DecisionResponse}
   * @example
   * ```typescript
   * import { Decisions } from '@uipath/uipath-typescript/traces';
   *
   * const decisions = new Decisions(sdk);
   *
   * const decision = await decisions.getById('<decisionId>');
   * console.log(decision.decision.acceptedOutcome, decision.updatedTime);
   * ```
   * @example
   * ```typescript
   * // Scope the read to a folder and skip the span lookup
   * const decision = await decisions.getById('<decisionId>', {
   *   folderKey: '<folderKey>',
   *   includeSpans: false,
   * });
   * ```
   */
  getById(decisionId: string, options?: DecisionGetOptions): Promise<DecisionResponse>;

  /**
   * Lists decisions, optionally filtered by trace, process and time range. Returns a flat list, or a paginated page when pagination options are passed.
   *
   * @param options - Optional filters and pagination
   * @returns Promise resolving to a paginated or non-paginated list of {@link DecisionResponse}
   * @example
   * ```typescript
   * import { Decisions } from '@uipath/uipath-typescript/traces';
   *
   * const decisions = new Decisions(sdk);
   *
   * const result = await decisions.list({ traceId: '<traceId>' });
   * result.items.forEach((item) => console.log(item.decision.decisionId, item.decision.acceptedOutcome));
   * ```
   * @example
   * ```typescript
   * // Decisions for one process since a start time, paginated
   * const page = await decisions.list({
   *   processKey: '<processKey>',
   *   from: new Date('2026-01-01T00:00:00Z'),
   *   pageSize: 25,
   * });
   *
   * if (page.hasNextPage && page.nextCursor) {
   *   const next = await decisions.list({ cursor: page.nextCursor });
   * }
   * ```
   */
  list<T extends DecisionListOptions = DecisionListOptions>(options?: T): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<DecisionResponse>
      : NonPaginatedResponse<DecisionResponse>
  >;

  /**
   * Finds decisions with a richer filter than `list`: by process, actor, outcome or whether the actor overrode a proposal.
   * Filters on decision content are limited to the most recent 90 days, reported as `effectiveFrom` on the returned page.
   *
   * @param options - Optional filters, paging and sort
   * @returns Promise resolving to a {@link DecisionsPageResponse} with `items`, `totalCount` and `effectiveFrom`
   * @example
   * ```typescript
   * import { Decisions } from '@uipath/uipath-typescript/traces';
   *
   * const decisions = new Decisions(sdk);
   *
   * const page = await decisions.query({ processKey: '<processKey>' });
   * console.log(`${page.totalCount} decisions`);
   * ```
   * @example
   * ```typescript
   * // Decisions where the actor overrode a proposal, newest created first
   * const overridden = await decisions.query({
   *   hasOverrides: true,
   *   actorKind: 'Human',
   *   sortBy: 'CreatedAt',
   *   take: 20,
   * });
   * overridden.items.forEach((item) => console.log(item.decision.actor.identity));
   * ```
   */
  query(options?: DecisionQueryOptions): Promise<DecisionsPageResponse>;
}
