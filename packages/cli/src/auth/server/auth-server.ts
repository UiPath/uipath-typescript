import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs-extra';
import { Server } from 'http';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { TokenResponse } from '../core/oidc.js';
import { getTokenEndpointUrl } from '../utils/url.js';
import { validateTokenExchangeRequest, validateTokenResponse } from '../utils/validation.js';
import { AUTH_CONSTANTS } from '../../constants/auth.js';
import { authRateLimiter, tokenRateLimiter, errorRateLimiter } from './rate-limiter.js';
import authConfig from '../config/auth.json' with { type: 'json' };
import { createHeaders } from '../../utils/api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface TokenExchangeRequest {
  code: string;
  state: string;
}

interface AuthServerOptions {
  port?: number;
  domain: string;
  codeVerifier: string;
  expectedState: string;
}

export class AuthServer {
  private app: express.Application;
  private server: Server | null = null;
  private port: number;
  private domain: string;
  private codeVerifier: string;
  private expectedState: string;
  private authCompleteResolve?: (value: TokenResponse) => void;
  private authCompleteReject?: (reason?: any) => void;
  private authTimeout?: NodeJS.Timeout;

  constructor(options: AuthServerOptions) {
    this.port = options.port || authConfig.port;
    this.domain = options.domain;
    this.codeVerifier = options.codeVerifier;
    this.expectedState = options.expectedState;
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    
    // CORS middleware - restrict to localhost origins only
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const origin = req.get('origin');
      const isAllowedOrigin = origin && AUTH_CONSTANTS.CORS.ALLOWED_ORIGINS.some(allowedOrigin => 
        origin.startsWith(allowedOrigin)
      );
      
      res.header(
        AUTH_CONSTANTS.CORS.HEADERS.ALLOW_ORIGIN, 
        isAllowedOrigin ? origin : 'null'
      );
      res.header(AUTH_CONSTANTS.CORS.HEADERS.ALLOW_METHODS, AUTH_CONSTANTS.CORS.VALUES.METHODS);
      res.header(AUTH_CONSTANTS.CORS.HEADERS.ALLOW_HEADERS, AUTH_CONSTANTS.CORS.VALUES.HEADERS);
      
      if (req.method === 'OPTIONS') {
        res.sendStatus(AUTH_CONSTANTS.HTTP_STATUS.NO_CONTENT);
      } else {
        next();
      }
    });
  }

  private setupRoutes(): void {
    // OAuth callback route - Rate limited to prevent abuse
    this.app.get(AUTH_CONSTANTS.ROUTES.OIDC_LOGIN, authRateLimiter, async (req: Request, res: Response) => {
      const htmlPath = path.join(__dirname, '../../assets/auth-callback.html');
      const html = await fs.readFile(htmlPath, 'utf-8');
      res.send(html);
    });

    // Token exchange endpoint - Rate limited for security
    // @security Rate limiting applied via tokenRateLimiter middleware
    this.app.post(AUTH_CONSTANTS.ROUTES.TOKEN, tokenRateLimiter, async (req: Request<{}, {}, TokenExchangeRequest>, res: Response) => {
      try {
        const { code, state } = validateTokenExchangeRequest(req.body);

        // Validate state parameter
        if (state !== this.expectedState) {
          throw new Error('Invalid state parameter');
        }

        // Exchange code for tokens
        const tokens = await this.exchangeCodeForTokens(code);

        res.json({ success: true });
        
        // Clear timeout and resolve the auth promise with tokens
        if (this.authTimeout) {
          clearTimeout(this.authTimeout);
          this.authTimeout = undefined;
        }
        if (this.authCompleteResolve) {
          this.authCompleteResolve(tokens);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res.status(AUTH_CONSTANTS.HTTP_STATUS.BAD_REQUEST).json({ success: false, error: errorMessage });
        
        // Clear timeout and reject
        if (this.authTimeout) {
          clearTimeout(this.authTimeout);
          this.authTimeout = undefined;
        }
        if (this.authCompleteReject) {
          this.authCompleteReject(error);
        }
      }
    });

    // Error logging endpoint
    this.app.post(AUTH_CONSTANTS.ROUTES.ERROR, errorRateLimiter, async (req: Request, res: Response) => {
      const { error } = req.body;
      console.error('Client error:', error);
      
      // Log to file
      const errorLogPath = path.join(process.cwd(), '.error_log');
      const timestamp = new Date().toISOString();
      const logEntry = `[${timestamp}] ${error}\n`;
      
      try {
        await fs.appendFile(errorLogPath, logEntry);
      } catch (err) {
        console.error('Failed to write error log:', err);
      }
      
      res.sendStatus(AUTH_CONSTANTS.HTTP_STATUS.OK);
    });

    // Health check
    this.app.get(AUTH_CONSTANTS.ROUTES.HEALTH, (req: Request, res: Response) => {
      res.json({ status: 'ok', port: this.port });
    });
  }

  private async exchangeCodeForTokens(code: string): Promise<TokenResponse> {
    const tokenEndpoint = getTokenEndpointUrl(this.domain);
    const redirectUri = authConfig.redirect_uri.replace(AUTH_CONSTANTS.DEFAULT_PORT.toString(), this.port.toString());

    const params = new URLSearchParams({
      grant_type: AUTH_CONSTANTS.OAUTH.GRANT_TYPE,
      code,
      redirect_uri: redirectUri,
      client_id: authConfig.client_id,
      code_verifier: this.codeVerifier,
    });

    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: createHeaders({
        contentType: AUTH_CONSTANTS.CONTENT_TYPES.FORM_URLENCODED,
      }),
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token exchange failed: ${error}`);
    }

    const data = await response.json();
    return validateTokenResponse(data);
  }

  public start(): Promise<TokenResponse> {
    return new Promise((resolve, reject) => {
      this.authCompleteResolve = resolve;
      this.authCompleteReject = reject;

      this.server = this.app.listen(this.port, () => {
        console.log(`Auth server listening on port ${this.port}`);
      });

      this.server.on('error', (error: any) => {
        if (error.code === AUTH_CONSTANTS.ERRORS.EADDRINUSE) {
          console.error(`Port ${this.port} is already in use`);
          reject(new Error(`Port ${this.port} is already in use`));
        } else {
          reject(error);
        }
      });

      // Timeout after 5 minutes
      this.authTimeout = setTimeout(() => {
        reject(new Error('Authentication timeout'));
        this.stop();
      }, AUTH_CONSTANTS.TIMEOUTS.AUTH_TIMEOUT);
    });
  }

  public stop(): void {
    // Clear timeout if it exists
    if (this.authTimeout) {
      clearTimeout(this.authTimeout);
      this.authTimeout = undefined;
    }

    if (this.server) {
      this.server.close(() => {
        console.log('Auth server stopped');
      });
      
      // Destroy all active connections to force shutdown
      this.server.unref();
      this.server = null;
    }
  }
}