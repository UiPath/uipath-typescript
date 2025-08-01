/**
 * Maestro Process Models
 * Model classes for Maestro processes
 */

import { MaestroProcessGetAllResponse } from './process.types';

/**
 * Service interface for MaestroProcessesService
 * Defines the contract that the service must implement
 */
export interface MaestroProcessesServiceModel {
  getAll(): Promise<MaestroProcessGetAllResponse[]>;
}
