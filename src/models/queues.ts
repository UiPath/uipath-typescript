export enum QueueItemPriority {
  LOW = "Low",
  MEDIUM = "Medium",
  HIGH = "High"
}

export enum CommitType {
  ALL_OR_NOTHING = "AllOrNothing",
  STOP_ON_FIRST_FAILURE = "StopOnFirstFailure",
  PROCESS_ALL_INDEPENDENTLY = "ProcessAllIndependently"
}

export interface QueueItem {
  Name: string;
  Priority?: QueueItemPriority;
  SpecificContent?: Record<string, any>;
  DeferDate?: string;
  DueDate?: string;
  RiskSlaDate?: string;
  Progress?: string;
  Source?: string;
  ParentOperationId?: string;
}

export interface TransactionItem {
  Name: string;
  RobotIdentifier?: string;
  SpecificContent?: Record<string, any>;
  DeferDate?: string;
  DueDate?: string;
  ParentOperationId?: string;
}

export interface TransactionItemResult {
  IsSuccessful?: boolean;
  ProcessingException?: any;
  DeferDate?: string;
  DueDate?: string;
  Output?: Record<string, any>;
  Analytics?: Record<string, any>;
  Progress?: string;
  OperationId?: string;
} 