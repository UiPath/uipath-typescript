import type { RawOrchestratorUserDto } from './users.internal-types';

/**
 * Maps fields for Orchestrator user entities to ensure consistent naming
 */
export const OrchestratorUserMap: { [key: string]: string } = {
  creationTime: 'createdTime',
  lastModificationTime: 'lastModifiedTime',
};

/**
 * Wire fields removed from each user before it is returned: deprecated members
 * (`Password`, `NotificationSubscription`), robot-provisioning configuration including
 * credential fields (`RobotProvision`, `UnattendedRobot`, `UpdatePolicy`), and
 * `ExternalRoles`, which is absent from the API's public contract.
 */
export const ORCHESTRATOR_USER_DROPPED_FIELDS = [
  'Password',
  'NotificationSubscription',
  'RobotProvision',
  'UnattendedRobot',
  'UpdatePolicy',
  'ExternalRoles',
] as const satisfies ReadonlyArray<keyof RawOrchestratorUserDto>;
