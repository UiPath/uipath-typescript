import { z } from 'zod';
import { Config, ConfigSchema } from './core/config/config';
import { ExecutionContext } from './core/context/executionContext';
import { AuthService } from './core/auth/authService';
import { MaestroProcessesService } from './services/maestro/maestroProcesses';
import { ProcessInstancesService } from './services/maestro/processInstances';
import { BaseService } from './services/baseService';

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';

export class UiPath {
  private readonly config: Config;
  private readonly executionContext: ExecutionContext;
  private _authService?: AuthService;
  private _initialized: boolean = false;
  private _storage: Map<string, string> = new Map();

  public readonly maestroProcesses: MaestroProcessesService;
  public readonly processInstances: ProcessInstancesService;

  constructor(config: Config) {
    try {
      this.config = ConfigSchema.parse(config);
      if (!config.secret && (!config.clientId || !config.redirectUri)) {
        throw new Error('Either secret or both clientId and redirectUri must be provided');
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        if (error.message.includes('secret')) {
          throw new Error('Secret is required and must not be empty');
        } else if (error.message.includes('orgName')) {
          throw new Error('Organization name is required and must not be empty');
        } else if (error.message.includes('tenantName')) {
          throw new Error('Tenant name is required and must not be empty');
        }
      }
      throw error;
    }

    this.executionContext = new ExecutionContext();

    // Initialize services using the helper method
    this.maestroProcesses = this.createService(MaestroProcessesService);
    this.processInstances = this.createService(ProcessInstancesService);
  }

  /**
   * Helper method to create service instances with config and execution context
   * @param ServiceClass The service class to instantiate
   * @returns Instance of the service
   */
  private createService<T extends BaseService>(ServiceClass: new (config: Config, executionContext: ExecutionContext) => T): T {
    return new ServiceClass(this.config, this.executionContext);
  }

  /**
   * Initializes the SDK and handles authentication
   * This must be called before making any API calls
   */
  async initialize(): Promise<void> {
    if (this._initialized) {
      return;
    }

    // If we already have a secret/token, we're good to go
    if (this.config.secret) {
      this._initialized = true;
      return;
    }

    // If we have clientId and redirectUri, handle OAuth flow
    if (this.config.clientId && this.config.redirectUri) {
      this._authService = new AuthService(this.config, this.executionContext);
      await this._handleOAuthFlow();
    } else {
      throw new Error('Either secret or both clientId and redirectUri must be provided');
    }

    this._initialized = true;
  }

  private _setStorageItem(key: string, value: string): void {
    try {
      if (isBrowser) {
        window.sessionStorage.setItem(key, value);
        // Also try localStorage as backup
        try {
          window.localStorage.setItem(key + '_backup', value);
        } catch (e) {
          console.warn('Failed to set localStorage backup:', e);
        }
      } else {
        this._storage.set(key, value);
      }
    } catch (e) {
      console.error('Failed to set storage:', e);
      throw new Error('Failed to store OAuth state. Please ensure cookies and storage are enabled.');
    }
  }

  private _getStorageItem(key: string): string | null {
    try {
      if (isBrowser) {
        // Try sessionStorage first
        const value = window.sessionStorage.getItem(key);
        if (value) return value;

        // Try localStorage backup
        const backupValue = window.localStorage.getItem(key + '_backup');
        if (backupValue) {
          // Restore to sessionStorage if possible
          try {
            window.sessionStorage.setItem(key, backupValue);
          } catch (e) {
            console.warn('Failed to restore to sessionStorage:', e);
          }
          return backupValue;
        }
        return null;
      }
      return this._storage.get(key) || null;
    } catch (e) {
      console.error('Failed to get storage:', e);
      return null;
    }
  }

  private _removeStorageItem(key: string): void {
    try {
      if (isBrowser) {
        window.sessionStorage.removeItem(key);
        window.localStorage.removeItem(key + '_backup');
      } else {
        this._storage.delete(key);
      }
    } catch (e) {
      console.error('Failed to remove storage:', e);
    }
  }

  private async _handleOAuthFlow(): Promise<void> {
    if (!this._authService || !this.config.clientId || !this.config.redirectUri) {
      throw new Error('OAuth flow is not configured properly');
    }

    // In browser environment, check if we're in the callback first
    if (isBrowser) {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const returnedState = urlParams.get('state');

      if (code && returnedState) {
        // We're in the callback
        const savedState = this._getStorageItem('uipath_state');
        const savedCodeVerifier = this._getStorageItem('uipath_code_verifier');

        console.log('OAuth Debug:', {
          returnedState,
          savedState,
          hasCodeVerifier: !!savedCodeVerifier,
          storage: {
            session: Object.keys(window.sessionStorage),
            local: Object.keys(window.localStorage)
          }
        });

        if (!savedState || !savedCodeVerifier) {
          // If we lost our state/verifier, we need to start over
          console.warn('OAuth state or verifier lost, restarting flow');
          this._removeStorageItem('uipath_state');
          this._removeStorageItem('uipath_code_verifier');
          window.location.href = window.location.pathname;
          throw new Error('Restarting OAuth flow due to lost state');
        }

        // Verify state
        if (savedState !== returnedState) {
          console.error('State mismatch:', { savedState, returnedState });
          // Clear storage and restart
          this._removeStorageItem('uipath_state');
          this._removeStorageItem('uipath_code_verifier');
          window.location.href = window.location.pathname;
          throw new Error('Invalid state parameter, restarting flow');
        }

        // Exchange code for token
        const token = await this._authService.getAccessToken({
          clientId: this.config.clientId,
          redirectUri: this.config.redirectUri,
          code,
          codeVerifier: savedCodeVerifier
        });
        console.log('Token:', token);
        // Clean up storage
        this._removeStorageItem('uipath_code_verifier');
        this._removeStorageItem('uipath_state');

        // Update config and context with the new token
        this.config.secret = token.access_token;
        console.log('Config:', this.config);
        this.executionContext.set('token', token.access_token);
        console.log('ExecutionContext:', this.executionContext);
        console.log('token later:', this.executionContext.get('token'));

        // Remove code and state from URL without refreshing the page
        const newUrl = window.location.pathname + window.location.hash;
        window.history.replaceState({}, document.title, newUrl);
        return;
      }
    }

    // Not in callback or not in browser, start new flow
    const codeVerifier = this._authService.generateCodeVerifier();
    const codeChallenge = await this._authService.generateCodeChallenge(codeVerifier);
    const state = this._authService.generateCodeVerifier().slice(0, 16);

    // Store PKCE parameters before anything else
    this._setStorageItem('uipath_code_verifier', codeVerifier);
    this._setStorageItem('uipath_state', state);

    // Verify storage worked
    const storedState = this._getStorageItem('uipath_state');
    const storedVerifier = this._getStorageItem('uipath_code_verifier');
    
    if (!storedState || !storedVerifier || storedState !== state) {
      throw new Error('Failed to store OAuth state. Please ensure cookies and storage are enabled.');
    }

    // Get the authorization URL
    const authUrl = this._authService.getAuthorizationUrl({
      clientId: this.config.clientId,
      redirectUri: this.config.redirectUri,
      codeChallenge,
      state
    });

    if (!isBrowser) {
      // In Node.js, we can't handle the redirect flow automatically
      throw new Error(`Please complete the OAuth flow by:
1. Visit this URL in a browser: ${authUrl}
2. After authorization, you'll be redirected to your redirect URI with a code parameter
3. Use that code to get an access token
4. Initialize the SDK with the access token`);
    }

    // Store current URL to return to after auth
    this._setStorageItem('uipath_return_url', window.location.href);
    
    // Redirect to auth URL
    window.location.href = authUrl;
    throw new Error('Redirecting to authentication...');
  }
}
