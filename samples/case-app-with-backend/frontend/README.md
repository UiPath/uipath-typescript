# USI Frontend

React + TypeScript single-page application that provides the UI for UiPath Service Integration. Handles UiPath SSO login, displays case management data, and enables Human-in-the-Loop (HITL) task interaction.

## Tech Stack

- **React 18** with TypeScript
- **Vite** for dev server and bundling
- **React Router** for client-side routing

## Getting Started

```bash
npm install
npm run dev
```

The dev server runs on **http://localhost:3000**. The backend must be running on **http://localhost:5000** for API calls to work.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_BASE_URL` | `http://localhost:5000` | Backend API base URL |

Configured in `.env`.

## Project Structure

```
src/
├── main.tsx                        # App entry point
├── App.tsx                         # Route definitions and guards
├── App.css                         # All application styles
├── config.ts                       # Reads VITE_API_BASE_URL
├── context/
│   └── AuthContext.tsx              # Global auth state provider + useAuth hook
├── types/
│   ├── auth.ts                     # AuthStatus, LoginUrlResponse
│   └── cases.ts                    # CaseSummary, CaseInstance, TaskDetailsResponse
├── services/
│   ├── authService.ts              # OAuth API calls (login-url, callback, status, logout)
│   └── casesService.ts             # Cases, instances, task details, assign, complete
└── pages/
    ├── LoginPage.tsx               # "Login with UiPath" button
    ├── CallbackPage.tsx            # Handles OAuth redirect, sends code to backend
    ├── DashboardPage.tsx           # Cases summary table
    ├── CaseInstancesPage.tsx       # Case instances table (drill-down from dashboard)
    └── HitlTaskPage.tsx            # HITL task details + task view (tabbed interface)
```

## Routes

| Path | Guard | Page | Description |
|------|-------|------|-------------|
| `/` | PublicRoute | LoginPage | Redirects to /dashboard if already authenticated |
| `/callback` | None | CallbackPage | Receives OAuth redirect with auth code |
| `/dashboard` | ProtectedRoute | DashboardPage | Case management process summary table |
| `/cases/:processKey` | ProtectedRoute | CaseInstancesPage | Instances for a specific case |
| `/cases/instances/:instanceId/hitl` | ProtectedRoute | HitlTaskPage | HITL task interaction |

## Key Patterns

- **All fetch calls use `credentials: 'include'`** — required for cross-origin HttpOnly cookies (frontend on port 3000, backend on port 5000)
- **Route state** is used to pass context between pages (case name, folder key, case ID) to avoid redundant API calls
- **AuthContext** provides global `isAuthenticated` state, checked on mount via `GET /api/auth/status`
- **No tokens in JavaScript** — authentication is entirely cookie-based; the backend manages all OAuth tokens

## Page Flow

```
LoginPage → UiPath SSO → CallbackPage → DashboardPage → CaseInstancesPage → HitlTaskPage
```

### HitlTaskPage (HITL Task Interaction)

The most complex page. Has two tabs:

- **Task Details** — Shows task metadata (title, priority, assigned user), editable form fields from task data, and action buttons:
  - Unassigned tasks: "Assign to myself" button
  - Assigned tasks: "Approve" and "Reject" buttons that submit form data
- **Task View** — Embeds the UiPath task UI in an iframe
