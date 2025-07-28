/**
 * Maestro Process Constants
 * Constants and transformation functions for Maestro processes
 */

import { RawProcessData, MaestroProcessGetAllResponse } from './process.types';
import { groupFields } from '../../utils/api-transform';

/**
 * Mapping for process instance count fields
 */
export const MAESTRO_PROCESS_COUNT_MAPPING = {
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
} as const;

/**
 * Transforms raw API process data to SDK format
 */
export function transformMaestroProcess(raw: RawProcessData): MaestroProcessGetAllResponse {
  const transformed = groupFields(MAESTRO_PROCESS_COUNT_MAPPING, 'instanceCounts')(raw) as any;
  
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