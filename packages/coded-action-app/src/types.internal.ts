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

/**
 * Task content as delivered by Action Center on the `LOADAPP` event. Carries
 * the hidden `cloudUserId` that is reported as `CloudUserId` on telemetry
 * events but is intentionally absent from the public {@link Task} contract.
 */
export type TaskWithCloudUserId = Task & { cloudUserId?: string };

export type ActionCenterEventResponsePayload = {
  eventType: ActionCenterEventNames;
  content: TaskWithCloudUserId | TaskCompleteResponse;
};