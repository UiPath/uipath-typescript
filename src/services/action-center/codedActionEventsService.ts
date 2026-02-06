import { ActionCenterData, ActionCenterEventResponsePayload, ActionCenterEventNames, MessageTypes } from '../../models/action-center/tasks.types';
import type { TokenManager } from '../../core/auth/token-manager';

export class TaskEventsService {
  private messageListener: ((event: MessageEvent<ActionCenterEventResponsePayload>) => void) | null = null;
  private parentOrigin = new URLSearchParams(window.location.search).get('basedomain');
  private subscribedEvents = [ActionCenterEventNames.LOADAPP, ActionCenterEventNames.TOKENREFRESHED, ActionCenterEventNames.LANGUAGECHANGED, ActionCenterEventNames.THEMECHANGED];
  private pendingTokenRefresh: {
    resolve: (token: string) => void;
    reject: (error: Error) => void;
  } | null = null;
  private tokenManager: TokenManager | null = null;

  constructor() {
    this.updateParentOrigin();
  }

  setTokenManager(tokenManager: TokenManager): void {
    this.tokenManager = tokenManager;
  }

  initializeInActionCenter(clientId?: string, scope?: string): void {
    const content = {
      clientId,
      scope,
    };
    this.sendMessageToParent(ActionCenterEventNames.INIT, content);
  }

  dataChanged(data: unknown): void {
    this.sendMessageToParent(ActionCenterEventNames.DATACHANGED, data);
  }

  completeTask(actionTaken: string, data: unknown): void {
    const content = {
      data: data,
      action: actionTaken,
    };
    this.sendMessageToParent(ActionCenterEventNames.COMPLETE, content);
  }

  displayMessage(msg: string, type: MessageTypes) {
    const content = {
      msg,
      type,
    }
    this.sendMessageToParent(ActionCenterEventNames.DISPLAYMESSAGE, content);
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

  refreshAccessToken(): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      this.pendingTokenRefresh = { resolve, reject };
      this.sendMessageToParent(ActionCenterEventNames.REFRESHTOKEN);

      setTimeout(() => {
        if (this.pendingTokenRefresh) {
          this.pendingTokenRefresh = null;
          reject(new Error('Token refresh timeout: Failed to fetch new token'));
        }
      }, 3000); // Set timeout of 3 seconds
    });
  }

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

  private isValidOrigin(origin: string | null): boolean {
    if (origin && (origin.endsWith('.uipath.com') || origin === 'http://localhost:4202')) {
      return true;
    }

    return false;
  }

  private actionCenterEventCallback(event: MessageEvent<ActionCenterEventResponsePayload>, callback: (data: ActionCenterData) => void): void {
    if (event.origin === this.parentOrigin && this.subscribedEvents.includes(event.data?.eventType)) {
      callback(event.data?.content);

      if (event.data?.eventType === ActionCenterEventNames.LOADAPP && event.data?.content?.token) {
        this.updateToken(event.data.content.token);
      }
      else if (event.data?.eventType === ActionCenterEventNames.TOKENREFRESHED && event.data?.content?.newToken) {
        this.updateToken(event.data.content.newToken, true);
      }
    }
  }

  private updateParentOrigin() {
    if (this.parentOrigin === null) {
      if (window.location.origin.endsWith('alpha.uipath.host')) {
        this.parentOrigin = 'https://alpha.uipath.com';
      }
      else if (window.location.origin.endsWith('staging.uipath.host')) {
        this.parentOrigin = 'https://staging.uipath.com';
      }
      else if (window.location.origin.endsWith('cloud.uipath.host')) {
        this.parentOrigin = 'https://cloud.uipath.com';
      }
    }
  }

  private updateToken(token: string, isRefresh: boolean = false) {
    if (this.tokenManager) {
      this.tokenManager.setToken({
        token,
        type: 'secret' as const,
      });

      if (isRefresh && this.pendingTokenRefresh) {
        this.pendingTokenRefresh.resolve(token);
        this.pendingTokenRefresh = null;
      }
    }
  }
}

// Internal interface exposes all methods including refreshAccessToken for use by TokenManager
export type TaskEventsServiceInternal = TaskEventsService;

// Public interface excludes internal methods - this is what SDK consumers see
export type TaskEventsServicePublic = Omit<TaskEventsService, 'refreshAccessToken' | 'setTokenManager'>;