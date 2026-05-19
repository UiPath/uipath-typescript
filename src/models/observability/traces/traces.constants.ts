import {
  SpanAttachmentDirection,
  SpanAttachmentProvider,
  SpanExecutionType,
  SpanPermissionStatus,
  SpanSource,
  SpanStatus,
  SpanVerbosityLevel,
} from './traces.types';

/** Maps integer Status values from the otel API to {@link SpanStatus} enum values. */
export const SpanStatusMap: Record<number, SpanStatus> = {
  0: SpanStatus.Unset,
  1: SpanStatus.Ok,
  2: SpanStatus.Error,
  3: SpanStatus.Running,
  4: SpanStatus.Restricted,
  5: SpanStatus.Cancelled,
};

/** Maps integer Source values from the otel API to {@link SpanSource} enum values. */
export const SpanSourceMap: Record<number, SpanSource> = {
  0: SpanSource.Testing,
  1: SpanSource.Agents,
  2: SpanSource.ProcessOrchestration,
  3: SpanSource.ApiWorkflows,
  4: SpanSource.Robots,
  5: SpanSource.ConversationalAgentsService,
  6: SpanSource.IntegrationServiceTrigger,
  7: SpanSource.Playground,
  8: SpanSource.Governance,
  9: SpanSource.IXPUnstructuredAndComplexDocuments,
  10: SpanSource.CodedAgents,
  11: SpanSource.IXPCommunicationsMining,
  12: SpanSource.EnterpriseContextService,
  13: SpanSource.MCP,
  14: SpanSource.A2A,
};

/** Maps integer VerbosityLevel values from the otel API to {@link SpanVerbosityLevel} enum values. */
export const SpanVerbosityLevelMap: Record<number, SpanVerbosityLevel> = {
  0: SpanVerbosityLevel.Verbose,
  1: SpanVerbosityLevel.Trace,
  2: SpanVerbosityLevel.Information,
  3: SpanVerbosityLevel.Warning,
  4: SpanVerbosityLevel.Error,
  5: SpanVerbosityLevel.Critical,
  6: SpanVerbosityLevel.Off,
};

/** Maps integer ExecutionType values from the otel API to {@link SpanExecutionType} enum values. */
export const SpanExecutionTypeMap: Record<number, SpanExecutionType> = {
  0: SpanExecutionType.Debug,
  1: SpanExecutionType.Runtime,
};

/** Maps integer PermissionStatus values from the otel API to {@link SpanPermissionStatus} enum values. */
export const SpanPermissionStatusMap: Record<number, SpanPermissionStatus> = {
  0: SpanPermissionStatus.Allow,
  1: SpanPermissionStatus.PartialBlock,
  2: SpanPermissionStatus.Block,
};

/** Maps integer Provider values from the otel API to {@link SpanAttachmentProvider} enum values. */
export const SpanAttachmentProviderMap: Record<number, SpanAttachmentProvider> = {
  0: SpanAttachmentProvider.Orchestrator,
  1: SpanAttachmentProvider.LLMOps,
};

/** Maps integer Direction values from the otel API to {@link SpanAttachmentDirection} enum values. */
export const SpanAttachmentDirectionMap: Record<number, SpanAttachmentDirection> = {
  0: SpanAttachmentDirection.None,
  1: SpanAttachmentDirection.In,
  2: SpanAttachmentDirection.Out,
};
