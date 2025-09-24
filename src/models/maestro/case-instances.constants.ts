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
  
  