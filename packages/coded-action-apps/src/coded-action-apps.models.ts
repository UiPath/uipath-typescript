import { ActionCenterData, MessageTypes } from './types';

/**
 * Service for bi-directional communication between coded action apps and Action Center
 */
export interface CodedActionAppsServiceModel {

  /**
   * Notifies Action Center that the task data has been changed by the user.
   * This is needed to enable the save button in Action Center when the task data has changed
   *
   * @param data - The updated data payload to send to Action Center.
   */
  notifyDataChangedToActionCenter(data: unknown): void;

  /**
   * Marks the current task as complete in Action Center.
   * Sends the final action and associated data to Action Center,
   * signalling that the user has finished interacting with the task.
   *
   * @param actionTaken - A string identifying the action the user performed (e.g. `"Approve"`, `"Reject"`).
   * @param data - The final data payload to submit alongside the completion event.
   */
  completeTaskInActionCenter(actionTaken: string, data: unknown): void;

  /**
   * Displays a toast message inside Action Center.
   *
   * @param msg - The message text to display.
   * @param type - The severity/style of the message (`info`, `success`, `warning`, or `error`).
   */
  displayMessageInActionCenter(msg: string, type: MessageTypes): void;

  /**
   * Fetches the current opened task's details from Action Center.
   *
   * @returns A promise that resolves with a {@link ActionCenterData} object
   *   containing task metadata and data.
   * @throws {Error} If called from an untrusted origin.
   * @throws {Error} If Action Center does not respond within the allotted timeout.
   */
  getTaskDetailsFromActionCenter(): Promise<ActionCenterData>;
}
