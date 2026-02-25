import { ActionCenterData } from "./types";

export enum ActionCenterEventNames {
  INIT = 'AC.init',
  COMPLETE = 'AC.complete',
  DATACHANGED = 'AC.dataChanged',
  LOADAPP = 'AC.loadApp',
  ERROR = 'AC.error',
  DISPLAYMESSAGE = 'AC.displayMessage',
}

export type ActionCenterEventResponsePayload = {
  eventType: ActionCenterEventNames;
  content: ActionCenterData;
};