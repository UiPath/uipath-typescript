/**
 * Case App service model — the ServiceModel interface that drives generated API documentation.
 */

import type {
  CaseAppAdhocTaskStage,
  CaseAppCloseOptions,
  CaseAppCloseResponse,
  CaseAppGetElementExecutionsOptions,
  CaseAppGetElementExecutionsResponse,
  CaseAppIncidentGetResponse,
  CaseAppInstanceGetAllWithPaginationOptions,
  CaseAppInstanceGetResponse,
  CaseAppSelectStageOptions,
  CaseAppSendMessageResponse,
  CaseAppGetSlaSummaryResponse,
  CaseAppGetStagesResponse,
  CaseAppTriggerAdhocTaskOptions,
} from './case-app.types';
import type {
  CaseInstanceMessageName,
  CaseInstanceOperationOptions,
  CaseInstanceOperationResponse,
  CaseInstanceSendMessageOptions,
} from './case-instances.types';
import type { HasPaginationOptions, NonPaginatedResponse, PaginatedResponse } from '../../utils/pagination';

/**
 * @experimental
 *
 * /// warning
 * Preview: This service is experimental and may change or be removed in future releases.
 * ///
 *
 * Service for working with Maestro case instances as a case app user.
 *
 * Every method is authorized by the caller's Case persona grants (e.g. `Cases.View`,
 * `Cases.RunAdhocTasks`, `Cases.Close`) rather than Orchestrator folder permissions, and every
 * method is scoped to a single folder: pass the folder the case instance lives in.
 *
 * ### Usage
 *
 * Prerequisites: Initialize the SDK first - see [Getting Started](/uipath-typescript/getting-started/#import-initialize)
 *
 * ```typescript
 * import { CaseApp } from '@uipath/uipath-typescript/case-app';
 *
 * const caseApp = new CaseApp(sdk);
 * const cases = await caseApp.getAll('<folderKey>');
 * ```
 */
export interface CaseAppServiceModel {
  /**
   * Gets the case instances in a folder that the caller's `Cases.View` grants cover.
   *
   * @experimental
   *
   * /// warning
   * Preview: This method is experimental and may change or be removed in future releases.
   * ///
   *
   * Instances are filtered after each page is fetched, so a page can hold fewer items than
   * `pageSize` — or none — while `hasNextPage` is still `true`. Keep following `nextCursor` until
   * `hasNextPage` is `false`. A caller with no grants gets an empty result.
   *
   * @param folderKey - Key of the folder to list case instances from
   * @param options - Optional filters, sorting and pagination options
   * @returns Promise resolving to {@link NonPaginatedResponse} of {@link CaseAppInstanceGetResponse}
   *          without pagination options, or {@link PaginatedResponse} of
   *          {@link CaseAppInstanceGetResponse} when pagination options are used.
   *
   * @example
   * ```typescript
   * const result = await caseApp.getAll('<folderKey>');
   * result.items.forEach(instance => console.log(instance.instanceId, instance.latestRunStatus));
   * ```
   *
   * @example
   * ```typescript
   * import { CaseAppInstanceSortBy, CaseAppSortOrder, InstanceStatus } from '@uipath/uipath-typescript/case-app';
   *
   * let page = await caseApp.getAll('<folderKey>', {
   *   processKey: '<processKey>',
   *   statuses: [InstanceStatus.RUNNING, InstanceStatus.FAULTED],
   *   startedTimeStart: new Date('2026-01-01'),
   *   sortBy: CaseAppInstanceSortBy.StartedTime,
   *   order: CaseAppSortOrder.Desc,
   *   pageSize: 50,
   * });
   *
   * while (page.hasNextPage && page.nextCursor) {
   *   page = await caseApp.getAll('<folderKey>', { cursor: page.nextCursor });
   * }
   * ```
   */
  getAll<T extends CaseAppInstanceGetAllWithPaginationOptions = CaseAppInstanceGetAllWithPaginationOptions>(
    folderKey: string,
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<CaseAppInstanceGetResponse>
      : NonPaginatedResponse<CaseAppInstanceGetResponse>
  >;

  /**
   * Gets each stage of a case instance with its latest status and runtime SLA.
   *
   * @experimental
   *
   * /// warning
   * Preview: This method is experimental and may change or be removed in future releases.
   * ///
   *
   * Requires `Cases.View`.
   *
   * @param instanceId - ID of the case instance
   * @param folderKey - Key of the folder the case instance lives in
   * @returns Promise resolving to {@link CaseAppGetStagesResponse}
   *
   * @example
   * ```typescript
   * // First, get case instances with caseApp.getAll('<folderKey>')
   * const { stages } = await caseApp.getStages('<instanceId>', '<folderKey>');
   * stages.forEach(stage => console.log(stage.name, stage.latestStatus, stage.slaStatus));
   * ```
   */
  getStages(instanceId: string, folderKey: string): Promise<CaseAppGetStagesResponse>;

  /**
   * Gets the case-level SLA summary of a case instance: its due time, SLA status and escalation state.
   *
   * @experimental
   *
   * /// warning
   * Preview: This method is experimental and may change or be removed in future releases.
   * ///
   *
   * Requires `Cases.ViewSummary` on the case; a grant on a single stage is not enough.
   *
   * @param instanceId - ID of the case instance
   * @param folderKey - Key of the folder the case instance lives in
   * @returns Promise resolving to {@link CaseAppGetSlaSummaryResponse}
   *
   * @example
   * ```typescript
   * const summary = await caseApp.getSlaSummary('<instanceId>', '<folderKey>');
   * console.log(summary.slaStatus, summary.slaDueTime);
   * ```
   */
  getSlaSummary(instanceId: string, folderKey: string): Promise<CaseAppGetSlaSummaryResponse>;

  /**
   * Gets the case plan of a case instance — the JSON document the case was designed with.
   *
   * @experimental
   *
   * /// warning
   * Preview: This method is experimental and may change or be removed in future releases.
   * ///
   *
   * Returned exactly as stored in the package, so its shape follows the case designer's schema.
   * Requires `Cases.ViewSummary` on the case.
   *
   * @param instanceId - ID of the case instance
   * @param folderKey - Key of the folder the case instance lives in
   * @returns Promise resolving to the case plan as a `Record<string, unknown>`
   *
   * @example
   * ```typescript
   * const casePlan = await caseApp.getCaseJson('<instanceId>', '<folderKey>');
   * ```
   */
  getCaseJson(instanceId: string, folderKey: string): Promise<Record<string, unknown>>;

  /**
   * Gets the element-execution timeline of a case instance, across all of its stages.
   *
   * @experimental
   *
   * /// warning
   * Preview: This method is experimental and may change or be removed in future releases.
   * ///
   *
   * Includes each element's runs, links and job keys, plus the case summary and the details
   * sections configured on the case app. Requires `Cases.ViewSummary` on the case.
   *
   * @param instanceId - ID of the case instance
   * @param folderKey - Key of the folder the case instance lives in
   * @param options - Optional element-type filter
   * @returns Promise resolving to {@link CaseAppGetElementExecutionsResponse}
   *
   * @example
   * ```typescript
   * const timeline = await caseApp.getElementExecutions('<instanceId>', '<folderKey>');
   * timeline.elementExecutions.forEach(element => console.log(element.elementName, element.status));
   * ```
   *
   * @example
   * ```typescript
   * import { CaseAppElementType } from '@uipath/uipath-typescript/case-app';
   *
   * const tasks = await caseApp.getElementExecutions('<instanceId>', '<folderKey>', {
   *   elementTypes: [CaseAppElementType.Hitl, CaseAppElementType.Agent],
   * });
   * ```
   */
  getElementExecutions(
    instanceId: string,
    folderKey: string,
    options?: CaseAppGetElementExecutionsOptions
  ): Promise<CaseAppGetElementExecutionsResponse>;

  /**
   * Gets the incidents raised on a case instance, across all of its runs.
   *
   * @experimental
   *
   * /// warning
   * Preview: This method is experimental and may change or be removed in future releases.
   * ///
   *
   * Requires `Cases.ViewSummary` on the case.
   *
   * @param instanceId - ID of the case instance
   * @param folderKey - Key of the folder the case instance lives in
   * @returns Promise resolving to an array of {@link CaseAppIncidentGetResponse}
   *
   * @example
   * ```typescript
   * const incidents = await caseApp.getIncidents('<instanceId>', '<folderKey>');
   * incidents.forEach(incident => console.log(incident.errorCode, incident.errorMessage));
   * ```
   */
  getIncidents(instanceId: string, folderKey: string): Promise<CaseAppIncidentGetResponse[]>;

  /**
   * Gets the ad-hoc tasks the caller can trigger on a running case instance, grouped by stage.
   *
   * @experimental
   *
   * /// warning
   * Preview: This method is experimental and may change or be removed in future releases.
   * ///
   *
   * Only stages the caller holds `Cases.RunAdhocTasks` on are returned, so every task listed can be
   * passed to `triggerAdhocTask`. A caller whose grants cover no ad-hoc task gets an empty array.
   *
   * @param instanceId - ID of the case instance
   * @param folderKey - Key of the folder the case instance lives in
   * @returns Promise resolving to an array of {@link CaseAppAdhocTaskStage}
   *
   * @example
   * ```typescript
   * const stages = await caseApp.getAdhocTasks('<instanceId>', '<folderKey>');
   * stages.forEach(stage => stage.tasks.forEach(task => console.log(stage.stageLabel, task.taskName)));
   * ```
   */
  getAdhocTasks(instanceId: string, folderKey: string): Promise<CaseAppAdhocTaskStage[]>;

  /**
   * Triggers one ad-hoc (manually-triggered) task on a running case instance.
   *
   * @experimental
   *
   * /// warning
   * Preview: This method is experimental and may change or be removed in future releases.
   * ///
   *
   * `taskName` is matched case-sensitively against the case plan; an unknown or non-ad-hoc name is
   * rejected as not found. Requires `Cases.RunAdhocTasks` on the stage that owns the task. Resolves
   * once the trigger is accepted, not once the task has run.
   *
   * @param instanceId - ID of the case instance
   * @param folderKey - Key of the folder the case instance lives in
   * @param taskName - Case plan name of the task, as returned by `getAdhocTasks`
   * @param options - Optional input handed to the task
   * @returns Promise resolving when the trigger is accepted
   *
   * @example
   * ```typescript
   * // First, list triggerable tasks with caseApp.getAdhocTasks('<instanceId>', '<folderKey>')
   * await caseApp.triggerAdhocTask('<instanceId>', '<folderKey>', 'Request Documents');
   * ```
   *
   * @example
   * ```typescript
   * await caseApp.triggerAdhocTask('<instanceId>', '<folderKey>', 'Request Documents', {
   *   taskInput: { reason: 'Missing proof of address' },
   * });
   * ```
   */
  triggerAdhocTask(
    instanceId: string,
    folderKey: string,
    taskName: string,
    options?: CaseAppTriggerAdhocTaskOptions
  ): Promise<void>;

  /**
   * Selects the next stage of a running case instance that is waiting for a user to choose one.
   *
   * @experimental
   *
   * /// warning
   * Preview: This method is experimental and may change or be removed in future releases.
   * ///
   *
   * `stageName` is matched case-sensitively against the case plan's stage labels; an unknown name,
   * or a stage that is not user-selectable, is rejected as not found. Requires `Cases.SelectStage`
   * on the case. Resolves once the selection is sent, not once the case has transitioned.
   *
   * @param instanceId - ID of the case instance
   * @param folderKey - Key of the folder the case instance lives in
   * @param stageName - Label of the stage to select
   * @param options - Which waiting stage receives the selection, when several are waiting
   * @returns Promise resolving when the selection is accepted
   *
   * @example
   * ```typescript
   * await caseApp.selectStage('<instanceId>', '<folderKey>', 'Review');
   * ```
   *
   * @example
   * ```typescript
   * await caseApp.selectStage('<instanceId>', '<folderKey>', 'Review', { waitingStageId: '<stageId>' });
   * ```
   */
  selectStage(
    instanceId: string,
    folderKey: string,
    stageName: string,
    options?: CaseAppSelectStageOptions
  ): Promise<void>;

  /**
   * Sends a case message (`UserAdhocTrigger` or `UserSelectStage`) to a running case instance.
   *
   * @experimental
   *
   * /// warning
   * Preview: This method is experimental and may change or be removed in future releases.
   * ///
   *
   * Prefer `triggerAdhocTask` and `selectStage`, which build the message server-side. The caller
   * must hold `Cases.RunAdhocTasks` or `Cases.SelectStage` on the targeted case.
   *
   * @param instanceId - ID of the case instance
   * @param folderKey - Key of the folder the case instance lives in
   * @param name - Message to send
   * @param options - Message payload and an optional reference overriding the default target
   * @returns Promise resolving to {@link CaseAppSendMessageResponse}
   *
   * @example
   * ```typescript
   * import { CaseInstanceMessageName } from '@uipath/uipath-typescript/case-app';
   *
   * await caseApp.sendMessage('<instanceId>', '<folderKey>', CaseInstanceMessageName.UserAdhocTrigger, {
   *   itemData: { taskNames: ['Request Documents'] },
   * });
   * ```
   */
  sendMessage(
    instanceId: string,
    folderKey: string,
    name: CaseInstanceMessageName,
    options?: CaseInstanceSendMessageOptions
  ): Promise<CaseAppSendMessageResponse>;

  /**
   * Closes a case instance.
   *
   * @experimental
   *
   * /// warning
   * Preview: This method is experimental and may change or be removed in future releases.
   * ///
   *
   * A running case reports `Canceling` and finishes cancelling asynchronously; an already-terminal
   * case returns its status unchanged. A case that has already `Completed` is rejected, since
   * closing it would prevent reopening it. Requires `Cases.Close`.
   *
   * @param instanceId - ID of the case instance
   * @param folderKey - Key of the folder the case instance lives in
   * @param options - Optional comment and operation id
   * @returns Promise resolving to {@link CaseAppCloseResponse}
   *
   * @example
   * ```typescript
   * const result = await caseApp.close('<instanceId>', '<folderKey>');
   * console.log(result.status);
   * ```
   *
   * @example
   * ```typescript
   * await caseApp.close('<instanceId>', '<folderKey>', { comment: 'Duplicate case' });
   * ```
   */
  close(instanceId: string, folderKey: string, options?: CaseAppCloseOptions): Promise<CaseAppCloseResponse>;

  /**
   * Reopens a completed case instance from a chosen case plan element.
   *
   * @experimental
   *
   * /// warning
   * Preview: This method is experimental and may change or be removed in future releases.
   * ///
   *
   * Only `Completed` cases can be reopened. Requires `Cases.Reopen`.
   *
   * @param instanceId - ID of the case instance
   * @param folderKey - Key of the folder the case instance lives in
   * @param startElementId - ID of the case plan element (e.g. a stage) to restart from
   * @param options - Optional comment
   * @returns Promise resolving to {@link CaseInstanceOperationResponse}
   *
   * @example
   * ```typescript
   * // First, get stage IDs with caseApp.getStages('<instanceId>', '<folderKey>')
   * const result = await caseApp.reopen('<instanceId>', '<folderKey>', '<stageId>');
   * ```
   *
   * @example
   * ```typescript
   * await caseApp.reopen('<instanceId>', '<folderKey>', '<stageId>', { comment: 'Customer replied' });
   * ```
   */
  reopen(
    instanceId: string,
    folderKey: string,
    startElementId: string,
    options?: CaseInstanceOperationOptions
  ): Promise<CaseInstanceOperationResponse>;
}
