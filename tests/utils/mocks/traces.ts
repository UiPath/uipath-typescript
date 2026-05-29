import {
  RawSpanOtelResponse,
  RawSpanOtelPageResponse,
} from '../../../src/models/observability/traces/traces.internal-types';
import { TRACES_TEST_CONSTANTS } from '../constants/traces';

export const createMockRawOtelSpan = (
  overrides: Partial<RawSpanOtelResponse> = {}
): RawSpanOtelResponse => ({
  Id: TRACES_TEST_CONSTANTS.SPAN_ID_1,
  TraceId: TRACES_TEST_CONSTANTS.TRACE_ID,
  ParentId: null,
  Name: TRACES_TEST_CONSTANTS.SPAN_NAME,
  StartTime: TRACES_TEST_CONSTANTS.START_TIME,
  EndTime: TRACES_TEST_CONSTANTS.END_TIME,
  Attributes: TRACES_TEST_CONSTANTS.ATTRIBUTES,
  Status: 1, // SpanStatus.Ok
  OrganizationId: TRACES_TEST_CONSTANTS.ORG_ID,
  TenantId: TRACES_TEST_CONSTANTS.TENANT_ID,
  ExpiryTimeUtc: null,
  FolderKey: TRACES_TEST_CONSTANTS.FOLDER_KEY,
  Source: 1, // SpanSource.Agents
  SpanType: TRACES_TEST_CONSTANTS.SPAN_TYPE,
  ProcessKey: null,
  JobKey: null,
  ReferenceId: TRACES_TEST_CONSTANTS.AGENT_ID,
  ReferenceVersion: TRACES_TEST_CONSTANTS.AGENT_VERSION,
  VerbosityLevel: 2, // SpanVerbosityLevel.Information
  ExecutionType: 0, // SpanExecutionType.Debug
  UpdatedAt: TRACES_TEST_CONSTANTS.UPDATED_AT,
  AgentVersion: TRACES_TEST_CONSTANTS.AGENT_VERSION,
  Attachments: null,
  PermissionStatus: 0, // SpanPermissionStatus.Allow
  Context: null,
  ...overrides,
});

export const createMockOtelPageResponse = (
  spans: RawSpanOtelResponse[] = [createMockRawOtelSpan()],
  tokens = ''
): RawSpanOtelPageResponse => ({
  Spans: spans,
  Tokens: tokens,
});

