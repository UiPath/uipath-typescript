import { EVENT_NAMES } from "./codedActionEvents";

const searchParams = new URLSearchParams(window.location.search);
const PARENT_ORIGIN = searchParams.get('basedomain');
const subscribedEvents = [EVENT_NAMES.LOADAPP, EVENT_NAMES.TOKENREFRESHED, EVENT_NAMES.LANGUAGECHANGED, EVENT_NAMES.THEMECHANGED];

export class TaskEventsService {

  initializeInActionCenter(): void {
    this.sendMessageToParent(EVENT_NAMES.INIT);
  }

  dataChanged(data: any): void {
    this.sendMessageToParent(EVENT_NAMES.DATACHANGED, data);
  }

  completeTask(actionTaken: string, data: any): void {
    const content = {
      data: data,
      action: actionTaken,
    };
    this.sendMessageToParent(EVENT_NAMES.COMPLETE, content);
  }

  sendError(content: any): void {
    this.sendMessageToParent(EVENT_NAMES.ERROR, content);
  }

  getTaskDetailsFromActionCenter(callback: (data: any) => void): void {
    window.addEventListener('message', (event) => {
      if (subscribedEvents.includes(event.data.eventType)) {
        callback(event.data.content);
      }
    });
  }

  sendMessageToParent(eventType: string, content?: any): void {
    try {
      window.parent.postMessage(
        { eventType, content },
        PARENT_ORIGIN!,
      );
      console.log('sent message to Action Center', eventType, content);
    } catch (error) {
      window.parent.postMessage(
        {
          eventType: EVENT_NAMES.ERROR,
          content: {
            errorType: 'POST_MESSAGE_EXCEPTION',
            errorData: error,
          }
        },
        PARENT_ORIGIN!
      );
    }
  }
}