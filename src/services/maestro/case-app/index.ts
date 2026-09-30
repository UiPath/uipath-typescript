/**
 * Case App Module
 *
 * @experimental
 *
 * /// warning
 * Preview: This module is experimental and may change or be removed in future releases.
 * ///
 *
 * Provides access to Maestro case instances as a case app user:
 * - `CaseApp` — list cases, read their stages, SLA, timeline and incidents, trigger ad-hoc
 *   tasks, select the next stage, and close or reopen a case
 *
 * Every call is authorized by the caller's Case persona grants rather than Orchestrator folder
 * permissions, and is scoped to the folder the case lives in.
 *
 * @example
 * ```typescript
 * import { UiPath } from '@uipath/uipath-typescript/core';
 * import { CaseApp } from '@uipath/uipath-typescript/case-app';
 *
 * const sdk = new UiPath(config);
 * await sdk.initialize();
 *
 * const caseApp = new CaseApp(sdk);
 * const stages = await caseApp.getAdhocTasks('<instanceId>', '<folderKey>');
 * await caseApp.triggerAdhocTask('<instanceId>', '<folderKey>', stages[0].tasks[0].taskName);
 * ```
 *
 * @module
 */

export { CaseAppService as CaseApp, CaseAppService } from './case-app';

export * from '../../../models/maestro/case-app.types';
export * from '../../../models/maestro/case-app.models';
export * from '../../../models/maestro/case-instances.types';
export * from '../../../models/maestro/process-incidents.types';
