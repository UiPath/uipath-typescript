import {
  Task,
  MessageSeverity,
  TaskCompleteResponse,
} from './types';
import { CodedActionAppsServiceModel } from './coded-action-apps.models';
import { ActionCenterEventNames, ActionCenterEventResponsePayload } from './types.internal';

const INIT_TIMEOUT = 3000;

/**
 * Service for bi-directional communication between coded action apps and Action Center
 */
export class CodedActionAppsService implements CodedActionAppsServiceModel {
  private readonly parentOrigin = new URLSearchParams(window.location.search).get('basedomain');
  private isCompletingTask = false;

  /**
   * Notifies Action Center that the task data has been changed by the user.
   * This is needed to enable the save button in Action Center when the task data has changed
   *
   * @param data - The updated data payload to send to Action Center.
   */
  setTaskData(data: unknown): void {
    this.sendMessageToParent(ActionCenterEventNames.DATACHANGED, data);
  }

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
   */
  completeTask(actionTaken: string, data: unknown): Promise<TaskCompleteResponse> {
    if (this.isCompletingTask) {
      throw new Error('A completeTask call is already in progress');
    }
    this.isCompletingTask = true;

    const content = { data, action: actionTaken };

    return new Promise<TaskCompleteResponse>((resolve, reject) => {
      if (!this.isValidOrigin(this.parentOrigin)) {
        this.isCompletingTask = false;
        reject(new Error('Discarding event from invalid origin'));
        return;
      }

      const messageListener = (event: MessageEvent<ActionCenterEventResponsePayload>) => {
        if (event.origin !== this.parentOrigin) return;
        if (event.data?.eventType !== ActionCenterEventNames.COMPLETERESPONSE) return;

        this.cleanup(messageListener);
        this.isCompletingTask = false;
        resolve(event.data?.content as TaskCompleteResponse);
      };

      window.addEventListener('message', messageListener);
      this.sendMessageToParent(ActionCenterEventNames.COMPLETE, content);
    });
  }

  /**
   * Displays a toast message inside Action Center.
   *
   * @param msg - The message text to display.
   * @param type - The severity/style of the message (`info`, `success`, `warning`, or `error`).
   */
  showMessage(msg: string, type: MessageSeverity): void {
    const content = {
      msg,
      type,
    }
    this.sendMessageToParent(ActionCenterEventNames.DISPLAYMESSAGE, content);
  }

  /**
   * Fetches the current opened task's details from Action Center.
   *
   * @returns A promise that resolves with a {@link Task} object
   *   containing task metadata and data.
   * @throws {Error} If called from an untrusted origin.
   * @throws {Error} If Action Center does not respond within the allotted timeout.
   */
  getTask(): Promise<Task> {
    return new Promise((resolve, reject) => {
      if (!this.isValidOrigin(this.parentOrigin)) {
        reject(new Error('Discarding event from invalid origin'));
        return;
      }

      const messageListener = (event: MessageEvent<ActionCenterEventResponsePayload>) => {
        if (event.origin !== this.parentOrigin) return;
        if (event.data?.eventType !== ActionCenterEventNames.LOADAPP) return;

        clearTimeout(timer);

        this.cleanup(messageListener);
        resolve(event.data?.content as Task);
      };

      const timer = setTimeout(() => {
        this.cleanup(messageListener);
        reject(new Error('Timeout: Task data not received from Action Center'));
      }, INIT_TIMEOUT);

      window.addEventListener('message', messageListener);
      this.sendMessageToParent(ActionCenterEventNames.INIT);
    });
  }

  /** 
   * Removes the message event listener once a response is received or the timeout fires,
   * preventing memory leaks and duplicate handler invocations.
   */
  private cleanup(messageListener: (event: MessageEvent<ActionCenterEventResponsePayload>) => void): void {
    window.removeEventListener('message', messageListener);
  }

  /** 
   * Posts a structured message to the parent (Action Center) frame.
   * Skips the call if the parent origin is not trusted.
   * On serialisation errors, forwards an error event which displays an error toast in Action Center
   *
   * @param eventType - The {@link ActionCenterEventNames} event identifier to send.
   * @param content - Optional payload to include with the event.
   */
  private sendMessageToParent(eventType: string, content?: unknown): void {
    if (window.parent && this.isValidOrigin(this.parentOrigin)) {
      try {
        window.parent.postMessage(
          { eventType, content },
          this.parentOrigin!,
        );
      } catch (error) {
        window.parent.postMessage(
          {
            eventType: ActionCenterEventNames.ERROR,
            content: {
              errorData: error,
            }
          },
          this.parentOrigin!
        );
      }
    }
  }

  /** 
   * Validates that the given origin is a known UiPath environment or a local development server,
   * guarding against cross-origin message spoofing.
   *
   * @param origin - The origin string to validate, sourced from the `basedomain` query parameter.
   * @returns `true` if the origin is trusted, `false` otherwise.
   */
  private isValidOrigin(origin: string | null): boolean {
    const ALLOWED_ORIGINS = ['https://alpha.uipath.com', 'https://staging.uipath.com', 'https://cloud.uipath.com'];

    if (!origin) {
      return false;
    }

    if (ALLOWED_ORIGINS.includes(origin)) {
      return true;
    }

    try {
      const url = new URL(origin);
      return url.hostname === 'localhost';
    } catch {
      return false;
    }
  }
}
