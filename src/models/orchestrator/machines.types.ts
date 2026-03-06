import { BaseOptions, RequestOptions } from '../common/types';
import { PaginationOptions } from '../../utils/pagination';

/**
 * Enum for machine type
 */
export enum MachineType {
  Standard = 'Standard',
  Template = 'Template',
  Unattended = 'Unattended',
  HybridServer = 'HybridServer'
}

/**
 * Enum for machine scope
 */
export enum MachineScope {
  Global = 'Global',
  Tenant = 'Tenant'
}

/**
 * Enum for machine hosting type
 */
export enum MachineHostingType {
  Standard = 'Standard',
  Serverless = 'Serverless'
}

/**
 * Interface for machine robot version information
 */
export interface MachineRobotVersion {
  version: string;
  connectedRobotsCount: number;
}

/**
 * Interface for machine response
 */
export interface MachineGetResponse {
  key: string;
  name: string;
  description: string | null;
  type: MachineType;
  scope: MachineScope;
  nonProductionSlots: number;
  unattendedSlots: number;
  headlessSlots: number;
  testAutomationSlots: number;
  robotVersions: MachineRobotVersion[];
  clientSecret: string;
  hostingType: MachineHostingType;
  maintenanceMode: boolean;
  id: number;
  isOnline: boolean;
  status: string | null;
  statusId: number | null;
}

/**
 * Options for getting machines with optional filtering
 */
export type MachineGetAllOptions = RequestOptions & PaginationOptions;

/**
 * Options for getting a single machine by ID
 */
export type MachineGetByIdOptions = BaseOptions;
