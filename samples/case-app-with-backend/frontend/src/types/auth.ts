export interface AuthStatus {
  authenticated: boolean;
  expiresAt?: string;
}

export interface LoginUrlResponse {
  url: string;
  state: string;
}
