/**
 * Internal types for traces
 * These types are used internally by the SDK and should not be exposed to users
 */

import type { TraceSpanStatus } from './traces.types';

/**
 * Raw span as returned from the API (before transformation)
 */
export interface RawTraceSpan {
  Id: string;
  TraceId: string;
  ParentId?: string;
  Name: string;
  StartTime: string;
  EndTime?: string;
  Attributes: Record<string, unknown>;
  Status: TraceSpanStatus;
  OrganizationId: string;
  TenantId: string;
  ExpiryTimeUtc?: string;
  FolderKey?: string;
  Source?: number;
  SpanType?: string;
  ProcessKey?: string;
  JobKey?: string;
  Attachments?: Array<{
    Id: string;
    FileName: string;
    MimeType: string;
  }>;
}
