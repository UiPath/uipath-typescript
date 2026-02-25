import { ActionCenterEventNames, ActionCenterEventResponsePayload } from '../../models/action-center/tasks.internal-types';
import { TokenInfo } from './types';
import { AuthenticationError, HttpStatus } from '../errors';
import { Config } from '../config/config';

const AUTHENTICATION_TIMEOUT = 8000;

export class ActionCenterTokenManager {
  private readonly parentOrigin = new URLSearchParams(window.location.search).get('basedomain');
  private refreshPromise: Promise<string> | null = null;

  constructor(
    private readonly config: Config,
    private readonly onTokenRefreshed: (tokenInfo: TokenInfo) => void
  ) {}

  async refreshAccessToken(tokenInfo: TokenInfo): Promise<string> {
    if (!this.isTokenExpired(tokenInfo)) {
      return tokenInfo.token;
    }

    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = new Promise<string>((resolve, reject) => {
      const content = {
        clientId: this.config.clientId,
        scope: this.config.scope,
      }
      this.sendMessageToParent(ActionCenterEventNames.REFRESHTOKEN, content);

      const messageListener = (event: MessageEvent<ActionCenterEventResponsePayload>) => {
        if (event.origin !== this.parentOrigin) return;
        if (event.data?.eventType !== ActionCenterEventNames.TOKENREFRESHED) return;

        clearTimeout(timer);

        if (event.data?.content?.token) {
          const { accessToken, expiresAt } = event.data.content.token;
          this.onTokenRefreshed({ token: accessToken, type: 'secret', expiresAt });
          resolve(accessToken);
        } else {
          reject(new AuthenticationError({
            message: 'Failed to fetch access token',
            statusCode: HttpStatus.UNAUTHORIZED,
          }));
        }

        this.refreshPromise = null;
        this.cleanup(messageListener);
      };

      const timer = setTimeout(() => {
        reject(new AuthenticationError({
          message: 'Failed to fetch access token',
          statusCode: HttpStatus.UNAUTHORIZED,
        }));

        this.refreshPromise = null;
        this.cleanup(messageListener);
      }, AUTHENTICATION_TIMEOUT);

      window.addEventListener('message', messageListener);
    });

    return this.refreshPromise;
  }

  private isTokenExpired(tokenInfo: TokenInfo): boolean {
    if (!tokenInfo?.expiresAt) {
      return true;
    }

    return new Date() >= tokenInfo.expiresAt;
  }

  private sendMessageToParent(eventType: string, content?: unknown): void {
    if (window.parent && this.isValidOrigin(this.parentOrigin)) {
      try {
        window.parent.postMessage({ eventType, content }, this.parentOrigin!);
      } catch (error) {
        console.warn('Failed to send message to Action Center', JSON.stringify(error));
      }
    }
  }

  private cleanup(messageListener: (event: MessageEvent<ActionCenterEventResponsePayload>) => void): void {
    window.removeEventListener('message', messageListener);
  }

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
