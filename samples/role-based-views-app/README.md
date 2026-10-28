# Role-Based Views

A minimal coded app showing that one build can serve different people differently. Everyone signs in to the
same app; members of the organization's **Administrators** group get an organization overview, and everyone
else gets a view of their own profile and groups. It uses the UiPath TypeScript SDK platform services
(`@uipath/uipath-typescript/users`, `/groups`, `/directory`).

For a fuller example built on the same idea — access requests, approvals, audit and access cloning — see
[`access-request-portal`](../access-request-portal).

## The two views

| View | Who sees it | What it shows | SDK methods |
|---|---|---|---|
| Organization | Members of the Administrators group | User count, every user with status and last sign-in, every group | `users.getAll()` (paginated), `groups.getAll()` |
| Member | Everyone else, and admins through the *Member view* tab | The signed-in user's profile and the groups they belong to | `groups.getAll()`, `directory.getGroupMembership()` |

## How the view is chosen

On sign-in, `src/lib/views.ts` looks up the Administrators group with `groups.getAll()` and asks
`directory.getGroupMembership()` whether the signed-in user belongs to it. The user's id comes from the access
token (`sub` claim), so identifying them needs no API call. If the check fails, the app falls back to the member
view.

The view only decides what the UI renders. Every API call is authorized by the platform against the caller's
own permissions, so forcing the admin view in the browser does not let a member read data their account cannot
access.

## Run it locally

1. Create an **external application** (non-confidential, user-mode) in UiPath Admin with redirect URI
   `http://localhost:5173` and scopes `PM.User.Read PM.Group PM.Directory`. The SDK requests `offline_access`
   (refresh tokens) automatically, so it does not need to be configured.
2. Copy `uipath.json.example` to `uipath.json` and fill in your `clientId`, `baseUrl`, `orgName` and
   `tenantName`.
3. Install and start:

   ```bash
   npm install
   npm run dev
   ```

4. Sign in once as a member of the Administrators group and once as a regular member to see both views.

## Deploying as a Coded App

```bash
npm run build
uip login --interactive
uip codedapp pack ./dist --name role-based-views-app --version <version>
uip codedapp publish --name role-based-views-app --version <version> --type Web
uip codedapp deploy --name role-based-views-app --folder-key <folderKey>
```

See the [Coded Apps CLI reference](https://uipath.github.io/uipath-typescript/coded-apps/cli-reference/) for
all options.
