# External Auth

A provider-agnostic React sign-in widget. It renders one button per configured authentication provider and starts the login **directly at that provider's IdP**.

Package: `@uipath/ui-widgets-external-auth`

For OIDC providers (Google, UAE PASS, or any other) it ships a built-in default sign-in — a standard authorization-code redirect with CSRF `state` and PKCE — enabled per provider via an `oauth` config. A per-provider `onSignIn` handler always wins over the default. Everything after the redirect — callback validation, token exchange, session creation — is the consumer's responsibility.

This widget takes no SDK instance

External Auth never calls UiPath. It is for signing users into your own app through a third-party identity provider. To authenticate against UiPath itself, see [Authentication](../../authentication/).

## Features

- Renders any number of authentication providers
- Fully provider-agnostic: name, icon, client ID and sign-in behavior are supplied per provider
- Built-in default sign-in for any OIDC provider: a direct authorize redirect with CSRF `state` and PKCE
- Per-provider `onSignIn` override that always wins — required for non-OIDC providers like SAML 2.0
- Icons can be inline SVG / React elements or image URLs
- Customizable heading

## Installation

Beta — not yet published to npm

`@uipath/ui-widgets-external-auth` is at `1.0.0-beta.1` and is not yet on the public registry, so the command below does not resolve today. This page documents the current API so you can evaluate and plan against it.

```
npm install @uipath/ui-widgets-external-auth
```

### Peer dependencies

```
npm install react@^19.2.0 react-dom@^19.2.0 @uipath/uipath-typescript@^1.4.1
```

The package declares the SDK as a peer dependency for consistency with the other widgets, even though this one makes no UiPath calls of its own.

## Usage

Theming

Add either a `light` or `dark` class to your HTML `<body>` element to enable proper theming.

```
import { ExternalAuth } from "@uipath/ui-widgets-external-auth";
import "@uipath/ui-widgets-external-auth/ExternalAuth.css";

function App() {
  return (
    <ExternalAuth
      authProviders={[
        {
          displayName: "Google",
          displayIcon: <GoogleIcon />,
          clientId: "your-google-client-id",
          // No onSignIn — the built-in default redirects straight to Google:
          oauth: {
            authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
            redirectUri: "https://myapp.com/auth/google/callback",
            scopes: "openid email profile",
          },
        },
        {
          displayName: "SAML",
          displayIcon: "https://example.com/shield.svg",
          clientId: "saml-connection-id",
          // SAML must be started by your backend Service Provider:
          onSignIn: (clientId) =>
            window.location.assign(`/auth/saml/login?connection=${clientId}`),
        },
      ]}
    />
  );
}
```

## Props

### `ExternalAuth`

| Prop            | Type             | Required | Description                                                                   |
| --------------- | ---------------- | -------- | ----------------------------------------------------------------------------- |
| `authProviders` | `AuthProvider[]` | Yes      | Providers to render, in order, one button each                                |
| `title`         | `string`         | No       | Heading shown at the top of the widget (default: `"Sign in to your account"`) |

### `AuthProvider`

| Prop          | Type                                          | Required | Description                                                                                                |
| ------------- | --------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------- |
| `displayName` | `string`                                      | Yes      | Name shown on the provider button — e.g. `"Google"` renders "Continue with Google"                         |
| `displayIcon` | `ReactNode`                                   | No       | Icon shown next to the provider name. A string is treated as an image URL; anything else renders as-is     |
| `clientId`    | `string`                                      | Yes      | Client ID for the provider — passed back to `onSignIn` when the button is clicked                          |
| `onSignIn`    | `(clientId: string) => void \| Promise<void>` | No\*     | Called with the provider's `clientId` when its button is clicked; may be async                             |
| `oauth`       | `OAuthRedirectConfig`                         | No\*     | Config for the built-in default sign-in (an OIDC authorize redirect), used only when `onSignIn` is omitted |

\* Provide **`onSignIn`** or **`oauth`** (or both — `onSignIn` wins). With neither, a button click logs a warning and does nothing.

### `OAuthRedirectConfig`

| Prop           | Type                     | Required | Description                                                   |
| -------------- | ------------------------ | -------- | ------------------------------------------------------------- |
| `authorizeUrl` | `string`                 | Yes      | Provider authorize endpoint                                   |
| `redirectUri`  | `string`                 | Yes      | Registered redirect URI                                       |
| `scopes`       | `string`                 | Yes      | Space-separated scopes, e.g. `openid email profile`           |
| `responseType` | `string`                 | No       | OAuth `response_type`; defaults to `code`                     |
| `usePkce`      | `boolean`                | No       | Generate a PKCE challenge/verifier; defaults to `true`        |
| `extraParams`  | `Record<string, string>` | No       | Extra query params, e.g. `{ acr_values: "..." }` for UAE PASS |

## How it works

When a user clicks a provider button, the widget calls that provider's `onSignIn` callback with its `clientId` — or, when `onSignIn` is omitted and an `oauth` config is present, starts the built-in default sign-in (a direct OIDC redirect to that provider).

Everything after the browser leaves the page — the callback route, `state` / PKCE verification, token exchange and validation, and session creation — is the consumer's responsibility.

### Built-in default sign-in (optional)

If you don't want to write `onSignIn` for a standard OIDC provider, supply an `oauth` config instead and the widget will start the login for you: it builds a standard OAuth 2.0 / OpenID Connect authorization-code redirect (with CSRF `state` and PKCE) and navigates the browser to the provider. The generated `state` and PKCE `codeVerifier` are stored in `sessionStorage` under `uipath-external-auth:oauth:<clientId>` for your callback route to read and verify.

```
<ExternalAuth
  authProviders={[
    {
      displayName: "Google",
      clientId: "1234-abc.apps.googleusercontent.com",
      // no onSignIn — the widget uses the built-in OIDC redirect:
      oauth: {
        authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
        redirectUri: "https://myapp.com/auth/google/callback",
        scopes: "openid email profile",
      },
    },
  ]}
/>
```

OIDC only — SAML needs an explicit `onSignIn`

The default covers **OIDC-style providers only** (Google, UAE PASS). SAML cannot be started from the browser and must use an explicit `onSignIn` that points at a backend Service Provider.

The default also only *starts* the flow — you still own the callback route that exchanges and validates the code and creates the session. The helpers `buildOAuthAuthorizeUrl(clientId, config)` and `createDefaultSignIn(config)` are exported too, if you want to call them directly inside your own `onSignIn`.
