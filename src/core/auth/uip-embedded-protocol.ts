/**
 * Event names and payload types for the UIP.* postMessage protocol used
 * when a coded app is embedded inside a UiPath host (e.g. Governance Portal, Insights UI).
 *
 * Flow — app-initiated, mirrors the Action Center protocol:
 *  App → Host: UIP.refreshToken   (requests a token; carries clientId + scope
 *                                   so the host knows which OAuth client to use)
 *  Host → App: UIP.tokenRefreshed (delivers the access token)
 *
 * Detection: the host signals embedding via `?host=embed&basedomain=<origin>` in
 * the iframe src URL. No explicit init message from the host is required.
 */

export enum UipEmbeddedEventNames {
  REFRESH_TOKEN   = 'UIP.refreshToken',
  TOKEN_REFRESHED = 'UIP.tokenRefreshed',
}

export type UipEmbeddedTokenRefreshedPayload = {
  eventType: UipEmbeddedEventNames.TOKEN_REFRESHED,
  content: {
    token: {
      accessToken: string,
      expiresAt: string, // ISO 8601
    },
  },
};

export type UipEmbeddedRefreshTokenPayload = {
  eventType: UipEmbeddedEventNames.REFRESH_TOKEN,
  content: {
    clientId: string,
    scope: string,
  },
};
