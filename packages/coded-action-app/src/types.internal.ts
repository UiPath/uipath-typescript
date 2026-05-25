import { Task, TaskCompleteResponse } from "./types";

export enum ActionCenterEventNames {
  INIT = 'AC.init',
  COMPLETE = 'AC.complete',
  DATACHANGED = 'AC.dataChanged',
  LOADAPP = 'AC.loadApp',
  ERROR = 'AC.error',
  DISPLAYMESSAGE = 'AC.displayMessage',
  COMPLETERESPONSE = 'AC.completeResponse',
}

export type ActionCenterEventResponsePayload = {
  eventType: ActionCenterEventNames;
  content: Task | TaskCompleteResponse;
};