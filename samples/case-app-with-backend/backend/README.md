# USI Backend

ASP.NET Core 9 Web API that handles UiPath OAuth2 authentication and proxies UiPath API calls on behalf of authenticated users. Manages sessions, tokens, and automatic token refresh.

## Tech Stack

- **ASP.NET Core 9** Web API (C#)
- **No database** — sessions stored in-memory via `ConcurrentDictionary` (lost on restart)
- **System.Text.Json** for JSON parsing without full deserialization

## Getting Started

```bash
dotnet run --project USI.Api
```

The API runs on **http://localhost:5000**. Configure UiPath credentials in `USI.Api/appsettings.json` before starting.

## Configuration

All UiPath config lives in the `UiPathOAuth` section of `appsettings.json`:

| Key | Description |
|-----|-------------|
| `OrganizationName` | UiPath org name (used in OAuth and API URL paths) |
| `TenantName` | UiPath tenant name (used in API URL paths) |
| `ClientId` | From UiPath External App registration |
| `ClientSecret` | From UiPath External App registration |
| `RedirectUri` | Must match UiPath app config (`http://localhost:3000/callback`) |
| `Scopes` | Space-delimited OAuth scopes (includes `offline_access` for refresh tokens) |
| `BaseUrl` | UiPath cloud URL (e.g., `https://cloud.uipath.com`) |

## Project Structure

```
USI.Api/
├── Program.cs                          # Entry point, DI, CORS, middleware pipeline
├── appsettings.json                    # UiPath OAuth config
├── Configuration/
│   └── UiPathOAuthSettings.cs          # Strongly-typed config class
├── Controllers/
│   ├── AuthController.cs               # OAuth flow: login-url, callback, status, logout
│   └── CasesController.cs              # Proxies UiPath Cases, Tasks, and HITL APIs
├── Services/
│   ├── ITokenService.cs                # Interface for token operations
│   ├── TokenService.cs                 # HTTP calls to UiPath token endpoint
│   ├── ITokenStore.cs                  # Interface for session storage
│   └── InMemoryTokenStore.cs           # ConcurrentDictionary<sessionId, UserSession>
├── Models/
│   ├── TokenResponse.cs                # UiPath token endpoint JSON response
│   ├── AuthCallbackRequest.cs          # { code, state } from frontend
│   └── UserSession.cs                  # Session data: tokens + expiry
└── Middleware/
    └── TokenRefreshMiddleware.cs        # Auto-refreshes tokens expiring within 5 min
```

## API Endpoints

### Authentication

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/auth/login-url` | None | Returns UiPath authorize URL, sets `oauth_state` cookie |
| POST | `/api/auth/callback` | None | Exchanges auth code for tokens, creates session |
| GET | `/api/auth/status` | Cookie | Returns `{ authenticated: bool }` |
| POST | `/api/auth/logout` | Cookie | Clears session and cookie |

### Cases & Tasks

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/cases` | Cookie | Case management process summaries |
| GET | `/api/cases/{processKey}/instances` | Cookie | Case instances for a process |
| GET | `/api/cases/instances/{instanceId}/hitl-link` | Cookie | Extracts HITL task iframe URL |
| GET | `/api/cases/instances/{instanceId}/task-details?folderKey=...` | Cookie | Full task details (chains 3 UiPath APIs) |
| POST | `/api/cases/tasks/assign` | Cookie | Assigns a task to the current user |
| POST | `/api/cases/tasks/complete` | Cookie | Completes a task with Approve/Reject action |

## Authentication Flow

1. Frontend calls `GET /api/auth/login-url`
2. Backend generates random `state`, stores it in an HttpOnly `oauth_state` cookie, returns the UiPath authorize URL
3. User authenticates at UiPath SSO, gets redirected back with `code` and `state`
4. Frontend sends `code` + `state` to `POST /api/auth/callback`
5. Backend validates `state` (cookie vs body), exchanges code for tokens at UiPath token endpoint
6. Backend stores tokens in `InMemoryTokenStore`, sets HttpOnly `session_id` cookie (60-day expiry)

## Key Architecture Decisions

- **HttpOnly cookies** — Access/refresh tokens are never exposed to JavaScript (XSS protection)
- **CORS with credentials** — Configured for `http://localhost:3000` with `AllowCredentials()` (no wildcard origin)
- **TokenRefreshMiddleware** — Runs before every controller; if the access token expires within 5 minutes, proactively refreshes using the refresh token. Refresh tokens are single-use per UiPath, so the new refresh token is stored
- **JSON pass-through** — Controllers return raw UiPath API JSON via `Content(body, "application/json")` to avoid coupling to UiPath response shapes
- **JWT email extraction** — `ExtractEmailFromJwt` decodes the access token payload (base64url) to get the `email` claim for task assignment, without requiring a JWT library
- **GetTasksAcrossFolders fallback** — When the element-executions API returns an empty `externalLink`, the backend falls back to `GetTasksAcrossFolders?jobId={instanceId}` to resolve the task ID

## UiPath APIs Used

| API | URL Pattern | Purpose |
|-----|-------------|---------|
| OAuth Authorize | `{BaseUrl}/{Org}/identity_/connect/authorize` | SSO login |
| OAuth Token | `{BaseUrl}/{Org}/identity_/connect/token` | Exchange code / refresh |
| Case Summaries | `{BaseUrl}/{Org}/{Tenant}/pims_/api/v1/processes/summary` | List case processes |
| Case Instances | `{BaseUrl}/{Org}/{Tenant}/pims_/api/v1/instances` | List instances per case |
| Element Executions | `{BaseUrl}/{Org}/{Tenant}/pims_/api/v1/element-executions/case-instances/{id}` | Find HITL task links |
| Folders | `{BaseUrl}/{Org}/{Tenant}/orchestrator_/api/Folders/GetAllForCurrentUser` | Resolve folderKey to folderId |
| Get App Task | `{BaseUrl}/{Org}/{Tenant}/orchestrator_/tasks/AppTasks/GetAppTaskById` | Fetch task details |
| Assign Task | `{BaseUrl}/{Org}/{Tenant}/orchestrator_/odata/Tasks/...AssignTasks` | Assign task to user |
| Complete Task | `{BaseUrl}/{Org}/{Tenant}/orchestrator_/tasks/AppTasks/CompleteAppTask` | Approve/reject task |
| Tasks Across Folders | `{BaseUrl}/{Org}/{Tenant}/orchestrator_/odata/Tasks/...GetTasksAcrossFolders` | Fallback task ID lookup |

## Adding New UiPath API Proxy Endpoints

Follow the existing pattern in `CasesController`:

1. Read `session_id` cookie and get `UserSession` from `ITokenStore`
2. Return 401 if no session or expired
3. Build UiPath API URL using `UiPathOAuthSettings` properties
4. Set `Authorization: Bearer {session.AccessToken}` header
5. Pass through the raw JSON response with `Content(body, "application/json")`
6. `TokenRefreshMiddleware` handles token freshness automatically before your controller runs
