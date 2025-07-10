/**
 * UiPath TypeScript SDK
 * 
 * A TypeScript SDK that enables programmatic interaction with UiPath Cloud Platform services
 * including processes, assets, buckets, context grounding, data services, jobs, and more.
 */

// Export core functionality
export { UiPath } from './uipath';
export type { Config } from './core/config/config';

// Export all models
export * from './models/common';
export * from './models/dataFabric';
export * from './models/maestro';
export * from './models/case';
export * from './models/orchestrator';

// Export specific common types
export type { RequestSpec } from './models/common/requestSpec';

