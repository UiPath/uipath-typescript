import {
  RawCaseInstanceGetResponse,
  CaseInstanceGetAllWithPaginationOptions,
  CaseInstanceOperationOptions,
  CaseInstanceOperationResponse,
  CaseInstanceReopenOptions,
  CaseInstanceSendMessageOptions,
  CaseGetStageResponse,
  CaseInstanceExecutionHistoryResponse,
  SlaSummaryResponse,
  CaseInstanceSlaSummaryOptions,
  CaseInstanceStageSLAResponse,
  CaseInstanceStageSLAOptions,
  CaseInstanceGetVariablesOptions,
  CaseInstanceGetVariablesResponse,
  CaseInstanceMessageName,
} from './case-instances.types';
import type {
  CaseAppAdhocTaskStage,
  CaseAppCloseOptions,
  CaseAppCloseResponse,
  CaseAppGetElementExecutionsOptions,
  CaseAppGetElementExecutionsResponse,
  CaseAppGetSlaSummaryResponse,
  CaseAppGetStagesResponse,
  CaseAppIncidentGetResponse,
  CaseAppInstanceGetAllWithPaginationOptions,
  CaseAppInstanceGetResponse,
  CaseAppSelectStageOptions,
  CaseAppSendMessageResponse,
  CaseAppTriggerAdhocTaskOptions,
} from './case-app.types';
import { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../../utils/pagination';
import { OperationResponse } from '../common/types';
import { TaskGetResponse, TaskGetAllOptions } from '../action-center';

/**
 * Service model for managing Maestro Case Instances
 *
 * Maestro case instances are the running instances of Maestro cases.
 *
 * ### Usage
 *
 * Prerequisites: Initialize the SDK first - see [Getting Started](/uipath-typescript/getting-started/#import-initialize)
 *
 * ```typescript
 * import { CaseInstances } from '@uipath/uipath-typescript/cases';
 *
 * const caseInstances = new CaseInstances(sdk);
 * const allInstances = await caseInstances.getAll();
 * ```
 *
 * Methods ending in `ForCaseApp` (experimental) call the Case App routes, which authorize by the
 * caller's Case persona grants rather than Orchestrator folder permissions and are scoped to a
 * single folder.
 *
 * !!! note
 *     Methods that rely on the Insights Real-Time Monitoring service (`getSlaSummary`, `getStagesSlaSummary`)
 *     may have up to ~1 minute latency before reflecting the latest updates. See
 *     [Real-Time Monitoring Overview](https://docs.uipath.com/insights/automation-cloud/latest/user-guide/real-time-monitoring-overview) for details.
 */
export interface CaseInstancesServiceModel {
  /**
   * Get all case instances with optional filtering and pagination
   * 
   * @param options Query parameters for filtering instances and pagination
   * @returns Promise resolving to either an array of case instances NonPaginatedResponse<CaseInstanceGetResponse> or a PaginatedResponse<CaseInstanceGetResponse> when pagination options are used.
   * {@link CaseInstanceGetResponse}
   * @example
   * ```typescript
   * // Get all case instances (non-paginated)
   * const instances = await caseInstances.getAll();
   *
   * // Cancel/Close faulted instances using methods directly on instances
   * for (const instance of instances.items) {
   *   if (instance.latestRunStatus === 'Faulted') {
   *     await instance.close({ comment: 'Closing faulted case instance' });
   *   }
   * }
   *
   * // With filtering
   * const filteredInstances = await caseInstances.getAll({
   *   processKey: 'MyCaseProcess'
   * });
   *
   * // First page with pagination
   * const page1 = await caseInstances.getAll({ pageSize: 10 });
   *
   * // Navigate using cursor
   * if (page1.hasNextPage) {
   *   const page2 = await caseInstances.getAll({ cursor: page1.nextCursor });
   * }
   * ```
   */
  getAll<T extends CaseInstanceGetAllWithPaginationOptions = CaseInstanceGetAllWithPaginationOptions>(
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<CaseInstanceGetResponse>
      : NonPaginatedResponse<CaseInstanceGetResponse>
  >;

  /**
   * Get a specific case instance by ID
   * @param instanceId - The case instance ID
   * @param folderKey - Required folder key
   * @returns Promise resolving to case instance with methods
   * {@link CaseInstanceGetResponse}
   * @example
   * ```typescript
   * // Get a specific case instance
   * const instance = await caseInstances.getById(
   *   <instanceId>,
   *   <folderKey>
   * );
   *
   * // Access instance properties
   * console.log(`Status: ${instance.latestRunStatus}`);
   * ```
   */
  getById(instanceId: string, folderKey: string): Promise<CaseInstanceGetResponse>;

  /**
   * Close/Cancel a case instance
   * @param instanceId - The ID of the instance to cancel
   * @param folderKey - Required folder key
   * @param options - Optional close options with comment
   * @returns Promise resolving to operation result with instance data
   * @example
   * ```typescript
   * // Close a case instance
   * const result = await caseInstances.close(
   *   <instanceId>,
   *   <folderKey>
   * );
   *
   * // Or using instance method
   * const instance = await caseInstances.getById(
   *   <instanceId>,
   *   <folderKey>
   * );
   * const result = await instance.close();
   *
   * console.log(`Closed: ${result.success}`);
   *
   * // Close with a comment
   * const resultWithComment = await instance.close({
   *   comment: 'Closing due to invalid input data'
   * });
   *
   * if (resultWithComment.success) {
   *   console.log(`Instance ${resultWithComment.data.instanceId} status: ${resultWithComment.data.status}`);
   * }
   * ```
   */
  close(instanceId: string, folderKey: string, options?: CaseInstanceOperationOptions): Promise<OperationResponse<CaseInstanceOperationResponse>>;

  /**
   * Pause a case instance
   * @param instanceId - The ID of the instance to pause
   * @param folderKey - Required folder key
   * @param options - Optional pause options with comment
   * @returns Promise resolving to operation result with instance data
   */
  pause(instanceId: string, folderKey: string, options?: CaseInstanceOperationOptions): Promise<OperationResponse<CaseInstanceOperationResponse>>;

  /**
   * Reopen a case instance from a specified element
   * @param instanceId - The ID of the case instance
   * @param folderKey - Required folder key
   * @param options - Reopen options containing stageId (the stage ID to resume from) and an optional comment
   * @returns Promise resolving to operation result with instance data
   * {@link CaseInstanceOperationResponse}
   * @example
   * ```typescript
   * import { CaseInstances } from '@uipath/uipath-typescript/cases';
   *
   * const caseInstances = new CaseInstances(sdk);
   *
   * // First, get the available stages for the case instance
   * const stages = await caseInstances.getStages('<instanceId>', '<folderKey>');
   * const stageId = stages[0].id; // Select the stage to reopen from
   *
   * // Reopen a case instance from a specific stage
   * const result = await caseInstances.reopen(
   *   '<instanceId>',
   *   '<folderKey>',
   *   { stageId }
   * );
   *
   * // Reopen with a comment
   * const result = await caseInstances.reopen(
   *   '<instanceId>',
   *   '<folderKey>',
   *   { stageId, comment: 'Reopening to retry failed stage' }
   * );
   *
   * // Or using instance method
   * const instance = await caseInstances.getById('<instanceId>', '<folderKey>');
   * const stages = await instance.getStages();
   * const result = await instance.reopen({ stageId: stages[0].id });
   * ```
   */
  reopen(instanceId: string, folderKey: string, options: CaseInstanceReopenOptions): Promise<OperationResponse<CaseInstanceOperationResponse>>;

  /**
   * Resume a case instance
   * @param instanceId - The ID of the instance to resume
   * @param folderKey - Required folder key
   * @param options - Optional resume options with comment
   * @returns Promise resolving to operation result with instance data
   */
  resume(instanceId: string, folderKey: string, options?: CaseInstanceOperationOptions): Promise<OperationResponse<CaseInstanceOperationResponse>>;

  /**
   * Send a message to a running case instance
   *
   * Messages resolve wait points in the case — selecting the next stage when the case
   * is waiting for a user to choose one, or starting a manually-triggered (ad-hoc) case task.
   *
   * @param instanceId - The ID of the case instance to send the message to
   * @param folderKey - Required folder key
   * @param name - The message name — a well-known `CaseInstanceMessageName` or a custom message name defined in the case model
   * @param options - Optional message options with itemData payload and reference override
   * @returns Promise that resolves when the message is accepted
   * @example
   * ```typescript
   * import { CaseInstances, CaseInstanceMessageName } from '@uipath/uipath-typescript/cases';
   *
   * const caseInstances = new CaseInstances(sdk);
   *
   * // Select the next stage when the case is waiting for a user to choose one
   * await caseInstances.sendMessage(
   *   '<instanceId>',
   *   '<folderKey>',
   *   CaseInstanceMessageName.UserSelectStage,
   *   { itemData: { stageName: 'Review' } }
   * );
   *
   * // Start a manually-triggered (ad-hoc) case task
   * await caseInstances.sendMessage(
   *   '<instanceId>',
   *   '<folderKey>',
   *   CaseInstanceMessageName.UserAdhocTrigger,
   *   { itemData: { taskNames: ['Approve Invoice'] } }
   * );
   *
   * // Or using instance method
   * const instance = await caseInstances.getById('<instanceId>', '<folderKey>');
   * await instance.sendMessage(
   *   CaseInstanceMessageName.UserAdhocTrigger,
   *   { itemData: { taskNames: ['Approve Invoice'] } }
   * );
   * ```
   */
  sendMessage(instanceId: string, folderKey: string, name: string, options?: CaseInstanceSendMessageOptions): Promise<void>;

  /**
   * Get execution history for a case instance
   * @param instanceId - The ID of the case instance
   * @param folderKey - Required folder key
   * @returns Promise resolving to instance execution history
   * {@link CaseInstanceExecutionHistoryResponse}
   * @example
   * ```typescript
   * // Get execution history for a case instance
   * const history = await caseInstances.getExecutionHistory(
   *   <instanceId>,
   *   <folderKey>
   * );
   *
   * // Access element executions
   * if (history.elementExecutions) {
   *   for (const execution of history.elementExecutions) {
   *     console.log(`Element: ${execution.elementName} - Status: ${execution.status}`);
   *   }
   * }
   * ```
   */
  getExecutionHistory(
    instanceId: string, 
    folderKey: string
  ): Promise<CaseInstanceExecutionHistoryResponse>;

  /**
   * Get stages and its associated tasks information for a case instance 
   * @param caseInstanceId - The ID of the case instance
   * @param folderKey - Required folder key
   * @returns Promise resolving to an array of case stages with their tasks and status
   * @example
   * ```typescript
   * // Get stages for a case instance
   * const stages = await caseInstances.getStages(
   *   <caseInstanceId>,
   *   <folderKey>
   * );
   *
   * // Iterate through stages
   * for (const stage of stages) {
   *   console.log(`Stage: ${stage.name} - Status: ${stage.status}`);
   *
   *   // Check tasks in the stage
   *   for (const taskGroup of stage.tasks) {
   *     for (const task of taskGroup) {
   *       console.log(`  Task: ${task.name} - Status: ${task.status}`);
   *     }
   *   }
   * }
   * ```
   */
  getStages(caseInstanceId: string, folderKey: string): Promise<CaseGetStageResponse[]>;

  /**
   * Get human in the loop tasks associated with a case instance
   * 
   * The method returns either:
   * - An array of tasks (when no pagination parameters are provided)
   * - A paginated result with navigation cursors (when any pagination parameter is provided)
   * 
   * @param caseInstanceId - The ID of the case instance
   * @param options - Optional filtering and pagination options
   * @returns Promise resolving to human in the loop tasks associated with the case instance
   * @example
   * ```typescript
   * // Get all tasks for a case instance (non-paginated)
   * const actionTasks = await caseInstances.getActionTasks(
   *   <caseInstanceId>,
   * );
   *
   * // First page with pagination
   * const page1 = await caseInstances.getActionTasks(
   *   <caseInstanceId>,
   *   { pageSize: 10 }
   * );
   * // Iterate through tasks
   * for (const task of page1.items) {
   *   console.log(`Task: ${task.title}`);
   *   console.log(`Task: ${task.status}`);
   * }
   *
   * // Jump to specific page
   * const page5 = await caseInstances.getActionTasks(
   *   <caseInstanceId>,
   *   {
   *     jumpToPage: 5,
   *     pageSize: 10
   *   }
   * );
   * ```
   */
  getActionTasks<T extends TaskGetAllOptions = TaskGetAllOptions>(
    caseInstanceId: string,
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<TaskGetResponse>
      : NonPaginatedResponse<TaskGetResponse>
  >;

  /**
   * Get SLA summary for all case instances across folders.
   *
   * Returns SLA status, due times, escalation info, and instance metadata for each case instance.
   * The default page size is 50, so only the top 50 items are returned when no pagination options are provided.
   *
   * @param options - Optional filtering and pagination options
   * @returns Promise resolving to {@link SlaSummaryResponse}, paginated or non-paginated based on options
   * @example
   * ```typescript
   * // Non-paginated (returns top 50 items by default)
   * const summary = await caseInstances.getSlaSummary();
   * console.log(`Found ${summary.totalCount} cases`);
   *
   * // Filter by case instance ID
   * const filtered = await caseInstances.getSlaSummary({
   *   caseInstanceId: '<caseInstanceId>'
   * });
   *
   * // Filter by time range
   * const timeFiltered = await caseInstances.getSlaSummary({
   *   startTimeUtc: new Date('2026-01-01'),
   *   endTimeUtc: new Date('2026-01-31')
   * });
   *
   * // With pagination
   * const page1 = await caseInstances.getSlaSummary({ pageSize: 25 });
   * if (page1.hasNextPage) {
   *   const page2 = await caseInstances.getSlaSummary({ cursor: page1.nextCursor });
   * }
   *
   * // Jump to specific page
   * const page3 = await caseInstances.getSlaSummary({ jumpToPage: 3, pageSize: 25 });
   * ```
   */
  getSlaSummary<T extends CaseInstanceSlaSummaryOptions = CaseInstanceSlaSummaryOptions>(
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<SlaSummaryResponse>
      : NonPaginatedResponse<SlaSummaryResponse>
  >;

  /**
   * Get stages SLA summary for case instances across folders.
   *
   * Returns stage-level SLA status and escalation information for each case instance, aggregated from Insights Real-Time Monitoring.
   *
   * @param options - Optional filtering options
   * @returns Promise resolving to an array of {@link CaseInstanceStageSLAResponse}
   * @example
   * ```typescript
   * // Get stages SLA summary for all case instances
   * const stagesSla = await caseInstances.getStagesSlaSummary();
   * for (const item of stagesSla) {
   *   console.log(`Instance: ${item.caseInstanceId}`);
   *   for (const stage of item.stages) {
   *     console.log(`  Stage: ${stage.name} - SLA Status: ${stage.slaStatus}, Due: ${stage.slaDueTime}`);
   *   }
   * }
   *
   * // Filter by case instance ID
   * const filtered = await caseInstances.getStagesSlaSummary({
   *   caseInstanceId: '<caseInstanceId>'
   * });
   *
   * // Using bound method on a case instance
   * const instance = await caseInstances.getById('<instanceId>', '<folderKey>');
   * const stagesSla = await instance.getStagesSlaSummary();
   * ```
   */
  getStagesSlaSummary(options?: CaseInstanceStageSLAOptions): Promise<CaseInstanceStageSLAResponse[]>;

  /**
   * Get global variables for a case instance
   *
   * Returns the case instance's elements with their inputs/outputs and the global variables
   * enriched with metadata (name, type, source element) parsed from the case's BPMN definition.
   *
   * @param instanceId The ID of the case instance to get variables for
   * @param folderKey The folder key for authorization
   * @param options Optional options including parentElementId to filter by parent element
   * @returns Promise resolving to {@link CaseInstanceGetVariablesResponse} with elements and enriched global variables
   * @example
   * ```typescript
   * // Get all variables for a case instance
   * const variables = await caseInstances.getVariables(
   *   '<instanceId>',
   *   '<folderKey>'
   * );
   *
   * // Iterate through global variables with metadata
   * variables.globalVariables.forEach(variable => {
   *   console.log(`Variable: ${variable.name} (${variable.id})`);
   *   console.log(`  Type: ${variable.type}`);
   *   console.log(`  Value: ${variable.value}`);
   * });
   *
   * // Get variables scoped to a specific parent element (e.g. a stage)
   * const stageVariables = await caseInstances.getVariables(
   *   '<instanceId>',
   *   '<folderKey>',
   *   { parentElementId: '<parentElementId>' }
   * );
   *
   * // Or using the bound method on a retrieved instance
   * const instance = await caseInstances.getById('<instanceId>', '<folderKey>');
   * const instanceVariables = await instance.getVariables();
   * ```
   */
  getVariables(instanceId: string, folderKey: string, options?: CaseInstanceGetVariablesOptions): Promise<CaseInstanceGetVariablesResponse>;

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
   * const result = await caseInstances.getAllForCaseApp('<folderKey>');
   * result.items.forEach(instance => console.log(instance.instanceId, instance.latestRunStatus));
   * ```
   *
   * @example
   * ```typescript
   * import { CaseAppInstanceSortBy, CaseAppSortOrder, InstanceStatus } from '@uipath/uipath-typescript/cases';
   *
   * let page = await caseInstances.getAllForCaseApp('<folderKey>', {
   *   processKey: '<processKey>',
   *   statuses: [InstanceStatus.RUNNING, InstanceStatus.FAULTED],
   *   startedTimeStart: new Date('2026-01-01'),
   *   sortBy: CaseAppInstanceSortBy.StartedTime,
   *   order: CaseAppSortOrder.Desc,
   *   pageSize: 50,
   * });
   *
   * while (page.hasNextPage && page.nextCursor) {
   *   page = await caseInstances.getAllForCaseApp('<folderKey>', { cursor: page.nextCursor });
   * }
   * ```
   */
  getAllForCaseApp<T extends CaseAppInstanceGetAllWithPaginationOptions = CaseAppInstanceGetAllWithPaginationOptions>(
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
   * // First, get case instances with caseInstances.getAllForCaseApp('<folderKey>')
   * const { stages } = await caseInstances.getStagesForCaseApp('<instanceId>', '<folderKey>');
   * stages.forEach(stage => console.log(stage.name, stage.latestStatus, stage.slaStatus));
   * ```
   */
  getStagesForCaseApp(instanceId: string, folderKey: string): Promise<CaseAppGetStagesResponse>;

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
   * const summary = await caseInstances.getSlaSummaryForCaseApp('<instanceId>', '<folderKey>');
   * console.log(summary.slaStatus, summary.slaDueTime);
   * ```
   */
  getSlaSummaryForCaseApp(instanceId: string, folderKey: string): Promise<CaseAppGetSlaSummaryResponse>;

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
   * const casePlan = await caseInstances.getCaseJsonForCaseApp('<instanceId>', '<folderKey>');
   * ```
   */
  getCaseJsonForCaseApp(instanceId: string, folderKey: string): Promise<Record<string, unknown>>;

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
   * const timeline = await caseInstances.getElementExecutionsForCaseApp('<instanceId>', '<folderKey>');
   * timeline.elementExecutions.forEach(element => console.log(element.elementName, element.status));
   * ```
   *
   * @example
   * ```typescript
   * import { CaseAppElementType } from '@uipath/uipath-typescript/cases';
   *
   * const tasks = await caseInstances.getElementExecutionsForCaseApp('<instanceId>', '<folderKey>', {
   *   elementTypes: [CaseAppElementType.Hitl, CaseAppElementType.Agent],
   * });
   * ```
   */
  getElementExecutionsForCaseApp(
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
   * const incidents = await caseInstances.getIncidentsForCaseApp('<instanceId>', '<folderKey>');
   * incidents.forEach(incident => console.log(incident.errorCode, incident.errorMessage));
   * ```
   */
  getIncidentsForCaseApp(instanceId: string, folderKey: string): Promise<CaseAppIncidentGetResponse[]>;

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
   * passed to `triggerAdhocTaskForCaseApp`. A caller whose grants cover no ad-hoc task gets an empty array.
   *
   * @param instanceId - ID of the case instance
   * @param folderKey - Key of the folder the case instance lives in
   * @returns Promise resolving to an array of {@link CaseAppAdhocTaskStage}
   *
   * @example
   * ```typescript
   * const stages = await caseInstances.getAdhocTasksForCaseApp('<instanceId>', '<folderKey>');
   * stages.forEach(stage => stage.tasks.forEach(task => console.log(stage.stageLabel, task.taskName)));
   * ```
   */
  getAdhocTasksForCaseApp(instanceId: string, folderKey: string): Promise<CaseAppAdhocTaskStage[]>;

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
   * @param taskName - Case plan name of the task, as returned by `getAdhocTasksForCaseApp`
   * @param options - Optional input handed to the task
   * @returns Promise resolving when the trigger is accepted
   *
   * @example
   * ```typescript
   * // First, list triggerable tasks with caseInstances.getAdhocTasksForCaseApp('<instanceId>', '<folderKey>')
   * await caseInstances.triggerAdhocTaskForCaseApp('<instanceId>', '<folderKey>', 'Request Documents');
   * ```
   *
   * @example
   * ```typescript
   * await caseInstances.triggerAdhocTaskForCaseApp('<instanceId>', '<folderKey>', 'Request Documents', {
   *   taskInput: { reason: 'Missing proof of address' },
   * });
   * ```
   */
  triggerAdhocTaskForCaseApp(
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
   * await caseInstances.selectStageForCaseApp('<instanceId>', '<folderKey>', 'Review');
   * ```
   *
   * @example
   * ```typescript
   * await caseInstances.selectStageForCaseApp('<instanceId>', '<folderKey>', 'Review', { waitingStageId: '<stageId>' });
   * ```
   */
  selectStageForCaseApp(
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
   * Prefer `triggerAdhocTaskForCaseApp` and `selectStageForCaseApp`, which build the message server-side. The caller
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
   * import { CaseInstanceMessageName } from '@uipath/uipath-typescript/cases';
   *
   * await caseInstances.sendMessageForCaseApp('<instanceId>', '<folderKey>', CaseInstanceMessageName.UserAdhocTrigger, {
   *   itemData: { taskNames: ['Request Documents'] },
   * });
   * ```
   */
  sendMessageForCaseApp(
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
   * const result = await caseInstances.closeForCaseApp('<instanceId>', '<folderKey>');
   * console.log(result.status);
   * ```
   *
   * @example
   * ```typescript
   * await caseInstances.closeForCaseApp('<instanceId>', '<folderKey>', { comment: 'Duplicate case' });
   * ```
   */
  closeForCaseApp(instanceId: string, folderKey: string, options?: CaseAppCloseOptions): Promise<CaseAppCloseResponse>;

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
   * // First, get stage IDs with caseInstances.getStagesForCaseApp('<instanceId>', '<folderKey>')
   * const result = await caseInstances.reopenForCaseApp('<instanceId>', '<folderKey>', '<stageId>');
   * ```
   *
   * @example
   * ```typescript
   * await caseInstances.reopenForCaseApp('<instanceId>', '<folderKey>', '<stageId>', { comment: 'Customer replied' });
   * ```
   */
  reopenForCaseApp(
    instanceId: string,
    folderKey: string,
    startElementId: string,
    options?: CaseInstanceOperationOptions
  ): Promise<CaseInstanceOperationResponse>;
}

// Method interface that will be added to case instance objects
export interface CaseInstanceMethods {
  /**
   * Closes/cancels this case instance
   * 
   * @param options - Optional close options with comment
   * @returns Promise resolving to operation result
   */
  close(options?: CaseInstanceOperationOptions): Promise<OperationResponse<CaseInstanceOperationResponse>>;

  /**
   * Pauses this case instance
   *
   * @param options - Optional pause options with comment
   * @returns Promise resolving to operation result
   */
  pause(options?: CaseInstanceOperationOptions): Promise<OperationResponse<CaseInstanceOperationResponse>>;

  /**
   * Reopens this case instance from a specified element
   *
   * @param options - Reopen options containing stageId (the stage ID to resume from) and an optional comment
   * @returns Promise resolving to operation result
   */
  reopen(options: CaseInstanceReopenOptions): Promise<OperationResponse<CaseInstanceOperationResponse>>;

  /**
   * Resumes this case instance
   *
   * @param options - Optional resume options with comment
   * @returns Promise resolving to operation result
   */
  resume(options?: CaseInstanceOperationOptions): Promise<OperationResponse<CaseInstanceOperationResponse>>;

  /**
   * Sends a message to this case instance
   *
   * @param name - The message name — a well-known `CaseInstanceMessageName` or a custom message name defined in the case model
   * @param options - Optional message options with itemData payload and reference override
   * @returns Promise that resolves when the message is accepted
   */
  sendMessage(name: string, options?: CaseInstanceSendMessageOptions): Promise<void>;

  /**
   * Gets execution history for this case instance
   *
   * @returns Promise resolving to instance execution history
   */
  getExecutionHistory(): Promise<CaseInstanceExecutionHistoryResponse>;

  /**
   * Gets stages and their associated tasks for this case instance
   *
   * @returns Promise resolving to an array of case stages with their tasks and status
   */
  getStages(): Promise<CaseGetStageResponse[]>;

  /**
   * Gets human in the loop tasks associated with this case instance
   *
   * @param options - Optional filtering and pagination options
   * @returns Promise resolving to human in the loop tasks associated with the case instance
   */
  getActionTasks<T extends TaskGetAllOptions = TaskGetAllOptions>(
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<TaskGetResponse>
      : NonPaginatedResponse<TaskGetResponse>
  >;

  /**
   * Gets the SLA summary for this case instance.
   * The default page size is 50, so only the top 50 items are returned when no pagination options are provided.
   *
   * @param options - Optional time range filtering and pagination options
   * @returns Promise resolving to SLA summary items for this case instance
   */
  getSlaSummary<T extends Omit<CaseInstanceSlaSummaryOptions, 'caseInstanceId'> = Omit<CaseInstanceSlaSummaryOptions, 'caseInstanceId'>>(
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<SlaSummaryResponse>
      : NonPaginatedResponse<SlaSummaryResponse>
  >;

  /**
   * Gets the stages SLA summary for this case instance.
   *
   * @returns Promise resolving to an array of stage SLA summary items for this case instance
   */
  getStagesSlaSummary(): Promise<CaseInstanceStageSLAResponse[]>;

  /**
   * Gets global variables for this case instance
   *
   * @param options - Optional options including parentElementId to filter by parent element
   * @returns Promise resolving to variables response with elements and enriched global variables
   */
  getVariables(options?: CaseInstanceGetVariablesOptions): Promise<CaseInstanceGetVariablesResponse>;
}

// Combined type for case instance data with methods
export type CaseInstanceGetResponse = RawCaseInstanceGetResponse & CaseInstanceMethods;

/**
 * Creates methods for a case instance
 * 
 * @param instanceData - The case instance data (response from API)
 * @param service - The case instance service instance
 * @returns Object containing case instance methods
 */
function createCaseInstanceMethods(instanceData: RawCaseInstanceGetResponse, service: CaseInstancesServiceModel): CaseInstanceMethods {
  return {
    async close(options?: CaseInstanceOperationOptions): Promise<OperationResponse<CaseInstanceOperationResponse>> {
      if (!instanceData.instanceId) throw new Error('Case instance ID is undefined');
      if (!instanceData.folderKey) throw new Error('Case instance folder key is undefined');
      
      return service.close(instanceData.instanceId, instanceData.folderKey, options);
    },
    
    async pause(options?: CaseInstanceOperationOptions): Promise<OperationResponse<CaseInstanceOperationResponse>> {
      if (!instanceData.instanceId) throw new Error('Case instance ID is undefined');
      if (!instanceData.folderKey) throw new Error('Case instance folder key is undefined');

      return service.pause(instanceData.instanceId, instanceData.folderKey, options);
    },

    async reopen(options: CaseInstanceReopenOptions): Promise<OperationResponse<CaseInstanceOperationResponse>> {
      if (!instanceData.instanceId) throw new Error('Case instance ID is undefined');
      if (!instanceData.folderKey) throw new Error('Case instance folder key is undefined');

      return service.reopen(instanceData.instanceId, instanceData.folderKey, options);
    },

    async resume(options?: CaseInstanceOperationOptions): Promise<OperationResponse<CaseInstanceOperationResponse>> {
      if (!instanceData.instanceId) throw new Error('Case instance ID is undefined');
      if (!instanceData.folderKey) throw new Error('Case instance folder key is undefined');

      return service.resume(instanceData.instanceId, instanceData.folderKey, options);
    },

    async sendMessage(name: string, options?: CaseInstanceSendMessageOptions): Promise<void> {
      if (!instanceData.instanceId) throw new Error('Case instance ID is undefined');
      if (!instanceData.folderKey) throw new Error('Case instance folder key is undefined');

      return service.sendMessage(instanceData.instanceId, instanceData.folderKey, name, options);
    },

    async getExecutionHistory(): Promise<CaseInstanceExecutionHistoryResponse> {
      if (!instanceData.instanceId) throw new Error('Case instance ID is undefined');
      if (!instanceData.folderKey) throw new Error('Case instance folder key is undefined');

      return service.getExecutionHistory(instanceData.instanceId, instanceData.folderKey);
    },

    async getStages(): Promise<CaseGetStageResponse[]> {
      if (!instanceData.instanceId) throw new Error('Case instance ID is undefined');
      if (!instanceData.folderKey) throw new Error('Case instance folder key is undefined');

      return service.getStages(instanceData.instanceId, instanceData.folderKey);
    },

    async getActionTasks<T extends TaskGetAllOptions = TaskGetAllOptions>(
      options?: T
    ): Promise<
      T extends HasPaginationOptions<T>
        ? PaginatedResponse<TaskGetResponse>
        : NonPaginatedResponse<TaskGetResponse>
    > {
      if (!instanceData.instanceId) throw new Error('Case instance ID is undefined');

      return service.getActionTasks(instanceData.instanceId, options);
    },

    async getSlaSummary<T extends Omit<CaseInstanceSlaSummaryOptions, 'caseInstanceId'> = Omit<CaseInstanceSlaSummaryOptions, 'caseInstanceId'>>(
      options?: T
    ): Promise<
      T extends HasPaginationOptions<T>
        ? PaginatedResponse<SlaSummaryResponse>
        : NonPaginatedResponse<SlaSummaryResponse>
    > {
      if (!instanceData.instanceId) throw new Error('Case instance ID is undefined');

      return service.getSlaSummary({ ...options, caseInstanceId: instanceData.instanceId } as CaseInstanceSlaSummaryOptions) as any;
    },

    async getStagesSlaSummary(): Promise<CaseInstanceStageSLAResponse[]> {
      if (!instanceData.instanceId) throw new Error('Case instance ID is undefined');

      return service.getStagesSlaSummary({ caseInstanceId: instanceData.instanceId });
    },

    async getVariables(options?: CaseInstanceGetVariablesOptions): Promise<CaseInstanceGetVariablesResponse> {
      if (!instanceData.instanceId) throw new Error('Case instance ID is undefined');
      if (!instanceData.folderKey) throw new Error('Case instance folder key is undefined');

      return service.getVariables(instanceData.instanceId, instanceData.folderKey, options);
    }
  };
}

/**
 * Creates an actionable case instance by combining API case instance data with operational methods.
 * 
 * @param instanceData - The case instance data from API
 * @param service - The case instance service instance
 * @returns A case instance object with added methods
 */
export function createCaseInstanceWithMethods(
  instanceData: RawCaseInstanceGetResponse, 
  service: CaseInstancesServiceModel
): CaseInstanceGetResponse {
  const methods = createCaseInstanceMethods(instanceData, service);
  return Object.assign({}, instanceData, methods) as CaseInstanceGetResponse;
}