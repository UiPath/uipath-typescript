/**
 * Maps fields for Case Instance entities to ensure consistent naming
 */
export const CaseInstanceMap: { [key: string]: string } = {
    startedTimeUtc: 'startedTime',
    completedTimeUtc: 'completedTime',
    expiryTimeUtc: 'expiredTime',
    createdAt: 'createdTime',
    updatedAt: 'updatedTime',
    externalId: 'caseId',
  };

/**
 * Maps fields for Case App Config
 */
export const CaseAppConfigMap: { [key: string]: string } = {
    sections: 'overview',
  };

/**
 * Maps fields for Stage SLA configuration
 */
export const StageSLAMap: { [key: string]: string } = {
    count: 'length',
    unit: 'duration',
  };

/**
 * Constants for case instance stage processing
 */
export const CASE_STAGE_CONSTANTS = {
  TRIGGER_NODE_TYPE: 'case-management:Trigger',
  UNDEFINED_VALUE: 'Undefined',
  NOT_STARTED_STATUS: 'Not Started'
} as const;