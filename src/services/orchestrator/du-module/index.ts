/**
 * Orchestrator DU Module Service
 *
 * Provides access to UiPath Orchestrator's Document Understanding module operations
 * such as submitting exception reports against validation tasks and processing
 * extracted data against a taxonomy.
 *
 * @example
 * ```typescript
 * import { UiPath } from '@uipath/uipath-typescript/core';
 * import { OrchestratorDuModule } from '@uipath/uipath-typescript/orchestrator-du-module';
 *
 * const sdk = new UiPath(config);
 * await sdk.initialize();
 *
 * const orchestratorDuModule = new OrchestratorDuModule(sdk);
 * const result = await orchestratorDuModule.submitExceptionReport(<taskId>, '<documentId>', '<reason>', { folderKey: '<folderKey>' });
 * ```
 *
 * @module
 */

export {
  OrchestratorDuModuleService as OrchestratorDuModule,
  OrchestratorDuModuleService,
} from './orchestrator-du-module';

export * from '../../../models/orchestrator/orchestrator-du-module.types';
export * from '../../../models/orchestrator/orchestrator-du-module.models';
