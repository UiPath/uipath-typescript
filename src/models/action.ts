export interface FieldDetails {
  name: string;
  key: string;
}

export interface ActionSchema {
  key: string;
  inOuts?: FieldDetails[];
  inputs?: FieldDetails[];
  outputs?: FieldDetails[];
  outcomes?: FieldDetails[];
}

export interface Action {
  taskDefinitionPropertiesId?: number;
  appTasksMetadata?: any;
  actionLabel?: string;
  status?: string | number;
  data?: Record<string, any>;
  action?: string;
  waitJobState?: string;
  organizationUnitFullyQualifiedName?: string;
  tags?: any[];
  assignedToUser?: any;
  taskSlaDetails?: any[];
  completedByUser?: any;
  taskAssignmentCriteria?: string;
  taskAssignees?: any[];
  title?: string;
  type?: string;
  priority?: string;
  assignedToUserId?: number;
  organizationUnitId?: number;
  externalTag?: string;
  creatorJobKey?: string;
  waitJobKey?: string;
  lastAssignedTime?: string;
  completionTime?: string;
  parentOperationId?: string;
  key?: string;
  isDeleted: boolean;
  deleterUserId?: number;
  deletionTime?: string;
  lastModificationTime?: string;
  lastModifierUserId?: number;
  creationTime?: string;
  creatorUserId?: number;
  id?: number;
} 