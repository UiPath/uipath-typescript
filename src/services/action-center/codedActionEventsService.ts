import { ActionCenterData, ActionCenterEventResponsePayload, ActionCenterEventNames } from '../../models/action-center/tasks.types';

export class TaskEventsService {
  private messageListener: ((event: MessageEvent<ActionCenterEventResponsePayload>) => void) | null = null;
  private parentOrigin = new URLSearchParams(window.location.search).get('basedomain');
  private subscribedEvents = [ActionCenterEventNames.LOADAPP, ActionCenterEventNames.TOKENREFRESHED, ActionCenterEventNames.LANGUAGECHANGED, ActionCenterEventNames.THEMECHANGED];

  initializeInActionCenter(): void {
    this.sendMessageToParent(ActionCenterEventNames.INIT);
  }

  dataChanged(data: any): void {
    this.sendMessageToParent(ActionCenterEventNames.DATACHANGED, data);
  }

  completeTask(actionTaken: string, data: any): void {
    const content = {
      data: data,
      action: actionTaken,
    };
    this.sendMessageToParent(ActionCenterEventNames.COMPLETE, content);
  }

  getTaskDetailsFromActionCenter(callback: (data: ActionCenterData) => void): void {
    if (this.isValidOrigin(this.parentOrigin) && this.messageListener === null) {
      this.messageListener = (event: MessageEvent<ActionCenterEventResponsePayload>) => this.actionCenterEventCallback(event, callback);
      window.addEventListener('message', this.messageListener);
    }
  }

  cleanup(): void {
    if (this.messageListener) {
      window.removeEventListener('message', this.messageListener);
      this.messageListener = null;
    }
  }

  private sendMessageToParent(eventType: string, content?: any): void {
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

  private isValidOrigin(origin: string | null): boolean {
    if (origin && (origin.endsWith('.uipath.com') || origin === 'http://localhost:4202')) {
      return true;
    }

    return false;
  }

  private actionCenterEventCallback(event: MessageEvent<ActionCenterEventResponsePayload>, callback: (data: ActionCenterData) => void): void {
    if (event.origin === this.parentOrigin && this.subscribedEvents.includes(event.data?.eventType)) {
      callback(event.data?.content);
    }
  }
}