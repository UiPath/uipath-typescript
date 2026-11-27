import { UiPath } from '@uipath/uipath-typescript/core'

// Configured from the <meta name="uipath:*"> tags, so it takes no arguments. Sign in with
// `await sdk.initialize()` from a user action: it redirects away, so when the page loads
// again finish it with `if (sdk.isInOAuthCallback()) await sdk.completeOAuth()`.
export const sdk = new UiPath()
