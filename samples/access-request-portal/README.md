# Access Request Portal

A coded app showcasing the UiPath TypeScript SDK **platform RBAC services** (`@uipath/uipath-typescript/platform`): a self-service portal where members request access to groups and roles, and access admins review, grant, audit, and clone access — without leaving the app.

## What it demonstrates

| Feature | SDK methods |
|---|---|
| Admin gate (admin vs member experience) | `groups.getAll()`, `directory.getGroupMembership()` |
| My Access — the signed-in user's groups and role assignments | `directory.getGroupMembership()`, `roles.getAssignments()` |
| Request catalog (groups + roles to ask for) | `groups.getAll()`, `roles.getAll()` |
| Approve → grant group membership | `groups.updateById()` with `memberUserIdsToAdd` |
| Approve → grant a role | `roles.updateAssignments()` |
| Audit — who holds what, org-wide | `roles.getAssignments('/')` (paginated) |
| One-click CSV export of all assignments | `roles.exportAssignments()` |
| People picker | `directory.search()` |
| Clone a teammate's access to a new joiner | `directory.getGroupMembership()` + `roles.getAssignments()` → `groups.updateById()` + `roles.updateAssignments()` |

The signed-in user's identity (user GUID + organization GUID) is decoded from the OAuth access token (`sub` / `prt_id` claims) via `sdk.getToken()` — no extra configuration needed.

## Run it locally

1. Create an **external application** (non-confidential, user-mode) in UiPath Admin with redirect URI `http://localhost:5173` and scopes `PM.User.Read PM.Group PM.Directory`. The Roles service endpoints are governed by the caller's platform roles rather than OAuth scopes, and the SDK requests `offline_access` (refresh tokens) automatically — neither needs to be configured.
2. Copy `uipath.json.example` to `uipath.json` and fill in your `clientId`, `baseUrl`, `orgName`, and `tenantName`.
3. Install and start:

   ```bash
   npm install
   npm run dev
   ```

4. Sign in. Members of the organization's **Administrators** group get the admin tabs (Approvals, Audit, Clone Access); everyone else gets the member experience.

> The SDK dependency is `file:../..` — build the repo root first (`npm run build`) so `dist/` exists.

## Demo flow (single browser)

1. Sign in as a member → **Request Access** → pick a group or role, add a justification, submit.
2. As an admin → **Approvals** → *Approve & grant*. The SDK performs the real grant (group membership or role assignment) against the platform.
3. **My Access** now shows the new access; **Audit** shows it org-wide; *Export all as CSV* downloads the full assignment list.
4. **Clone Access**: pick a source user and a target user, preview what will be copied, apply.

## Design notes

- **Enforcement lives server-side.** The admin check in this app only gates the UI. Every grant/audit call is re-authorized by the platform against the *caller's* permissions — a member calling `roles.updateAssignments()` directly gets a 403.
- **Request storage is a browser-local demo store** (`localStorage`), so requester and approver must share a browser in the demo. For a real deployment, swap `src/lib/storage.ts` for a Data Fabric entity (a sketch is included in that file) so requests are shared across users.
- Group updates always send the group `name` — the Identity API requires it on every update call.
