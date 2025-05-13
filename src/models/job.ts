export interface JobErrorInfo {
  Code?: string;
  Title?: string;
  Detail?: string;
  Category?: string;
  Status?: string;
}

export interface Job {
  Key?: string;
  StartTime?: string;
  EndTime?: string;
  State?: string;
  JobPriority?: string;
  SpecificPriorityValue?: number;
  Robot?: Record<string, any>;
  Release?: Record<string, any>;
  ResourceOverwrites?: string;
  Source?: string;
  SourceType?: string;
  BatchExecutionKey?: string;
  Info?: string;
  CreationTime?: string;
  CreatorUserId?: number;
  LastModificationTime?: string;
  LastModifierUserId?: number;
  DeletionTime?: string;
  DeleterUserId?: number;
  IsDeleted?: boolean;
  InputArguments?: string;
  OutputArguments?: string;
  HostMachineName?: string;
  HasErrors?: boolean;
  HasWarnings?: boolean;
  JobError?: JobErrorInfo;
  Id: number;
} 