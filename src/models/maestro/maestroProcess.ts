import { z } from 'zod';

export const ProblemDetailsSchema = z.object({
  type: z.string().optional(),
  title: z.string().optional(),
  status: z.number().optional(),
  detail: z.string().optional(),
  instance: z.string().optional()
});

export const ProcessSummarySchema = z.object({
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

export const GetAllProcessesSummaryResponseSchema = z.object({
  processes: z.array(ProcessSummarySchema)
});

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
export type ProcessSummary = z.infer<typeof ProcessSummarySchema>;
export type GetAllProcessesSummaryResponse = z.infer<typeof GetAllProcessesSummaryResponseSchema>; 