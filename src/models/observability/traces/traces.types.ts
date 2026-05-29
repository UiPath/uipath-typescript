
/** Status of a span: whether it completed successfully, with an error, or was not set. */
export enum SpanStatus {
  Unset = 'Unset',
  Ok = 'Ok',
  Error = 'Error',
  /** Span is still in progress. */
  Running = 'Running',
  /** Span data is hidden from the caller due to tenant/folder permission rules. */
  Restricted = 'Restricted',
  /** Span was cancelled before completion. */
  Cancelled = 'Cancelled',
}

/** Platform source that produced the span. */
export enum SpanSource {
  Testing = 'Testing',
  Agents = 'Agents',
  ProcessOrchestration = 'ProcessOrchestration',
  ApiWorkflows = 'ApiWorkflows',
  Robots = 'Robots',
  ConversationalAgentsService = 'ConversationalAgentsService',
  IntegrationServiceTrigger = 'IntegrationServiceTrigger',
  Playground = 'Playground',
  Governance = 'Governance',
  /** Intelligent Experience Platform — unstructured and complex document processing source. */
  IXPUnstructuredAndComplexDocuments = 'IXPUnstructuredAndComplexDocuments',
  /** Agents authored in code (as opposed to visual/no-code designers). */
  CodedAgents = 'CodedAgents',
  /** Intelligent Experience Platform — communications mining source. */
  IXPCommunicationsMining = 'IXPCommunicationsMining',
  /** UiPath Context Grounding — span produced by the Enterprise Context Service for RAG/knowledge-base operations. */
  EnterpriseContextService = 'EnterpriseContextService',
  /** Model Context Protocol — span produced by an MCP server integration. */
  MCP = 'MCP',
  /** Agent-to-Agent — span produced by an A2A protocol call between agents. */
  A2A = 'A2A',
  /** Serverless — span produced by a serverless function execution. */
  Serverless = 'Serverless',
}

/** Minimum severity level of events captured in the span. */
export enum SpanVerbosityLevel {
  Verbose = 'Verbose',
  Trace = 'Trace',
  Information = 'Information',
  Warning = 'Warning',
  Error = 'Error',
  Critical = 'Critical',
  Off = 'Off',
}

/** Whether the span was produced during a debug or production runtime. */
export enum SpanExecutionType {
  Debug = 'Debug',
  Runtime = 'Runtime',
}

/** Whether the caller has permission to read this span's data. */
export enum SpanPermissionStatus {
  Allow = 'Allow',
  /** Some span fields are redacted due to permission constraints (e.g. attributes visible but payload hidden). */
  PartialBlock = 'PartialBlock',
  Block = 'Block',
}

/** Storage provider that created or manages the attachment. */
export enum SpanAttachmentProvider {
  Orchestrator = 'Orchestrator',
  /** Span attachment stored by the observability platform. */
  LLMOps = 'LLMOps',
}

/** Whether the attachment is an input, output, or neither. */
export enum SpanAttachmentDirection {
  None = 'None',
  In = 'In',
  Out = 'Out',
}

/** One level in the reference hierarchy that produced this span. */
export interface SpanReferenceHierarchyEntry {
  serviceType: string;
  referenceId: string;
  version: string | null;
}

/** Contextual lineage attached to the span (reference hierarchy). */
export interface SpanContext {
  referenceHierarchy: SpanReferenceHierarchyEntry[];
}

/** File or payload attachment linked to the span. */
export interface SpanAttachment {
  provider: SpanAttachmentProvider;
  id: string;
  fileName: string;
  mimeType: string;
  direction: SpanAttachmentDirection;
}

/** A single execution span returned by the Traces API. */
export interface SpanResponse {
  /** Unique identifier of this span (GUID). */
  id: string;
  /** Trace this span belongs to (GUID). */
  traceId: string;
  /** Parent span ID, or null for root spans. */
  parentId: string | null;
  /** Human-readable name of the operation, or null if the span has no name. */
  name: string | null;
  /** ISO-8601 UTC timestamp when the span started. */
  startTime: string;
  /** ISO-8601 UTC timestamp when the span ended, or null if still running. */
  endTime: string | null;
  /**
   * Span attributes (user-defined schema — do not transform keys).
   * Values depend on the span type and the agent that produced them.
   */
  attributes: Record<string, unknown>;
  /** Completion status of the span. */
  status: SpanStatus;
  /** Platform source that produced the span. */
  source: SpanSource | null;
  /** Span type tag (e.g. `"agentRun"`, `"llmCall"`). */
  spanType: string | null;
  /** Minimum verbosity level captured in this span. */
  verbosityLevel: SpanVerbosityLevel | null;
  /** Whether this span was from a debug or runtime execution. */
  executionType: SpanExecutionType | null;
  /** Folder key (GUID) scoping this span. */
  folderKey: string | null;
  /** Identifier of the entity (agent, process, etc.) that produced the span. */
  referenceId: string | null;
  /** Version of the entity that produced the span. */
  referenceVersion: string | null;
  /** Version of the agent runtime. */
  agentVersion: string | null;
  /** Organization (account) GUID. */
  organizationId: string;
  /** Tenant GUID. */
  tenantId: string | null;
  /** Key of the process associated with this span. */
  processKey: string | null;
  /** Key of the job associated with this span. */
  jobKey: string | null;
  /** ISO-8601 UTC timestamp of last update. */
  updatedAt: string;
  /** Expiry timestamp, or null if the span does not expire. */
  expiredTime: string | null;
  /** Reference hierarchy context for this span. */
  context: SpanContext | null;
  /** File or payload attachments linked to this span. */
  attachments: SpanAttachment[] | null;
  /** Whether the caller can read this span's data. */
  permissionStatus: SpanPermissionStatus | null;
}

/** Options for retrieving all spans belonging to a trace. */
export interface TracesGetByIdOptions {
  /** Maximum number of spans to return. */
  pageSize?: number;
  /** Filter spans to those produced by a specific agent ID. */
  agentId?: string;
  /** When true, include expired spans that are outside the default retention window. */
  includeExpiredSpans?: boolean;
}


