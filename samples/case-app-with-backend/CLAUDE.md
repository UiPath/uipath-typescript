# USI - UiPath Service Integration

## What This Project Does

React + C# web app that authenticates users via UiPath SSO (OAuth2 Authorization Code Flow for confidential apps) and makes authenticated UiPath API calls on behalf of the user.

## Tech Stack

- **Backend**: ASP.NET Core 9 Web API (C#), runs on `http://localhost:5000`
- **Frontend**: React 18 + TypeScript + Vite, runs on `http://localhost:3000`
- **No database** — sessions stored in-memory (lost on backend restart)

## Project Structure

```
case-app-with-backend/
├── backend/
│   ├── USI.Api.sln
│   └── USI.Api/
│       ├── Program.cs                          # Entry point, DI, CORS, middleware
│       ├── appsettings.json                    # UiPath OAuth config (secrets here)
│       ├── Configuration/
│       │   └── UiPathOAuthSettings.cs          # Strongly-typed config class
│       ├── Controllers/
│       │   ├── AuthController.cs               # OAuth flow: login-url, callback, status, logout
│       │   └── CasesController.cs              # Proxies UiPath Cases API
│       ├── Services/
│       │   ├── ITokenService.cs                # Interface for token operations
│       │   ├── TokenService.cs                 # HTTP calls to UiPath token endpoint
│       │   ├── ITokenStore.cs                  # Interface for session storage
│       │   └── InMemoryTokenStore.cs           # ConcurrentDictionary<sessionId, UserSession>
│       ├── Models/
│       │   ├── TokenResponse.cs                # UiPath token endpoint JSON response
│       │   ├── AuthCallbackRequest.cs          # { code, state } from frontend
│       │   └── UserSession.cs                  # Session data: tokens + expiry
│       └── Middleware/
│           └── TokenRefreshMiddleware.cs        # Auto-refreshes tokens expiring within 5 min
│
└── frontend/
    ├── .env                                    # VITE_API_BASE_URL=http://localhost:5000
    ├── vite.config.ts                          # Port 3000
    └── src/
        ├── App.tsx                             # Router: /, /callback, /dashboard
        ├── App.css                             # All styles
        ├── config.ts                           # Reads VITE_API_BASE_URL
        ├── types/
        │   ├── auth.ts                         # AuthStatus, LoginUrlResponse
        │   └── cases.ts                        # CaseSummary
        ├── services/
        │   ├── authService.ts                  # getLoginUrl, sendCallback, getAuthStatus, logout
        │   └── casesService.ts                 # getCases
        ├── context/
        │   └── AuthContext.tsx                  # Global auth state, useAuth hook
        └── pages/
            ├── LoginPage.tsx                   # "Login with UiPath" button
            ├── CallbackPage.tsx                # Handles UiPath redirect, sends code to backend
            ├── DashboardPage.tsx               # Cases summary table
            ├── CaseInstancesPage.tsx           # Case instances table (drill-down)
            └── HitlTaskPage.tsx                # HITL task details + task view
```

## Authentication Flow

1. User clicks "Login with UiPath" on LoginPage
2. Frontend calls `GET /api/auth/login-url` — backend generates state, sets HttpOnly `oauth_state` cookie, returns UiPath authorize URL
3. Frontend redirects browser to `{BaseUrl}/{orgName}/identity_/connect/authorize?...`
4. User authenticates at UiPath SSO
5. UiPath redirects to `http://localhost:3000/callback?code=XXX&state=YYY`
6. CallbackPage extracts code+state, POSTs to `POST /api/auth/callback`
7. Backend validates state (cookie vs body), exchanges code for tokens at UiPath token endpoint
8. Backend stores tokens in InMemoryTokenStore, sets HttpOnly `session_id` cookie (60-day expiry)
9. Frontend navigates to /dashboard

## UiPath API Details

### OAuth Endpoints (use OrganizationName in path)
- Authorize: `{BaseUrl}/{OrganizationName}/identity_/connect/authorize`
- Token: `{BaseUrl}/{OrganizationName}/identity_/connect/token`
- Token request Content-Type: `application/x-www-form-urlencoded`

### Token Lifetimes
- Access token: 1 hour (3600s)
- Refresh token: 60 days, **single-use** (new one returned each refresh)
- Must include `offline_access` scope to get refresh token
- Authorization code: single-use

### Cases API (uses OrganizationName + TenantName in path)
- `GET {BaseUrl}/{OrganizationName}/{TenantName}/pims_/api/v1/processes/summary?processType=CaseManagement`
- Authorization: `Bearer {access_token}`

## Configuration (appsettings.json)

All UiPath config lives in the `UiPathOAuth` section:
- `OrganizationName` — UiPath org name (used in OAuth URLs and API URLs)
- `TenantName` — UiPath tenant name (used in Cases API URL path)
- `ClientId` / `ClientSecret` — from UiPath External App registration
- `RedirectUri` — must match UiPath app config (`http://localhost:3000/callback`)
- `Scopes` — space-delimited OAuth scopes
- `BaseUrl` — UiPath cloud URL (e.g., `https://cloud.uipath.com`)

## Key Architecture Decisions

- **Backend constructs authorize URL** — client_id/scopes stay server-side, state is generated server-side in HttpOnly cookie for CSRF protection
- **HttpOnly cookies for sessions** — access/refresh tokens never exposed to JavaScript (XSS protection)
- **All frontend fetch calls use `credentials: 'include'`** — required for cross-origin cookies (3000 → 5000). Backend CORS has `AllowCredentials()` with explicit origin (not wildcard)
- **TokenRefreshMiddleware** — runs before controllers on every request; if token expires within 5 min, proactively refreshes using refresh token
- **CasesController passes through raw JSON** — `Content(body, "application/json")` avoids coupling to UiPath response shape
- **Named HttpClient `"UiPathApi"`** — used by CasesController via IHttpClientFactory to avoid socket exhaustion
- **Typed HttpClient** — used by TokenService (`AddHttpClient<ITokenService, TokenService>()`)

## Backend API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/auth/login-url` | None | Returns UiPath authorize URL + state |
| POST | `/api/auth/callback` | None | Exchanges auth code for tokens, creates session |
| GET | `/api/auth/status` | Cookie | Returns `{ authenticated: bool }` |
| POST | `/api/auth/logout` | Cookie | Clears session |
| GET | `/api/cases` | Cookie | Proxies UiPath Cases API with stored token |

## Frontend Routes

| Path | Guard | Component |
|------|-------|-----------|
| `/` | PublicRoute (redirects to /dashboard if authed) | LoginPage |
| `/callback` | None | CallbackPage |
| `/dashboard` | ProtectedRoute (redirects to / if not authed) | DashboardPage |

## Running the Project

```bash
# Backend
dotnet run --project backend/USI.Api

# Frontend
cd frontend && npm run dev
```

## Adding New UiPath API Proxy Endpoints

Follow the CasesController pattern:
1. Read `session_id` cookie → get `UserSession` from `ITokenStore`
2. Return 401 if no session or expired
3. Build UiPath API URL using `UiPathOAuthSettings` properties
4. Set `Authorization: Bearer {session.AccessToken}` header
5. Pass through the raw JSON response with `Content(body, "application/json")`
6. The TokenRefreshMiddleware handles token freshness automatically
