# Access Request Portal

A coded app showcasing the UiPath TypeScript SDK **platform RBAC services** (`@uipath/uipath-typescript/users`, `/groups`, `/directory`, `/roles`): a self-service portal where members request access to groups and roles, and access admins review, grant, audit, and clone access — without leaving the app.

## What it demonstrates

| Feature | SDK methods |
|---|---|
| Admin gate (admin vs member experience) | `groups.getAll()`, `directory.getGroupMembership()` |
| My Access — the signed-in user's groups and role assignments | `directory.getGroupMembership()`, `roles.getAssignments()` |
| Request catalog (groups + roles to ask for) | `groups.getAll()`, `roles.getAll()` |
| Verify a pending request before granting | `groups.getById()` / `roles.getById()`, `users.getById()` |
| Approve → grant group membership | `groups.updateById()` with `memberUserIdsToAdd` |
| Approve → grant a role | `roles.updateAssignments()` |
| Audit — who holds what, org-wide | `roles.getAssignments('/')` (paginated) |
| One-click CSV export of all assignments | `roles.exportAssignments()` |
| People picker | `directory.search()` |
| Clone a teammate's access to a new joiner | `directory.getGroupMembership()` + `roles.getAssignments()` → `groups.updateById()` + `roles.updateAssignments()` |

The signed-in user's identity (user GUID + organization GUID) is decoded from the OAuth access token (`sub` / `prt_id` claims) via `sdk.getToken()` — no extra configuration needed.

## Run it locally

1. Create an **external application** (non-confidential, user-mode) in UiPath Admin with redirect URI `http://localhost:5173` and scopes `PM.User.Read PM.Group PM.Directory DataFabric.Data.Read DataFabric.Data.Write`. The Roles service endpoints are governed by the caller's platform roles rather than OAuth scopes, and the SDK requests `offline_access` (refresh tokens) automatically — neither needs to be configured.
2. Copy `uipath.json.example` to `uipath.json` and fill in your `clientId`, `baseUrl`, `orgName`, and `tenantName`.
3. Create the request store: a tenant-level Data Fabric entity named `AccessRequests` with text fields `kind`, `targetId`, `targetName`, `justification` (multiline), `requestedById`, `requestedByName`, `status`, `createdTime`, `resolvedByName`, `resolvedTime`. The app addresses it by name (`src/lib/config.ts`), so no id needs copying.
4. Install and start:

   ```bash
   npm install
   npm run dev
   ```

5. Sign in. Members of the organization's **Administrators** group get the admin tabs (Approvals, Audit, Clone Access); everyone else gets the member experience.

## Deploying as a Coded App

```bash
npm run build
uip login --authority https://alpha.uipath.com --organization <org> --tenant <tenant>
uip codedapp pack ./dist --name access-request-portal --version <version>
uip codedapp publish --name access-request-portal --version <version> --type Web
uip codedapp deploy --name access-request-portal --folder-key <folderKey>
```

`pack` reads `uipath.json` for the OAuth client baked into the package, so keep the same file across
releases. Pass `--folder-key` to `deploy`; without it the CLI opens an interactive folder picker. A new
version of an already deployed app must not be `1.0.0` — the tool treats that version as a first
deployment and refuses when the app name is already taken. A fresh deployment always starts from the
app's first published version, so keep that package in the Orchestrator feed; run `deploy` a second
time to upgrade the new deployment to the latest published version.

## Demo flow (single browser)

1. Sign in as a member → **Request Access** → pick a group or role, add a justification, submit.
2. As an admin → **Approvals** → *Approve & grant*. The queue shows each requester and target as the platform resolves them, not as the request row stored them; the SDK then performs the real grant (group membership or role assignment) against the platform.
3. **My Access** now shows the new access; **Audit** shows it org-wide; *Export all as CSV* downloads the full assignment list.
4. **Clone Access**: pick a source user and a target user, preview what will be copied, apply.

## Design notes

- **Enforcement lives server-side.** The admin check in this app only gates the UI. Every grant/audit call is re-authorized by the platform against the *caller's* permissions — a member calling `roles.updateAssignments()` directly gets a 403.
- **Requests are stored in a shared Data Fabric entity** (`AccessRequests`, addressed by name — see `src/lib/config.ts`), so the approver sees the queue from any browser or machine. The store absorbs two Data Fabric behaviours: a write takes about a second to become visible to queries, so `create()` and `update()` wait for the queue to reflect the change before resolving; and an ISO timestamp written to a text field comes back wrapped in quotes with a `+00:00` offset, which the store normalizes before the UI formats it. The entity is coordination data, not authority — a forged "approved" row grants nothing, because grants only happen when an admin's own token calls the platform APIs.
- **The request row is requester-written, so the approver never trusts it.** Before a request can be approved, the app resolves its `targetId` (`groups.getById()` / `roles.getById()`) and its `requestedById` (`users.getById()`) and shows those authoritative values. A row whose stored target label no longer matches the platform is marked *altered* and cannot be approved; one whose IDs do not resolve is marked *unverified*. Harden the deployment too: give requesters create permission only on the `AccessRequests` entity and reserve edit rights for the admins group, so submitted rows cannot be rewritten.
- The Identity API requires the group name on every update; `groups.updateById()` reads the current group and sends it for you, so callers pass only the change.
