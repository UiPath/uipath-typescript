/**
 * UiPath TypeScript SDK
 * 
 * A TypeScript SDK that enables programmatic interaction with UiPath Cloud Platform services
 * including processes, assets, buckets, context grounding, data services, jobs, and more.
 */

// Export core functionality
export { UiPath } from './uipath';
export type { Config } from './core/config/config';

// Process Instance Models
// export {
//   // Schemas for validation
//   SpanSchema,
//   SourceEnum,
//   StatusEnum,
//   InstanceCancelRequestSchema,
//   InstancePauseRequestSchema,
//   InstanceResumeRequestSchema,
//   InstancesStatusResponseSchema,
//   GetInstanceResponseSchema,
//   GetAllInstancesResponseSchema,
// } from './models/processInstance';

// Process Instance Types
// export type {
//   Source,
//   Status,
//   Span,
//   InstanceCancelRequest,
//   InstancePauseRequest,
//   InstanceResumeRequest,
//   InstancesStatusResponse,
//   GetInstanceResponse,
//   GetAllInstancesResponse,
//   PaginationParams,
//   GetInstancesQueryParams
// } from './models/processInstance';



export type { RequestSpec } from './models/common/requestSpec';

