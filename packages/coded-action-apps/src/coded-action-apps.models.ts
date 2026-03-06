import { Task, MessageSeverity, TaskCompleteResponse } from './types';

/**
 * Service for bi-directional communication between coded action apps and Action Center
 *
 * ### Usage
 *
 * ```typescript
 * import { CodedActionApps } from '@uipath/uipath-ts-coded-action-apps';
 *
 * const service = new CodedActionApps();
 * ```
 */
export interface CodedActionAppsServiceModel {

  /**
   * Notifies Action Center that the task data has been changed by the user.
   * This is needed to enable the save button in Action Center when the task data has changed
   *
   * @param data - The updated data payload to send to Action Center.
   * @example
   * ```typescript
   * // Call whenever the user modifies the form. Make sure to pass the full current task data
   * service.setTaskData({ name: 'John', approved: true, notes: 'Looks good' });
   * ```
   */
  setTaskData(data: unknown): void;

  /**
   * Marks the current task as complete in Action Center.
   * Sends the final action and associated data to Action Center,
   * signalling that the user has finished interacting with the task.
   *
   * @param actionTaken - A string identifying the action the user performed (e.g. `"Approve"`, `"Reject"`).
   * @param data - The final data payload to submit alongside the completion event.
   *
   * @returns A promise that resolves with a {@link TaskCompleteResponse} object
   *   containing success and error message if any.
   * @throws {Error} If called from an untrusted origin.
   * @throws {Error} If a completeTask call is already in progress.
   * @example
   * ```typescript
   * // Approve a task
   * const result = await service.completeTask('Approve', { approved: true, notes: 'Looks good' });
   *
   * if (!result.success) {
   *   console.error(`Failed (code ${result.errorCode}): ${result.errorMessage}`);
   * }
   *
   * // Reject a task
   * const result = await service.completeTask('Reject', { approved: false, reason: 'Missing info' });
   *
   * if (!result.success) {
   *   console.error(`Failed (code ${result.errorCode}): ${result.errorMessage}`);
   * }
   * ```
   */
  completeTask(actionTaken: string, data: unknown): Promise<TaskCompleteResponse>;

  /**
   * Displays a toast message inside Action Center.
   *
   * @param msg - The message text to display.
   * @param type - The severity/style of the message (`info`, `success`, `warning`, or `error`).
   * @example
   * ```typescript
   * import { MessageSeverity } from '@uipath/uipath-ts-coded-action-apps';
   *
   * service.showMessage('Submitted successfully', MessageSeverity.Success);
   * service.showMessage('Submission failed', MessageSeverity.Error);
   * service.showMessage('Please review the details', MessageSeverity.Warning);
   * service.showMessage('Auto-saved', MessageSeverity.Info);
   * ```
   */
  showMessage(msg: string, type: MessageSeverity): void;

  /**
   * Fetches the current opened task's details from Action Center.
   *
   * @returns A promise that resolves with a {@link Task} object
   *   containing task metadata and data.
   * @throws {Error} If called from an untrusted origin.
   * @throws {Error} If Action Center does not respond within the allotted timeout.
   * @example
   * ```typescript
   * // Call once when the app loads
   * const task = await service.getTask();
   *
   * console.log(task.taskId);     // number
   * console.log(task.title);      // string
   * console.log(task.status);     // TaskStatus enum
   * console.log(task.isReadOnly); // boolean — disable editing if true
   * console.log(task.data);       // the task's form data
   * console.log(task.folderId);   // number
   * console.log(task.folderName); // string
   * console.log(task.theme);      // Theme enum — current Action Center UI theme
   *
   * // Disable the form when task is read-only
   * if (task.isReadOnly) {
   *   disableForm();
   * }
   * ```
   */
  getTask(): Promise<Task>;
}
