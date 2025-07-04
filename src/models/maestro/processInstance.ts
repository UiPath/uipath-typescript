import { z } from 'zod';
import { ProcessInstancesService } from '../../services/maestro/processInstances';

export const GetInstanceResponseSchema = z.object({
  organizationId: z.string().nullable(),
  tenantId: z.string().nullable(),
  instanceId: z.string().nullable(),
  packageKey: z.string().nullable(),
  packageId: z.string().nullable(),
  packageVersion: z.string().nullable(),
  latestRunId: z.string().nullable(),
  latestRunStatus: z.string().nullable(),
  processKey: z.string().nullable(),
  folderKey: z.string().nullable(),
  userId: z.number().int(),
  instanceDisplayName: z.string().nullable(),
  source: z.string().nullable(),
  startedByUser: z.string().nullable(),
  creatorUserKey: z.string().nullable(),
  startedTimeUtc: z.string().datetime(),
  completedTimeUtc: z.string().datetime().nullable(),
  state: z.string().nullable(),
  priority: z.string().nullable(),
  content: z.any(),
  output: z.any(),
  metadata: z.any()
});

export type GetInstanceResponse = z.infer<typeof GetInstanceResponseSchema>;

export const InstanceRunSchema = z.object({
  // TODO: Add InstanceRun schema properties when available
});

export const IncidentResponseSchema = z.object({
  // TODO: Add IncidentResponse schema properties when available
});

export const GoToCursorsSchema = z.object({
  // TODO: Add GoToCursors schema properties when available
});

export const SourceEnum = z.enum(['1', '2']);

export const StatusEnum = z.enum(['Unset', 'Ok', 'Error', 'Unspecified']); // Adding common status values, adjust if needed

export const SpanSchema = z.object({
  id: z.string().uuid(),
  traceId: z.string().uuid(),
  parentId: z.string().uuid().nullable(),
  name: z.string().nullable(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime().nullable(),
  attributes: z.string().nullable(),
  status: StatusEnum,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  organizationId: z.string().uuid(),
  tenantId: z.string().uuid().nullable(),
  expiryTimeUtc: z.string().datetime().nullable(),
  folderKey: z.string().uuid().nullable(),
  source: SourceEnum
});

export const InstanceCancelRequestSchema = z.object({
  comment: z.string().nullable()
});

export const InstancePauseRequestSchema = z.object({
  comment: z.string().nullable()
});

export const InstanceResumeRequestSchema = z.object({
  comment: z.string().nullable()
});

export const InstancesStatusResponseSchema = z.object({
  instanceId: z.string().nullable(),
  status: z.string().nullable()
});

export const GetAllInstancesResponseSchema = z.object({
  instances: z.array(GetInstanceResponseSchema).nullable(),
  nextPage: z.string().nullable(),
  hasMoreResults: z.boolean()
});

export interface PaginationParams {
  nextPage?: string;
  pageSize?: number;
}

export interface GetInstancesQueryParams extends PaginationParams {
  [key: string]: string | number | undefined;
  packageId?: string;
  packageVersion?: string;
  processKey?: string;
  processName?: string;
  errorCode?: string;
}

export type InstanceRun = z.infer<typeof InstanceRunSchema>;
export type IncidentResponse = z.infer<typeof IncidentResponseSchema>;
export type GoToCursors = z.infer<typeof GoToCursorsSchema>;
export type GetAllInstancesResponse = z.infer<typeof GetAllInstancesResponseSchema>;
export type InstanceCancelRequest = z.infer<typeof InstanceCancelRequestSchema>;
export type InstancePauseRequest = z.infer<typeof InstancePauseRequestSchema>;
export type InstanceResumeRequest = z.infer<typeof InstanceResumeRequestSchema>;
export type InstancesStatusResponse = z.infer<typeof InstancesStatusResponseSchema>;
export type Span = z.infer<typeof SpanSchema>;
export type Source = z.infer<typeof SourceEnum>;
export type Status = z.infer<typeof StatusEnum>;

export interface ProcessInstanceDto {
  id: string;
  status: string;
  startTime: string;
  endTime: string | null;
  priority: string;
  specificContent: any;
  outputArguments: any;
  info: any;
  // Add other DTO fields as needed
}

export class ProcessInstance {
  constructor(
    private readonly instanceData: GetInstanceResponse,
    private readonly service: ProcessInstancesService,
    private readonly instanceFolderKey: string
  ) {}

  // Expose the instance data properties
  get instanceId(): string | null {
    return this.instanceData.instanceId;
  }

  get state(): string | null {
    return this.instanceData.state;
  }

  get startTime(): string | null {
    return this.instanceData.startedTimeUtc;
  }

  get endTime(): string | null {
    return this.instanceData.completedTimeUtc;
  }

  get priority(): string | null {
    return this.instanceData.priority;
  }

  get content(): any {
    return this.instanceData.content;
  }

  get output(): any {
    return this.instanceData.output;
  }

  get metadata(): any {
    return this.instanceData.metadata;
  }

  // Instance methods
  async cancel(comment: string | null = null): Promise<void> {
    if (!this.instanceId) throw new Error('Instance ID is null');
    await this.service.cancel(this.instanceId, this.instanceFolderKey, { comment });
  }

  async pause(comment: string | null = null): Promise<void> {
    if (!this.instanceId) throw new Error('Instance ID is null');
    await this.service.pause(this.instanceId, this.instanceFolderKey, { comment });
  }

  async resume(comment: string | null = null): Promise<void> {
    if (!this.instanceId) throw new Error('Instance ID is null');
    await this.service.resume(this.instanceId, this.instanceFolderKey, { comment });
  }

  // Convert GetInstanceResponse to ProcessInstance
  static fromResponse(response: GetInstanceResponse, service: ProcessInstancesService, folderKey: string): ProcessInstance {
    return new ProcessInstance(response, service, folderKey);
  }

  // Get the raw response data
  toJSON(): GetInstanceResponse {
    return this.instanceData;
  }
} 