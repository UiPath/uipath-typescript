import { PaginationOptions } from '../../../../utils/pagination';
import { SpanGetResponse } from '../traces.types';

/** Platform a decision was captured from. */
export type DecisionPlatform = 'ActionCenter' | 'CodedApp' | 'VerticalUi';

/** Who or what made the decision (the overall `actor`, not a per-field proposer). */
export type DecisionActorKind = 'Automation' | 'Human' | 'Rule' | 'Agent';

/** Who or what proposed a single field's value, before the actor accepted or changed it. */
export type DecisionProposerKind = 'Automation' | 'Person' | 'Agent' | 'Team';

/** How a proposed field value was treated by the actor. */
export type DecisionFieldDisposition = 'Accepted' | 'LightlyEdited' | 'Rewritten' | 'Rejected' | 'Ignored';

/** Kind of asset that proposed a field value, when the proposer traces back to one. */
export type DecisionSourceAssetKind = 'Agent' | 'Automation' | 'Process' | 'Rule' | 'Ontology' | 'Knowledge';

/** Field a decision query page is ordered by. */
export type DecisionSortField = 'UpdatedAt' | 'CreatedAt';

/** Who made the decision. */
export interface DecisionActor {
  /** Identity of the actor (e.g. an email, a robot account, an agent ID). */
  identity: string;
  kind: DecisionActorKind;
}

/** Who or what proposed a field's value. */
export interface DecisionProposedBy {
  /** Identity of the proposer (e.g. an email, an agent ID). */
  identity: string;
  kind: DecisionProposerKind;
}

/** The asset a proposed value traces back to (an agent, an automation, a rule, etc.). */
export interface DecisionSourceAsset {
  kind: DecisionSourceAssetKind;
  /** Identifier of the asset (meaning depends on `kind`). */
  id: string;
  /** Version of the asset, when versioned. */
  version?: string;
}

/** One field of a decision: what was proposed, what the actor kept, and by whom. */
export interface DecisionFieldData {
  /** The value the proposer suggested, before the actor reviewed it. */
  proposedValue?: unknown;
  /** The value the actor kept, after review. */
  finalValue?: unknown;
  disposition: DecisionFieldDisposition;
  proposedBy: DecisionProposedBy;
  /** The asset this field's proposed value traces back to, when known. */
  sourceAsset?: DecisionSourceAsset;
}

/** Process context a decision was made in, when tied to a running process instance. */
export interface DecisionProcessInstanceMetadata {
  processKey?: string;
  /** Display name of the process; filterable through {@link DecisionsServiceModel.query}. */
  processName?: string;
  processVersion?: string;
  instanceId?: string;
  elementId?: string;
}

/** A decision as sent to or echoed back by the Decisions API. */
export interface Decision {
  /** 16 lowercase hex characters — an OpenTelemetry span ID. */
  decisionId: string;
  /** One entry per field that informed the decision, keyed by a caller-chosen field name. */
  data: Record<string, DecisionFieldData>;
  actor: DecisionActor;
  /** The outcome the actor accepted. */
  acceptedOutcome: string;
  /** Outcomes the actor considered and did not accept. */
  rejectedOutcomes?: string[];
  /** ISO 8601 date-time string — when the actor made the decision. */
  decisionTimestamp: string;
  /** Evidence the actor cited explicitly in making the decision. */
  explicitEvidences?: string[];
  /** Signals captured implicitly (view time, edit count, etc.); a coded action app task's `intrinsicSignals` arrive under that key. */
  implicitSignals?: unknown;
  processInstanceMetadata?: DecisionProcessInstanceMetadata;
  platform: DecisionPlatform;
}

/** A decision to write, as passed to {@link DecisionsServiceModel.create}. */
export interface DecisionCreateInput extends Decision {}

/** Acknowledgement for one written decision, in the same order as the input array. */
export interface DecisionIngestAck {
  /** Echo of the written `decisionId`. */
  decisionId: string;
  /** Stable identifier for this `decisionId` on this trace across upserts. */
  feedbackId: string;
}

/** A decision as returned by {@link DecisionsServiceModel.getById}, `list`, and `query`. */
export interface DecisionResponse {
  feedbackId: string;
  traceId: string;
  /** Folder (GUID) the decision was written to. Null for pre-folder-scoping decisions. */
  folderKey?: string | null;
  /** Where the decision was ingested from, e.g. `DecisionsApi`. */
  origin: string;
  /** The decision that was written. */
  decision: Decision;
  /** ISO 8601 date-time string — when the decision was first written. */
  createdTime: string;
  /** ISO 8601 date-time string — when the decision was last upserted. */
  updatedTime: string;
  /** The OTEL span the decision is attached to. Null unless `includeSpans` was requested. */
  span?: SpanGetResponse | null;
}

/** Options for {@link DecisionsServiceModel.getById}. */
export interface DecisionGetOptions {
  /** Folder (GUID) to scope the read to. Without it, the read is tenant-wide. */
  folderKey?: string;
  /** Include the OTEL span on the response. Defaults to `true` server-side. */
  includeSpans?: boolean;
}

/** Options for {@link DecisionsServiceModel.list}. */
export type DecisionListOptions = PaginationOptions & {
  /** Folder (GUID) to scope the read to. Without it, the read is tenant-wide. */
  folderKey?: string;
  /** Filter to decisions on this trace. */
  traceId?: string;
  /** Filter to decisions recorded against this process key. */
  processKey?: string;
  /** Filter to decisions recorded against this process name. */
  processName?: string;
  /** Only decisions updated at or after this time. */
  from?: Date;
  /** Only decisions updated at or before this time. */
  to?: Date;
  /** Include the OTEL span on each item. Defaults to `false` server-side. */
  includeSpans?: boolean;
};

/** Full-filter options for {@link DecisionsServiceModel.query}. Every field is optional. */
export interface DecisionQueryOptions {
  /** Folder (GUID) to scope the read to. Without it, the read is tenant-wide. */
  folderKey?: string;
  traceId?: string;
  decisionId?: string;
  processKey?: string;
  /** Exact process name, case-insensitive. */
  processName?: string;
  processVersion?: string;
  instanceId?: string;
  elementId?: string;
  platform?: DecisionPlatform;
  actorIdentity?: string;
  actorKind?: DecisionActorKind;
  acceptedOutcome?: string;
  origin?: string;
  /** `true`: only decisions where the actor rejected or rewrote a proposal. `false`: only decisions where every proposal was accepted or lightly edited. */
  hasOverrides?: boolean;
  /** Only decisions updated at or after this time. */
  from?: Date;
  /** Only decisions updated at or before this time. */
  to?: Date;
  /** Row offset. Defaults to `0`. */
  skip?: number;
  /** Page size, 1 to 200. Defaults to `50` server-side. */
  take?: number;
  /** Defaults to `UpdatedAt` server-side. */
  sortBy?: DecisionSortField;
  /** Defaults to `true` server-side. */
  descending?: boolean;
  /** Include the OTEL span on each item. Defaults to `true` server-side. */
  includeSpans?: boolean;
}

/** A page of decisions, as returned by {@link DecisionsServiceModel.query}. */
export interface DecisionsPageResponse {
  items: DecisionResponse[];
  totalCount: number;
  /** Start of this page's consistency window, ISO 8601, when the API provides one. */
  effectiveFrom?: string;
}
