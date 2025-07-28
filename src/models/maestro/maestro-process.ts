import { z } from 'zod';
import { groupFields } from '../../utils/api-transform';

export const ProblemDetailsSchema = z.object({
  type: z.string().optional(),
  title: z.string().optional(),
  status: z.number().optional(),
  detail: z.string().optional(),
  instance: z.string().optional()
});

/**
 * Process information with instance statistics
 */
export interface MaestroProcess {
  /** Unique key identifying the process */
  processKey: string;
  /** Package identifier */
  packageId: string;
  /** Folder key where process is located */
  folderKey: string;
  /** Folder name */
  folderName: string;
  /** Available package versions */
  packageVersions: string[];
  /** Total number of versions */
  versionCount: number;
  /** Process instance counts by status */
  instanceCounts: {
    pending: number;
    running: number;
    completed: number;
    paused: number;
    cancelled: number;
    faulted: number;
    retrying: number;
    resuming: number;
    pausing: number;
    canceling: number;
  };
}

/**
 * Raw API schema for process data
 */
export const ProcessDataSchema = z.object({
  processKey: z.string(),
  packageId: z.string(),
  folderKey: z.string(),
  folderName: z.string(),
  packageVersions: z.array(z.string()),
  versionCount: z.number(),
  pendingCount: z.number(),
  runningCount: z.number(),
  completedCount: z.number(),
  pausedCount: z.number(),
  cancelledCount: z.number(),
  faultedCount: z.number(),
  retryingCount: z.number(),
  resumingCount: z.number(),
  pausingCount: z.number(),
  cancelingCount: z.number()
});

/**
 * Raw API schema for get all processes response
 */
export const GetAllProcessesResponseSchema = z.object({
  processes: z.array(ProcessDataSchema)
});

/**
 * Type for raw API response
 */
export type RawGetAllProcessesResponse = z.infer<typeof GetAllProcessesResponseSchema>;

/**
 * Type for raw process data from API
 */
export type RawProcessData = z.infer<typeof ProcessDataSchema>;

/**
 * Transforms raw API process data to SDK format
 */
export function transformProcess(raw: RawProcessData): MaestroProcess {
  const countMapping = {
    pendingCount: 'pending',
    runningCount: 'running',
    completedCount: 'completed',
    pausedCount: 'paused',
    cancelledCount: 'cancelled',
    faultedCount: 'faulted',
    retryingCount: 'retrying',
    resumingCount: 'resuming',
    pausingCount: 'pausing',
    cancelingCount: 'canceling'
  };

  const transformed = groupFields(countMapping, 'instanceCounts')(raw) as any;
  
  return {
    processKey: raw.processKey,
    packageId: raw.packageId,
    folderKey: raw.folderKey,
    folderName: raw.folderName,
    packageVersions: raw.packageVersions,
    versionCount: raw.versionCount,
    instanceCounts: transformed.instanceCounts
  };
}

export enum ExtractedValueType {
  String = 'String',
  Number = 'Number',
  Boolean = 'Boolean',
  Object = 'Object',
  Array = 'Array'
}

export interface BpmnVariableTagType {
  name: string;
  value: string;
}

export interface BpmnOutputTags {
  tags: BpmnVariableTagType[] | null;
  name: string | null;
  extractPath: string | null;
  label: string | null;
  extractedValueType: ExtractedValueType;
}

export interface BpmnElementTags {
  outputs: BpmnOutputTags[] | null;
}

export interface BpmnProcessVariableTags {
  elements: { [key: string]: BpmnElementTags } | null;
  sourcePackageVersion: string | null;
  lastUpdateTimeUtc: string;
}

export interface ProcessSettings {
  variableTags: BpmnProcessVariableTags;
}

export type ProblemDetails = z.infer<typeof ProblemDetailsSchema>;
export type GetAllProcessesResponse = z.infer<typeof GetAllProcessesResponseSchema>; 